import sys
import os
from flask import Blueprint, request, jsonify

sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../database'))
from review_repository import ReviewRepository

sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../services'))
from groq_service import generate_chatbot_response

sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
from product_resolver import ProductResolver

query_bp = Blueprint("query", __name__)
resolver = ProductResolver()

def get_product_ids():
    return [p["product_id"] for p in resolver.PRODUCTS_CONFIG]

def fetch_product_reviews(product_id):
    repo = ReviewRepository()
    return list(repo.collection.find({"product_id": product_id, "is_enriched": True}, {"_id": 0}).sort("scraped_at", -1))

@query_bp.route('', methods=['POST'])
def query_chatbot():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request. JSON body required."}), 400

    product_id = data.get("product_id")
    query = data.get("query")

    if not product_id or not query:
        return jsonify({"error": "product_id and query are required."}), 400

    query = query.strip()
    if not query:
        return jsonify({"error": "query cannot be empty."}), 400

    if product_id not in get_product_ids():
        return jsonify({"error": f"Unknown product_id: {product_id}"}), 404

    reviews = fetch_product_reviews(product_id)
    if not reviews:
        return jsonify({"error": "No reviews found for this product to analyze."}), 404

    total = len(reviews)
    total_score = sum(r.get('sentiment_score', 0.0) for r in reviews)
    avg_score = total_score / total if total > 0 else 0

    pos_reviews = [r for r in reviews if r.get('sentiment') == 'Positive']
    neg_reviews = [r for r in reviews if r.get('sentiment') == 'Negative']

    sample_reviews = []
    # Feed more context for better answers
    for r in pos_reviews[:20]:
        sample_reviews.append(f"Rating: {r.get('star_rating')} - {r.get('review_text')}")
    for r in neg_reviews[:20]:
        sample_reviews.append(f"Rating: {r.get('star_rating')} - {r.get('review_text')}")

    context_str = (
        f"Total Reviews: {total}\n"
        f"Average Sentiment Score: {avg_score:.2f} (-1 to 1)\n"
        f"Positive Reviews: {len(pos_reviews)}\n"
        f"Negative Reviews: {len(neg_reviews)}\n\n"
        f"Sample Real Reviews:\n" + "\n".join(sample_reviews)
    )

    result = generate_chatbot_response(context_str, query)
    
    if result.startswith("error:"):
        return jsonify({"error": result[6:].strip()}), 500

    return jsonify({"answer": result})
