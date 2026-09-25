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
                "model": product.model
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
            product.name
        )

        return jsonify({
            "success": True,
            "product": {
                "name": product.name,
                "brand": product.brand,
                "model": product.model
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