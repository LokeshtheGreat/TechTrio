from flask import Blueprint, request, jsonify

from product_resolver import ProductResolver
from product_discovery import ProductDiscovery


product_bp = Blueprint("product", __name__)

resolver = ProductResolver()
discovery = ProductDiscovery()


@product_bp.route("/resolve", methods=["POST"])
def resolve_product():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "error": "Request body is required."
        }), 400

    product_name = data.get("product_name")

    if not product_name:
        return jsonify({
            "success": False,
            "error": "product_name is required."
        }), 400

    try:
        product = resolver.resolve(product_name)

        return jsonify({
            "success": True,
            "product": {
                "name": product.name,
                "brand": product.brand,
                "model": product.model,
                "product_id": getattr(product, 'product_id', None),
                "amazon_url": getattr(product, 'amazon_url', None),
                "flipkart_url": getattr(product, 'flipkart_url', None)
            }
        })

    except ValueError as error:
        return jsonify({
            "success": False,
            "error": str(error)
        }), 400

    except Exception as error:
        return jsonify({
            "success": False,
            "error": "Unable to resolve product.",
            "details": str(error)
        }), 500


@product_bp.route("/search", methods=["POST"])
def search_product():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "error": "Request body is required."
        }), 400

    product_name = data.get("product_name")

    if not product_name:
        return jsonify({
            "success": False,
            "error": "product_name is required."
        }), 400

    try:
        # Resolve the product first
        product = resolver.resolve(product_name)

        # Search Amazon + Flipkart
        discovery_result = discovery.search(
            product
        )

        return jsonify({
            "success": True,
            "product": {
                "name": product.name,
                "brand": product.brand,
                "model": product.model,
                "product_id": getattr(product, 'product_id', None),
                "amazon_url": getattr(product, 'amazon_url', None),
                "flipkart_url": getattr(product, 'flipkart_url', None)
            },
            "marketplaces": discovery_result
        })

    except ValueError as error:
        return jsonify({
            "success": False,
            "error": str(error)
        }), 400

    except Exception as error:
        return jsonify({
            "success": False,
            "error": "Unable to search product.",
            "details": str(error)
        }), 500


@product_bp.route("/<product_id>/reviews", methods=["GET"])
def get_product_reviews(product_id):
    source = request.args.get("source")
    try:
        limit = int(request.args.get("limit", 100))
    except ValueError:
        limit = 100
        
    try:
        skip = int(request.args.get("skip", 0))
    except ValueError:
        skip = 0

    if source and source not in ["amazon", "flipkart"]:
        return jsonify({
            "error": "Invalid source parameter. Must be 'amazon' or 'flipkart'.",
            "product_id": product_id
        }), 400

    # Validate product_id exists
    product_config = next((p for p in resolver.PRODUCTS_CONFIG if p["product_id"] == product_id), None)
    if not product_config:
        return jsonify({
            "error": f"Unknown product_id: {product_id}",
            "product_id": product_id
        }), 404

    import sys
    import os
    sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../database'))
    from review_repository import ReviewRepository
    repo = ReviewRepository()

    try:
        reviews = repo.get_reviews(product_id, source_platform=source, limit=limit, skip=skip)
        total_count = repo.count_reviews(product_id, source_platform=source)
        
        return jsonify({
            "product_id": product_id,
            "product_name": f"{product_config['brand']} {product_config['model']}",
            "source": source,
            "count": len(reviews),
            "total": total_count,
            "skip": skip,
            "limit": limit,
            "reviews": reviews
        })
    except Exception as e:
        return jsonify({
            "error": "Failed to read reviews from database.",
            "details": str(e)
        }), 500


@product_bp.route("/scrape", methods=["POST"])
def scrape_product_reviews():
    from services.scrape_service import global_job_status
    with global_job_status.lock:
        if global_job_status.status == "running":
            return jsonify({
                "success": False,
                "error": "A background scraping job is currently running. Please try again later.",
                "job_id": global_job_status.job_id
            }), 409

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "error": "Request body is required."}), 400

    product_id = data.get("product_id")
    source = data.get("source")
    limit = data.get("limit", 100)
    pages = min(data.get("pages", 1), 10)

    if not product_id:
        return jsonify({"success": False, "error": "product_id is required."}), 400
        
    if source and source not in ["amazon", "flipkart"]:
        return jsonify({"success": False, "error": "Invalid source parameter."}), 400

    import sys
    import os
    sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../services'))
    from scrape_service import scrape_single
    
    try:
        scraped, upserted, stopping_reasons = scrape_single(product_id, source)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Scraping failed.",
            "details": str(e)
        }), 500

    return jsonify({
        "success": True,
        "product_id": product_id,
        "source": source,
        "reviews_scraped": scraped,
        "db_upserted": upserted,
        "stopping_reasons": stopping_reasons
    })