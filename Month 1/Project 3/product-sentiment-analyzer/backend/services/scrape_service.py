import os
import sys
import threading
import time
from datetime import datetime, timezone

sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../processing'))
from review_normalizer import normalize_reviews

sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../scrapers'))
from amazon_review_scraper import AmazonReviewScraper
from flipkart_review_scraper import FlipkartReviewScraper

sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../database'))
from review_repository import ReviewRepository

sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
from product_resolver import ProductResolver, Product

class JobStatus:
    def __init__(self):
        self.lock = threading.Lock()
        self.status = "idle"
        self.job_id = None
        self.trigger = None
        self.started_at = None
        self.completed_at = None
        self.total_tasks = 0
        self.completed_tasks = 0
        self.successful_tasks = 0
        self.failed_tasks = 0
        self.current_product = None
        self.current_source = None
        self.total_reviews_scraped = 0
        self.total_reviews_upserted = 0
        self.errors = []
        
    def to_dict(self):
        with self.lock:
            return {
                "status": self.status,
                "job_id": self.job_id,
                "trigger": self.trigger,
                "started_at": self.started_at,
                "completed_at": self.completed_at,
                "total_tasks": self.total_tasks,
                "completed_tasks": self.completed_tasks,
                "successful_tasks": self.successful_tasks,
                "failed_tasks": self.failed_tasks,
                "current_product": self.current_product,
                "current_source": self.current_source,
                "total_reviews_scraped": self.total_reviews_scraped,
                "total_reviews_upserted": self.total_reviews_upserted,
                "errors": self.errors
            }

global_job_status = JobStatus()
resolver = ProductResolver()

MAX_REVIEWS_PER_SOURCE = 200

def get_job_status():
    return global_job_status.to_dict()

def scrape_single(product_id, source):
    """Synchronously scrape a single product/source. Used by POST /api/products/scrape"""
    product_config = next((p for p in resolver.PRODUCTS_CONFIG if p["product_id"] == product_id), None)
    if not product_config:
        raise ValueError(f"Unknown product_id: {product_id}")

    canonical_product = Product(
        name=f"{product_config['brand']} {product_config['model']}",
        brand=product_config["brand"],
        model=product_config["model"],
        product_id=product_config["product_id"],
        amazon_url=product_config["amazon_url"],
        flipkart_url=product_config["flipkart_url"]
    )
    
    all_reviews = []
    stopping_reasons = {}
    
    if not source or source == "amazon":
        if canonical_product.amazon_url:
            scraper = None
            try:
                scraper = AmazonReviewScraper()
                raw = scraper.collect_reviews(canonical_product.amazon_url, max_reviews=MAX_REVIEWS_PER_SOURCE)
                stopping_reasons["amazon"] = raw.get("stopping_reason", "UNKNOWN")
                if "error" in raw:
                    print(f"[SCRAPER] Amazon Error: {raw['error']}")
                else:
                    normalized = normalize_reviews(canonical_product, raw.get("reviews", []), "amazon")
                    all_reviews.extend(normalized)
            except Exception as e:
                print(f"[SCRAPER] Amazon Scraping Failed: {e}")
                stopping_reasons["amazon"] = "ERROR"
            finally:
                if scraper:
                    scraper.close()

    if not source or source == "flipkart":
        if canonical_product.flipkart_url:
            scraper = None
            try:
                scraper = FlipkartReviewScraper()
                raw = scraper.collect_reviews(canonical_product.flipkart_url, max_reviews=MAX_REVIEWS_PER_SOURCE)
                stopping_reasons["flipkart"] = raw.get("stopping_reason", "UNKNOWN")
                if "error" in raw:
                    print(f"[SCRAPER] Flipkart Error: {raw['error']}")
                else:
                    normalized = normalize_reviews(canonical_product, raw.get("reviews", []), "flipkart")
                    all_reviews.extend(normalized)
            except Exception as e:
                print(f"[SCRAPER] Flipkart Scraping Failed: {e}")
                stopping_reasons["flipkart"] = "ERROR"
            finally:
                if scraper:
                    scraper.close()

    upserted_count = 0
    if all_reviews:
        try:
            repo = ReviewRepository()
            upserted_count = repo.upsert_reviews(all_reviews)
        except Exception as e:
            raise Exception(f"MongoDB Upsert Failed: {e}")

    return len(all_reviews), upserted_count, stopping_reasons

def run_batch_scrape(job_id, trigger):
    """Background thread function for full batch scrape"""
    print(f"[SCRAPER] Job started (ID: {job_id}, Trigger: {trigger})")
    
    with global_job_status.lock:
        global_job_status.status = "running"
        global_job_status.job_id = job_id
        global_job_status.trigger = trigger
        global_job_status.started_at = datetime.now(timezone.utc).isoformat()
        global_job_status.completed_at = None
        global_job_status.total_tasks = len(resolver.PRODUCTS_CONFIG) * 2
        global_job_status.completed_tasks = 0
        global_job_status.successful_tasks = 0
        global_job_status.failed_tasks = 0
        global_job_status.total_reviews_scraped = 0
        global_job_status.total_reviews_upserted = 0
        global_job_status.errors = []
        
    repo = None
    try:
        repo = ReviewRepository()
    except Exception as e:
        print(f"[SCRAPER] Fatal error: Could not connect to DB: {e}")
        with global_job_status.lock:
            global_job_status.status = "failed"
            global_job_status.errors.append({"error": "Failed to connect to MongoDB", "details": str(e)})
            global_job_status.completed_at = datetime.now(timezone.utc).isoformat()
        return

    task_index = 0
    for product_config in resolver.PRODUCTS_CONFIG:
        product_id = product_config["product_id"]
        product_name = product_config["model"]
        
        for source in ["amazon", "flipkart"]:
            task_index += 1
            print(f"[SCRAPER] Task {task_index}/{global_job_status.total_tasks}: {product_id} / {source}")
            
            with global_job_status.lock:
                global_job_status.current_product = product_name
                global_job_status.current_source = source
                
            try:
                scraped, upserted, reasons = scrape_single(product_id, source)
                print(f"[SCRAPER] Reviews scraped: {scraped}")
                print(f"[SCRAPER] Reviews upserted: {upserted}")
                print(f"[SCRAPER] Stopping reason: {reasons.get(source, 'UNKNOWN')}")
                
                with global_job_status.lock:
                    global_job_status.successful_tasks += 1
                    global_job_status.total_reviews_scraped += scraped
                    global_job_status.total_reviews_upserted += upserted
            except Exception as e:
                print(f"[SCRAPER] Task failed for {product_id} / {source}: {e}")
                with global_job_status.lock:
                    global_job_status.failed_tasks += 1
                    global_job_status.errors.append({
                        "product_id": product_id,
                        "source": source,
                        "error": str(e)
                    })
                    
            with global_job_status.lock:
                global_job_status.completed_tasks += 1

    print("[SCRAPER] Job completed")
    with global_job_status.lock:
        global_job_status.status = "completed"
        global_job_status.completed_at = datetime.now(timezone.utc).isoformat()
        global_job_status.current_product = None
        global_job_status.current_source = None

def trigger_batch_scrape(trigger="manual"):
    import uuid
    with global_job_status.lock:
        if global_job_status.status == "running":
            return False, global_job_status.job_id
            
    job_id = str(uuid.uuid4())
    t = threading.Thread(target=run_batch_scrape, args=(job_id, trigger), daemon=True)
    t.start()
    return True, job_id
