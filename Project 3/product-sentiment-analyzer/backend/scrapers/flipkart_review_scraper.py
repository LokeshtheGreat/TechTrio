import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import re


class FlipkartReviewScraper:

    def __init__(self):
        options = uc.ChromeOptions()

        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")

        self.driver = uc.Chrome(options=options)

    def open_review_page(self, product_url):
        """
        Open the product page, open Ratings & Reviews,
        and click an actual product-review link.
        """

        self.driver.get(product_url)

        time.sleep(5)

        # Find Ratings & Reviews link
        ratings_link = WebDriverWait(
            self.driver,
            20
        ).until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//a[contains("
                    "@href, "
                    "'ratings-reviews-details-page'"
                    ")]"
                )
            )
        )

        self.driver.execute_script(
            "arguments[0].scrollIntoView({block:'center'});",
            ratings_link
        )

        time.sleep(1)

        # Open dynamic review section
        self.driver.execute_script(
            "arguments[0].click();",
            ratings_link
        )

        # Wait for actual product-review links
        WebDriverWait(
            self.driver,
            20
        ).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    "a[href*='/product-reviews/']"
                )
            )
        )

        time.sleep(2)

        review_links = self.driver.find_elements(
            By.CSS_SELECTOR,
            "a[href*='/product-reviews/']"
        )

        if not review_links:
            raise RuntimeError(
                "No Flipkart product-review links found."
            )

        # Click the first real review link
        self.driver.execute_script(
            "arguments[0].click();",
            review_links[0]
        )

        # Wait for review page
        WebDriverWait(
            self.driver,
            20
        ).until(
            lambda driver:
            "/product-reviews/" in driver.current_url
        )

        time.sleep(5)

    def find_review_blocks(self):
        # We will use BeautifulSoup to parse the page source
        # instead of fragile Selenium DOM traversal.
        pass # implemented in collect_reviews

    def extract_review(self, texts):
        """
        Extract one Flipkart review from a list of texts.
        """
        review = {
            "review_id": None,
            "rating": None,
            "title": None,
            "text": None,
            "reviewer": None,
            "location": None,
            "date": None,
            "verified_purchase": False,
            "helpful_count": 0
        }

        if not texts:
            return review

        try:
            # Rating is usually the first element, e.g. "5.0" or "4"
            if texts[0].replace(".", "").isdigit():
                review["rating"] = float(texts[0])
            
            # Title is usually index 2 (after bullet)
            if len(texts) > 2 and texts[1] in ["\u2022", "•"]:
                review["title"] = texts[2]
            
            # Date is usually the last element, e.g. "\u00b7 3 months ago"
            date_text = texts[-1]
            review["date"] = date_text.replace("\u00b7", "").strip()

            # Check for Verified Purchase
            if len(texts) >= 2:
                if texts[-2] in ["Verified Purchase", "Certified Buyer"]:
                    review["verified_purchase"] = True

            # Find Reviewer Name
            # It usually precedes location (", Bengaluru") or "Helpful for"
            helpful_idx = -1
            for i, t in enumerate(texts):
                if t == "Helpful for":
                    helpful_idx = i
                    break
                    
            if helpful_idx != -1:
                # Upvotes is helpful_idx + 1
                if helpful_idx + 1 < len(texts):
                    h_text = texts[helpful_idx + 1]
                    if h_text.endswith('K'):
                        review["helpful_count"] = int(float(h_text[:-1]) * 1000)
                    elif h_text.isdigit():
                        review["helpful_count"] = int(h_text)

                # Name is before "Helpful for", might be before location
                name_idx = helpful_idx - 1
                if texts[name_idx].startswith(", "):
                    review["location"] = texts[name_idx][2:].strip()
                    name_idx -= 1
                review["reviewer"] = texts[name_idx]
                
                # Text is from index 4 up to name_idx (ignoring "more")
                text_parts = texts[4:name_idx]
                text_parts = [p for p in text_parts if p != "more" and not p.startswith("Review for:")]
                review["text"] = " ".join(text_parts).strip()
            else:
                # Fallback if "Helpful for" is missing
                # Just take index 4 as text
                if len(texts) > 4:
                    review["text"] = texts[4]

        except Exception as e:
            print("Error parsing review texts:", e)

        return review

    def collect_reviews(
        self,
        product_url,
        max_reviews=200
    ):
        """
        Collect Flipkart review previews.
        """

        stopping_reason = "UNKNOWN"
        try:
            print(f"Opening Flipkart review page (Target max reviews: {max_reviews})...")
            
            # Use direct URL mapping for product reviews
            if "/p/" in product_url:
                base_review_url = product_url.replace("/p/", "/product-reviews/")
            else:
                base_review_url = product_url
                
            self.driver.get(base_review_url)
            print("Review page opened:", self.driver.current_url)

            reviews = []
            seen_hashes = set()
            
            current_page = 0
            max_pages = 50 # safety limit

            while True:
                current_page += 1
                if current_page > max_pages:
                    stopping_reason = "MAX_ITERATIONS_REACHED"
                    break
                    
                # Navigate to specific page
                if current_page > 1:
                    page_url = f"{base_review_url}?page={current_page}" if "?" not in base_review_url else f"{base_review_url}&page={current_page}"
                    self.driver.get(page_url)
                    print("Navigated to page:", current_page)
                    
                import time
                time.sleep(4)
                
                # Use BeautifulSoup to parse the React Native Web DOM
                html = self.driver.page_source
                from bs4 import BeautifulSoup
                import re
                soup = BeautifulSoup(html, 'html.parser')
                
                # Find elements containing 'ago'
                ago_nodes = soup.find_all(string=re.compile(r'\bago\b', re.IGNORECASE))
                blocks = []
                seen_blocks = set()

                for node in ago_nodes:
                    parent = node.parent
                    # Traverse up to find the review container
                    for _ in range(8):
                        if parent and parent.parent:
                            parent = parent.parent
                    
                    if parent and id(parent) not in seen_blocks:
                        blocks.append(parent)
                        seen_blocks.add(id(parent))

                print(f"Review blocks found on page {current_page}:", len(blocks))
                
                if len(blocks) == 0:
                    print("No reviews found on page, stopping pagination.")
                    stopping_reason = "SOURCE_EXHAUSTED"
                    break

                new_reviews_on_page = 0
                for block in blocks:
                    texts = [text.strip() for text in block.stripped_strings if text.strip()]
                    if len(texts) > 50: 
                        continue # Probably the root container
                        
                    review = self.extract_review(texts)

                    if not review.get("text"):
                        continue
                        
                    # Basic identity check to prevent cross-page duplicates
                    import hashlib
                    review_hash = hashlib.md5(f"{review.get('reviewer', '')}_{review.get('text', '')[:50]}".encode('utf-8')).hexdigest()
                    
                    if review_hash not in seen_hashes:
                        seen_hashes.add(review_hash)
                        reviews.append(review)
                        new_reviews_on_page += 1

                    if len(reviews) >= max_reviews:
                        break

                if new_reviews_on_page == 0:
                    print("No new reviews on page, likely reached the end.")
                    stopping_reason = "NO_NEW_REVIEWS"
                    break
                    
                if len(reviews) >= max_reviews:
                    stopping_reason = "TARGET_REACHED"
                    break

            return {
                "platform": "Flipkart",
                "product_url": product_url,
                "reviews_count": len(reviews),
                "reviews": reviews,
                "stopping_reason": stopping_reason
            }

        except Exception as error:

            return {
                "platform": "Flipkart",
                "product_url": product_url,
                "reviews_count": 0,
                "reviews": [],
                "stopping_reason": "ERROR",
                "error": str(error)
            }

    def close(self):
        """
        Close Selenium browser.
        """
        try:
            self.driver.quit()
        except Exception:
            pass

if __name__ == "__main__":
    scraper = FlipkartReviewScraper()
    try:
        product_url = "https://www.flipkart.com/apple-iphone-17-black-256-gb/p/itm6eb39da622cdd"
        result = scraper.collect_reviews(product_url, max_reviews=20)
        print("\nFlipkart Review Result:")
        import json
        print(json.dumps(result, indent=2))
    finally:
        scraper.close()