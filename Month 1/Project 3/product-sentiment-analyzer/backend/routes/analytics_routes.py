from flask import Blueprint, jsonify, request
import sys
import os
from collections import defaultdict
from datetime import datetime

sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../database'))
from review_repository import ReviewRepository

sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
from product_resolver import ProductResolver

analytics_bp = Blueprint("analytics", __name__)
resolver = ProductResolver()

def get_product_ids():
    return [p["product_id"] for p in resolver.PRODUCTS_CONFIG]

def fetch_product_reviews(product_id):
    repo = ReviewRepository()
    # Sort by scraped_at descending to ensure we get the LATEST reviews for analytics
    return list(repo.collection.find({"product_id": product_id, "is_enriched": True}, {"_id": 0}).sort("scraped_at", -1))

def safe_pct(part, whole):
    return round((part / whole) * 100, 1) if whole > 0 else 0.0

def safe_div(part, whole):
    return round(part / whole, 3) if whole > 0 else 0.0

@analytics_bp.route("/<product_id>", methods=["GET"])
def get_product_overview(product_id):
    if product_id not in get_product_ids():
        return jsonify({"error": f"Unknown product_id: {product_id}"}), 404

    reviews = fetch_product_reviews(product_id)
    total = len(reviews)
    if total == 0:
        return jsonify({"product_id": product_id, "total_reviews": 0})

    sentiment_dist = {"Positive": 0, "Neutral": 0, "Negative": 0}
    source_counts = {"amazon": 0, "flipkart": 0}
    total_score = 0.0
    total_stars = 0.0

    for r in reviews:
        sentiment_dist[r.get("sentiment", "Neutral")] += 1
        source_counts[r.get("source_platform", "unknown")] = source_counts.get(r.get("source_platform", "unknown"), 0) + 1
        total_score += r.get("sentiment_score", 0.0)
        total_stars += float(r.get("star_rating", 0.0))

    return jsonify({
        "product_id": product_id,
        "total_reviews": total,
        "average_rating": safe_div(total_stars, total),
        "sentiment_distribution": {
            "counts": sentiment_dist,
            "percentages": {
                "Positive": safe_pct(sentiment_dist["Positive"], total),
                "Neutral": safe_pct(sentiment_dist["Neutral"], total),
                "Negative": safe_pct(sentiment_dist["Negative"], total)
            }
        },
        "average_sentiment_score": safe_div(total_score, total),
        "source_counts": source_counts
    })

@analytics_bp.route("/<product_id>/sources", methods=["GET"])
def get_sources_comparison(product_id):
    if product_id not in get_product_ids():
        return jsonify({"error": f"Unknown product_id: {product_id}"}), 404

    reviews = fetch_product_reviews(product_id)
    sources = {"amazon": {"count": 0, "total_rating": 0.0, "total_score": 0.0, "sentiment": {"Positive": 0, "Neutral": 0, "Negative": 0}},
               "flipkart": {"count": 0, "total_rating": 0.0, "total_score": 0.0, "sentiment": {"Positive": 0, "Neutral": 0, "Negative": 0}}}

    for r in reviews:
        src = r.get("source_platform")
        if src in sources:
            sources[src]["count"] += 1
            sources[src]["total_rating"] += float(r.get("star_rating", 0.0))
            sources[src]["total_score"] += r.get("sentiment_score", 0.0)
            sources[src]["sentiment"][r.get("sentiment", "Neutral")] += 1

    for src, data in sources.items():
        c = data["count"]
        data["average_rating"] = safe_div(data["total_rating"], c)
        data["average_sentiment_score"] = safe_div(data["total_score"], c)
        del data["total_rating"]
        del data["total_score"]

    return jsonify({"product_id": product_id, "sources": sources})

@analytics_bp.route("/<product_id>/aspects", methods=["GET"])
def get_aspects_analytics(product_id):
    if product_id not in get_product_ids():
        return jsonify({"error": f"Unknown product_id: {product_id}"}), 404

    reviews = fetch_product_reviews(product_id)
    target_aspects = ["battery", "camera", "performance", "display", "value", "software"]
    aspect_stats = {a: {"mentions": 0, "Positive": 0, "Neutral": 0, "Negative": 0} for a in target_aspects}

    for r in reviews:
        rev_aspects = r.get("aspects", {})
        # Note: keys in aspects might be capitalized or differ slightly, let's lower() them
        for k, v in rev_aspects.items():
            k_lower = k.lower()
            if k_lower in aspect_stats:
                aspect_stats[k_lower]["mentions"] += 1
                aspect_stats[k_lower][v.get("label", "Neutral")] += 1

    for k, data in aspect_stats.items():
        m = data["mentions"]
        data["positive_percentage"] = safe_pct(data["Positive"], m)
        data["negative_percentage"] = safe_pct(data["Negative"], m)

    return jsonify({"product_id": product_id, "aspects": aspect_stats})

@analytics_bp.route("/<product_id>/trends", methods=["GET"])
def get_trends_analytics(product_id):
    if product_id not in get_product_ids():
        return jsonify({"error": f"Unknown product_id: {product_id}"}), 404

    reviews = fetch_product_reviews(product_id)
    trends = defaultdict(lambda: {"volume": 0, "total_score": 0.0})
    
    for r in reviews:
        # We will use scraped_at for trends as review_date is unstructured string
        date_str = r.get("scraped_at", "")[:10]
        if date_str:
            trends[date_str]["volume"] += 1
            trends[date_str]["total_score"] += r.get("sentiment_score", 0.0)

    trend_list = []
    for d in sorted(trends.keys()):
        trend_list.append({
            "date": d,
            "volume": trends[d]["volume"],
            "average_sentiment_score": safe_div(trends[d]["total_score"], trends[d]["volume"])
        })

    return jsonify({"product_id": product_id, "trends": trend_list})

@analytics_bp.route("/<product_id>/keywords", methods=["GET"])
def get_keywords_analytics(product_id):
    if product_id not in get_product_ids():
        return jsonify({"error": f"Unknown product_id: {product_id}"}), 404

    reviews = fetch_product_reviews(product_id)
    pos_kw = defaultdict(int)
    neg_kw = defaultdict(int)
    overall_kw = defaultdict(int)

    for r in reviews:
        sentiment = r.get("sentiment", "Neutral")
        keywords = r.get("keywords", [])
        for kw in keywords:
            word = kw.get("word")
            count = kw.get("count", 1)
            
            # Filter generic words
            generic_words = {"super", "best", "awesome", "excellent", "amazing", "nice", "better", "perfect", "fabulous", "terrific", "great", "good", "love", "lovely", "buy", "money", "value", "phone", "mobile", "smartphone"}
            if word and word.lower() not in generic_words:
                overall_kw[word] += count
                if sentiment == "Positive":
                    pos_kw[word] += count
                elif sentiment == "Negative":
                    neg_kw[word] += count

    def get_top(d, n=20):
        return [{"word": k, "count": v} for k, v in sorted(d.items(), key=lambda x: x[1], reverse=True)[:n]]

    return jsonify({
        "product_id": product_id,
        "positive_keywords": get_top(pos_kw),
        "negative_keywords": get_top(neg_kw),
        "overall_keywords": get_top(overall_kw)
    })

@analytics_bp.route("/comparison", methods=["GET"])
def get_comparison_analytics():
    repo = ReviewRepository()
    all_reviews = list(repo.collection.find({"is_enriched": True}, {"_id": 0}))
    
    comparison = []
    for config in resolver.PRODUCTS_CONFIG:
        pid = config["product_id"]
        prod_reviews = [r for r in all_reviews if r.get("product_id") == pid]
        
        total = len(prod_reviews)
        if total == 0:
            continue
            
        total_rating = 0.0
        total_score = 0.0
        sent_dist = {"Positive": 0, "Neutral": 0, "Negative": 0}
        
        target_aspects = ["battery", "camera", "performance", "display", "value", "software"]
        aspect_stats = {a: {"Positive": 0, "Negative": 0, "Neutral": 0, "mentions": 0} for a in target_aspects}

        for r in prod_reviews:
            total_rating += float(r.get("star_rating", 0.0))
            total_score += r.get("sentiment_score", 0.0)
            sent_dist[r.get("sentiment", "Neutral")] += 1
            
            for k, v in r.get("aspects", {}).items():
                k_lower = k.lower()
                if k_lower in aspect_stats:
                    aspect_stats[k_lower]["mentions"] += 1
                    aspect_stats[k_lower][v.get("label", "Neutral")] += 1

        aspect_sentiments = {}
        for k, data in aspect_stats.items():
            if data["mentions"] > 0:
                aspect_sentiments[k] = safe_pct(data["Positive"], data["mentions"])
            else:
                aspect_sentiments[k] = None

        comparison.append({
            "product_id": pid,
            "product_name": config["model"],
            "total_reviews": total,
            "average_rating": safe_div(total_rating, total),
            "average_sentiment_score": safe_div(total_score, total),
            "sentiment_distribution": sent_dist,
            "aspect_positive_percentages": aspect_sentiments
        })

    return jsonify({"comparison": comparison})

import sys
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../services'))
from groq_service import generate_business_insight, generate_consumer_insight

@analytics_bp.route('/<product_id>/business-insight', methods=['GET'])
def get_business_insight(product_id):
    if product_id not in get_product_ids():
        return jsonify({'error': f'Unknown product_id: {product_id}'}), 404

    reviews = fetch_product_reviews(product_id)
    if not reviews:
        return jsonify({'error': 'No reviews found for this product.'}), 404

    total = len(reviews)
    total_score = sum(r.get('sentiment_score', 0.0) for r in reviews)
    avg_score = total_score / total if total > 0 else 0

    pos_reviews = [r for r in reviews if r.get('sentiment') == 'Positive']
    neg_reviews = [r for r in reviews if r.get('sentiment') == 'Negative']

    sample_reviews = []
    for r in pos_reviews[:15]:
        sample_reviews.append(f"Rating: {r.get('star_rating')} - {r.get('review_text')}")
    for r in neg_reviews[:15]:
        sample_reviews.append(f"Rating: {r.get('star_rating')} - {r.get('review_text')}")

    context_str = f'Total Reviews: {total}\\nAverage Sentiment Score: {avg_score:.2f}\\n'
    context_str += 'Sample Reviews:\\n' + '\\n'.join(sample_reviews)

    system_prompt = ('You are an expert product analyst providing business intelligence. '
                     'Analyze the provided product review context and extract the key positive themes, '
                     'negative themes, recurring issues, and areas requiring attention.')

    result = generate_business_insight(system_prompt, context_str, f'Analyze feedback for product ID: {product_id}')

    if 'error' in result:
        return jsonify(result), 500

    return jsonify(result)


@analytics_bp.route('/<product_id>/consumer-insight', methods=['GET'])
def get_consumer_insight(product_id):
    if product_id not in get_product_ids():
        return jsonify({'error': f'Unknown product_id: {product_id}'}), 404

    reviews = fetch_product_reviews(product_id)
    if not reviews:
        return jsonify({'error': 'No reviews found for this product.'}), 404

    total = len(reviews)
    total_score = sum(r.get('sentiment_score', 0.0) for r in reviews)
    avg_score = total_score / total if total > 0 else 0

    pos_reviews = [r for r in reviews if r.get('sentiment') == 'Positive']
    neg_reviews = [r for r in reviews if r.get('sentiment') == 'Negative']

    sample_reviews = []
    for r in pos_reviews[:15]:
        sample_reviews.append(f"Rating: {r.get('star_rating')} - {r.get('review_text')}")
    for r in neg_reviews[:15]:
        sample_reviews.append(f"Rating: {r.get('star_rating')} - {r.get('review_text')}")

    context_str = f'Total Reviews: {total}\nAverage Sentiment Score: {avg_score:.2f}\n'
    context_str += 'Sample Reviews:\n' + '\n'.join(sample_reviews)

    system_prompt = ('You are an objective consumer advice assistant summarizing product feedback for potential buyers.')

    result = generate_consumer_insight(system_prompt, context_str, f'Summarize feedback for product ID: {product_id}')

    if 'error' in result:
        return jsonify(result), 500

    return jsonify(result)
