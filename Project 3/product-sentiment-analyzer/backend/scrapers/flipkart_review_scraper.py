from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import re


class FlipkartReviewScraper:

    def __init__(self):
        options = Options()

        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")

        self.driver = webdriver.Chrome(options=options)

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
        """
        Find the actual review containers.

        Flipkart's current review page places
        'Certified Buyer' several levels inside
        the complete review container.

        Level 4 currently contains:
            Review title
            Reviewer
            Location
            Certified Buyer
            Date
        """

        buyers = self.driver.find_elements(
            By.XPATH,
            "//*[normalize-space()='Certified Buyer']"
        )

        blocks = []
        seen = set()

        for buyer in buyers:

            try:

                # Current Flipkart structure:
                #
                # Certified Buyer
                #       ↑
                # Level 1
                # Level 2
                # Level 3
                # Level 4 = complete review block
                block = buyer.find_element(
                    By.XPATH,
                    "./../../../../"
                )

                text = block.text.strip()

                if not text:
                    continue

                # Avoid duplicate containers
                if text in seen:
                    continue

                seen.add(text)

                blocks.append(block)

            except Exception:
                continue

        return blocks

    def extract_review(self, block):
        """
        Extract one Flipkart review.
        """

        review = {
            "review_id": None,
            "rating": None,
            "title": None,
            "text": None,
            "reviewer": None,
            "location": None,
            "date": None,
            "verified_purchase": False
        }

        lines = [
            line.strip()
            for line in block.text.splitlines()
            if line.strip()
        ]

        if not lines:
            return review

        # --------------------------------------------------
        # Rating
        # --------------------------------------------------

        for line in lines:

            if re.fullmatch(
                r"[1-5](?:\.0)?",
                line
            ):
                try:
                    review["rating"] = float(line)
                    break
                except Exception:
                    pass

        # --------------------------------------------------
        # Certified Buyer
        # --------------------------------------------------

        certified_index = None

        for index, line in enumerate(lines):

            if line == "Certified Buyer":

                certified_index = index
                review["verified_purchase"] = True
                break

        # --------------------------------------------------
        # Reviewer + location
        # --------------------------------------------------

        if certified_index is not None:

            reviewer_index = certified_index - 1

            if reviewer_index >= 0:

                reviewer_line = lines[
                    reviewer_index
                ]

                if "," in reviewer_line:

                    parts = reviewer_line.split(
                        ",",
                        1
                    )

                    review["reviewer"] = (
                        parts[0].strip()
                    )

                    review["location"] = (
                        parts[1].strip()
                    )

                else:

                    review["reviewer"] = (
                        reviewer_line
                    )

        # --------------------------------------------------
        # Date
        # --------------------------------------------------

        for line in lines:

            if re.search(
                r"\b\d+\s+"
                r"(day|days|month|months|year|years)"
                r"\s+ago\b",
                line,
                re.IGNORECASE
            ):

                review["date"] = line
                break

        # --------------------------------------------------
        # Remove metadata
        # --------------------------------------------------

        metadata_lines = {
            "Overall",
            "Camera",
            "Battery",
            "Display",
            "Design",
            "Performance",
            "Build Quality",
            "Value for Money",
            "Certified Buyer",
            "Verified Buyer",
            "Verified Purchase",
            "Most Helpful",
            "Latest",
            "Positive",
            "Negative"
        }

        content_lines = []

        for index, line in enumerate(lines):

            # Skip rating
            if re.fullmatch(
                r"[1-5](?:\.0)?",
                line
            ):
                continue

            # Skip metadata
            if line in metadata_lines:
                continue

            # Skip date
            if re.search(
                r"\b\d+\s+"
                r"(day|days|month|months|year|years)"
                r"\s+ago\b",
                line,
                re.IGNORECASE
            ):
                continue

            # Skip reviewer
            if (
                review["reviewer"]
                and line == review["reviewer"]
            ):
                continue

            # Skip location
            if (
                review["location"]
                and line == review["location"]
            ):
                continue

            content_lines.append(line)

        # --------------------------------------------------
        # Title + review text
        # --------------------------------------------------

        if content_lines:

            # In the current Flipkart structure,
            # the first line is usually the review title.
            review["title"] = content_lines[0]

            if len(content_lines) > 1:

                review["text"] = " ".join(
                    content_lines[1:]
                ).strip()

            else:

                review["text"] = (
                    content_lines[0]
                )

        return review

    def collect_reviews(
        self,
        product_url,
        max_reviews=20
    ):
        """
        Collect Flipkart review previews.
        """

        try:

            print(
                "Opening Flipkart review page..."
            )

            self.open_review_page(
                product_url
            )

            print(
                "Review page opened:"
            )

            print(
                self.driver.current_url
            )

            # Wait for review elements
            WebDriverWait(
                self.driver,
                20
            ).until(
                EC.presence_of_element_located(
                    (
                        By.XPATH,
                        "//*[normalize-space()='Certified Buyer']"
                    )
                )
            )

            time.sleep(2)

            buyers = self.driver.find_elements(
                By.XPATH,
                "//*[normalize-space()='Certified Buyer']"
            )

            print(
                "Certified Buyer elements:",
                len(buyers)
            )

            # Find complete review blocks
            blocks = self.find_review_blocks()

            print(
                "Review blocks found:",
                len(blocks)
            )

            reviews = []

            for block in blocks:

                review = self.extract_review(
                    block
                )

                if not review["text"]:
                    continue

                reviews.append(review)

                if len(reviews) >= max_reviews:
                    break

            return {
                "platform": "Flipkart",
                "product_url": product_url,
                "reviews_count": len(reviews),
                "reviews": reviews
            }

        except Exception as error:

            return {
                "platform": "Flipkart",
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

    scraper = FlipkartReviewScraper()

    try:

        product_url = (
            "https://www.flipkart.com/"
            "samsung-galaxy-s24-5g-snapdragon-cobalt-violet-256-gb/"
            "p/itm0e4552c03ca7c"
        )

        result = scraper.collect_reviews(
            product_url,
            max_reviews=20
        )

        print(
            "\nFlipkart Review Result:"
        )

        print(result)

    finally:

        scraper.close()