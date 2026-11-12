from pymongo import UpdateOne
from database.connection import get_database

class ReviewRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.reviews
        self.ensure_indexes()
        
    def ensure_indexes(self):
        """
        Create necessary indexes if they do not exist.
        """
        # Unique index for deduplication
        self.collection.create_index("review_key", unique=True)
        # Helpful indexes for querying
        self.collection.create_index("product_id")
        self.collection.create_index("source_platform")
        self.collection.create_index("scraped_at")
        
    def upsert_reviews(self, reviews):
        """
        Bulk upserts a list of normalized reviews based on review_key.
        """
        if not reviews:
            return 0
            
        operations = []
        for r in reviews:
            # We don't overwrite created_at if it exists, but we update everything else
            update_doc = {
                "$set": r,
                "$setOnInsert": {"created_at": r.get("scraped_at")}
            }
            operations.append(
                UpdateOne({"review_key": r["review_key"]}, update_doc, upsert=True)
            )
            
        try:
            result = self.collection.bulk_write(operations, ordered=False)
            return result.upserted_count
        except Exception as e:
            # Ignore duplicate key errors in unordered bulk write if they somehow occur
            print(f"Error during bulk upsert: {e}")
            raise e

    def get_reviews(self, product_id, source_platform=None, limit=100, skip=0):
        """
        Retrieve reviews for a product.
        """
        query = {"product_id": product_id}
        if source_platform:
            query["source_platform"] = source_platform
            
        cursor = self.collection.find(query, {"_id": 0}).sort("scraped_at", -1).skip(skip).limit(limit)
        return list(cursor)
        
    def count_reviews(self, product_id, source_platform=None):
        """
        Count reviews for a product.
        """
        query = {"product_id": product_id}
        if source_platform:
            query["source_platform"] = source_platform
            
        return self.collection.count_documents(query)
