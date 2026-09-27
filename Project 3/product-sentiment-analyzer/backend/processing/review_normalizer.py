import datetime
import hashlib
import re

def generate_review_key(source_platform, product_id, raw, review_id):
    if review_id:
        hash_str = f"{source_platform}|{product_id}|{review_id}"
    else:
        # Fallback fingerprint
        def normalize_str(s):
            if not s: return ""
            return re.sub(r'\s+', ' ', str(s)).strip().lower()
            
        parts = [
            source_platform,
            product_id,
            normalize_str(raw.get("reviewer")),
            normalize_str(raw.get("date")),
            str(float(raw.get("rating") or 0.0)),
            normalize_str(raw.get("title")),
            normalize_str(raw.get("text"))
        ]
        hash_str = "|".join(parts)
        
    return hashlib.sha256(hash_str.encode('utf-8')).hexdigest()

def normalize_reviews(product, raw_reviews, source_platform):
    """
    Normalize raw reviews from Amazon or Flipkart into a common schema.
    """
    normalized = []
    product_id = getattr(product, 'product_id', None)
    
    for raw in raw_reviews:
        review_id = raw.get("review_id")
        
        review_key = generate_review_key(source_platform, product_id, raw, review_id)

        # If review_id is None, generate a deterministic fallback hash
        if not review_id:
            hash_str = f"{source_platform}_{product_id}_{raw.get('reviewer', '')}_{raw.get('date', '')}"
            review_id = hashlib.md5(hash_str.encode('utf-8')).hexdigest()

        # Flipkart verified_purchase is a boolean. Amazon currently doesn't extract it.
        verified = raw.get("verified_purchase")
        if verified is None:
            verified = None
        else:
            verified = bool(verified)

        norm_review = {
            "review_key": review_key,
            "product_id": product_id,
            "product_name": getattr(product, "name", None),
            "brand": getattr(product, "brand", None),
            "source_platform": source_platform,
            "review_id": review_id,
            "review_title": raw.get("title"),
            "review_text": raw.get("text"),
            "star_rating": float(raw.get("rating")) if raw.get("rating") is not None else 0.0,
            "review_date": raw.get("date"),
            "reviewer_name": raw.get("reviewer"),
            "verified_purchase": verified,
            "helpful_count": raw.get("helpful_count") or 0,
            "product_url": getattr(product, f"{source_platform}_url", None),
            "scraped_at": datetime.datetime.utcnow().isoformat() + "Z"
        }
        
        try:
            from sentiment_analyzer import enrich_review
            norm_review = enrich_review(norm_review)
        except Exception as e:
            print(f"Error enriching review {review_key}: {e}")
            norm_review['is_enriched'] = False
            
        normalized.append(norm_review)
    return normalized
