import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
from database.connection import get_database
from database.review_repository import ReviewRepository
from processing.sentiment_analyzer import enrich_review

def process_historical_reviews():
    repo = ReviewRepository()
    db = get_database()
    collection = db["reviews"]
    
    # Find reviews that aren't enriched yet
    query = {"is_enriched": {"$ne": True}}
    unprocessed = list(collection.find(query))
    
    print(f"Found {len(unprocessed)} historical reviews to enrich.")
    
    if not unprocessed:
        return

    updated_count = 0
    for doc in unprocessed:
        enriched_doc = enrich_review(doc)
        
        # We need to drop _id before updating if we replace, or just update the specific fields
        _id = doc['_id']
        update_fields = {
            "sentiment": enriched_doc.get("sentiment"),
            "sentiment_score": enriched_doc.get("sentiment_score"),
            "aspects": enriched_doc.get("aspects"),
            "keywords": enriched_doc.get("keywords"),
            "is_enriched": True
        }
        
        collection.update_one({"_id": _id}, {"$set": update_fields})
        updated_count += 1
        
    print(f"Successfully enriched {updated_count} reviews in MongoDB.")

if __name__ == "__main__":
    process_historical_reviews()
