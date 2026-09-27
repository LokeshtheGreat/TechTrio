import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class AmazonReviewScraper:

    def __init__(self):
        options = uc.ChromeOptions()

        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")

        self.driver = uc.Chrome(options=options)

    def extract_review(self, review_element):
        """
        Extract one Amazon review.
        """

        review = {
            "review_id": None,
            "rating": None,
            "title": None,
            "text": None,
            "reviewer": None,
            "date": None
        }

        # Review ID
        try:
            review["review_id"] = review_element.get_attribute("id")
        except Exception:
            pass

        # Rating
        try:
            rating_element = review_element.find_element(
                By.CSS_SELECTOR,
                "i[data-hook='review-star-rating'] span.a-icon-alt"
            )

            # Selenium .text may return empty because this
            # accessibility element is visually hidden.
            rating_text = rating_element.get_attribute(
                "textContent"
            ).strip()

            # Example:
            # "5 out of 5 stars"
            rating = rating_text.split(" ")[0]

            review["rating"] = float(rating)

        except Exception:
            pass

        # Review title
        try:
            title_element = review_element.find_element(
                By.CSS_SELECTOR,
                "[data-hook='reviewTitle']"
            )

            review["title"] = title_element.text.strip()

        except Exception:
            pass

        # Review text
        try:
            text_element = review_element.find_element(
                By.CSS_SELECTOR,
                "[data-hook='reviewText']"
            )

            review_text = text_element.text.strip()

            # Sometimes the outer container includes accessibility
            # text instead of the actual review. Prefer the rich content.
            try:
                rich_text_element = review_element.find_element(
                    By.CSS_SELECTOR,
                    "[data-hook='reviewRichContentContainer']"
                )

                rich_text = rich_text_element.text.strip()

                if rich_text:
                    review_text = rich_text

            except Exception:
                pass

            review["text"] = review_text

        except Exception:
            pass

        # Reviewer
        try:
            reviewer_element = review_element.find_element(
                By.CSS_SELECTOR,
                "span.a-profile-name"
            )

            review["reviewer"] = reviewer_element.text.strip()

        except Exception:
            pass

        # Date
        try:
            date_element = review_element.find_element(
                By.CSS_SELECTOR,
                "[data-hook='review-date']"
            )

            review["date"] = date_element.text.strip()

        except Exception:
            pass

        return review

    def collect_reviews(self, product_url, max_reviews=200):
        """
        Collect reviews from an Amazon product page using dynamic loading.
        """
        print(f"Opening Amazon review page (Target max reviews: {max_reviews})...")
        import time
        import hashlib

        stopping_reason = "UNKNOWN"
        try:
            self.driver.get(product_url)

            wait = WebDriverWait(self.driver, 15)

            try:
                wait.until(
                    EC.presence_of_element_located(
                        (
                            By.CSS_SELECTOR,
                            "div[data-hook='review']"
                        )
                    )
                )
            except Exception:
                stopping_reason = "BLOCKED"
                return {
                    "platform": "Amazon",
                    "product_url": product_url,
                    "reviews_count": 0,
                    "reviews": [],
                    "stopping_reason": stopping_reason,
                    "error": "Timeout waiting for initial reviews. Sign-in wall or blocked."
                }

            reviews = []
            seen_hashes = set()
            iteration = 0
            max_iterations = 50 # safety limit
            
            while True:
                iteration += 1
                if iteration > max_iterations:
                    stopping_reason = "MAX_ITERATIONS_REACHED"
                    break
                    
                review_elements = self.driver.find_elements(
                    By.CSS_SELECTOR,
                    "div[data-hook='review']"
                )

                new_reviews_on_page = 0
                for review_element in review_elements:
                    review = self.extract_review(review_element)

                    # Only keep reviews with actual review text.
                    if review["text"]:
                        # Duplicate check
                        review_hash = hashlib.md5(f"{review.get('review_id', '')}_{review.get('text', '')[:50]}".encode('utf-8')).hexdigest()
                        if review_hash not in seen_hashes:
                            seen_hashes.add(review_hash)
                            reviews.append(review)
                            new_reviews_on_page += 1

                print(f"Amazon Iteration {iteration}: Found {len(review_elements)} elements in DOM, {new_reviews_on_page} new reviews extracted.")
                        
                if len(reviews) >= max_reviews:
                    print("Reached max_reviews limit. Stopping.")
                    stopping_reason = "TARGET_REACHED"
                    break
                    
                # Dynamic load interaction
                try:
                    current_count = len(self.driver.find_elements(By.CSS_SELECTOR, "div[data-hook='review']"))
                    
                    # Robust selector fallback strategy
                    selectors = [
                        "span[data-hook='cr-split-stream-load-more'] button",
                        "a[data-hook='cr-split-stream-load-more']",
                        "div[data-hook='cr-split-stream-load-more'] button",
                        "button.a-button-text",
                        "li.a-last a" # If it falls back to standard pagination
                    ]
                    
                    clicked = False
                    
                    for selector in selectors:
                        elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        for el in elements:
                            if el.is_displayed() and el.is_enabled():
                                text = el.text.lower()
                                if 'load' in text or 'more' in text or 'see' in text or 'next' in text or not text:
                                    # Scroll to element to prevent click interception
                                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)
                                    time.sleep(1) # Brief pause after scrolling
                                    
                                    el.click()
                                    clicked = True
                                    print(f"Clicked dynamic load control via selector: {selector}")
                                    break
                        if clicked:
                            break
                            
                    if clicked:
                        # Explicit wait for DOM to expand
                        try:
                            WebDriverWait(self.driver, 10).until(
                                lambda d: len(d.find_elements(By.CSS_SELECTOR, "div[data-hook='review']")) > current_count
                            )
                            # Additional stabilization wait
                            time.sleep(2)
                        except Exception:
                            # It's possible the click triggered a full page reload if it fell back to pagination
                            try:
                                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div[data-hook='review']")))
                                time.sleep(2)
                            except Exception:
                                print("Timeout waiting for reviews after click.")
                                stopping_reason = "BLOCKED"
                                break
                    else:
                        print("No clickable 'Load More' or 'Next' control found. Reached end of dynamic reviews.")
                        stopping_reason = "SOURCE_EXHAUSTED"
                        break

                except Exception as e:
                    print("Failed interacting with dynamic load control:", e)
                    stopping_reason = "ERROR"
                    break

            return {
                "platform": "Amazon",
                "product_url": product_url,
                "reviews_count": len(reviews),
                "reviews": reviews,
                "stopping_reason": stopping_reason
            }

        except Exception as error:

            return {
                "platform": "Amazon",
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