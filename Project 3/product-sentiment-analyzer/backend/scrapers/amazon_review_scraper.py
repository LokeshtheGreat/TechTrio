from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class AmazonReviewScraper:

    def __init__(self):
        options = Options()

        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")

        self.driver = webdriver.Chrome(options=options)

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

    def collect_reviews(self, product_url, max_reviews=10):
        """
        Collect reviews from an Amazon product page.
        """

        try:
            self.driver.get(product_url)

            wait = WebDriverWait(self.driver, 15)

            wait.until(
                EC.presence_of_element_located(
                    (
                        By.CSS_SELECTOR,
                        "div[data-hook='review']"
                    )
                )
            )

            review_elements = self.driver.find_elements(
                By.CSS_SELECTOR,
                "div[data-hook='review']"
            )

            reviews = []

            for review_element in review_elements:

                review = self.extract_review(
                    review_element
                )

                # Only keep reviews with actual review text.
                if review["text"]:

                    reviews.append(review)

                if len(reviews) >= max_reviews:
                    break

            return {
                "platform": "Amazon",
                "product_url": product_url,
                "reviews_count": len(reviews),
                "reviews": reviews
            }

        except Exception as error:

            return {
                "platform": "Amazon",
                "product_url": product_url,
                "reviews_count": 0,
                "reviews": [],
                "error": str(error)
            }

    def close(self):
        """
        Close Selenium browser.
        """

        self.driver.quit()


if __name__ == "__main__":

    scraper = AmazonReviewScraper()

    try:

        product_url = (
            "https://www.amazon.in/dp/B0CS69QQTG"
        )

        result = scraper.collect_reviews(
            product_url,
            max_reviews=10
        )

        print("\nAmazon Review Result:")
        print(result)

    finally:

        scraper.close()