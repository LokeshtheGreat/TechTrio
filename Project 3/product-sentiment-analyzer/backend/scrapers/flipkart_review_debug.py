from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


class FlipkartReviewDebug:

    def __init__(self):
        options = Options()

        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")

        self.driver = webdriver.Chrome(options=options)

    def open_review_page(self, product_url):

        self.driver.get(product_url)

        time.sleep(5)

        # Open Ratings & Reviews
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

        self.driver.execute_script(
            "arguments[0].click();",
            ratings_link
        )

        # Wait for actual review links
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

        print("Review links found:", len(review_links))

        if not review_links:
            raise RuntimeError(
                "No product review links found."
            )

        # Click first actual review
        self.driver.execute_script(
            "arguments[0].click();",
            review_links[0]
        )

        WebDriverWait(
            self.driver,
            20
        ).until(
            lambda driver:
            "/product-reviews/" in driver.current_url
        )

        time.sleep(5)

    def inspect_certified_buyer(self):

        buyers = self.driver.find_elements(
            By.XPATH,
            "//*[normalize-space()='Certified Buyer']"
        )

        print("\nCertified Buyer elements:", len(buyers))

        if not buyers:
            print("No Certified Buyer elements found.")
            return

        buyer = buyers[0]

        print("\n========== BUYER ELEMENT ==========")
        print("Tag:", buyer.tag_name)
        print("Text:")
        print(repr(buyer.text))

        print("\n========== PARENT ==========")

        try:
            parent = buyer.find_element(
                By.XPATH,
                "./.."
            )

            print("Tag:", parent.tag_name)
            print("Text:")
            print(repr(parent.text))

        except Exception as error:
            print("Parent error:", error)

        print("\n========== GRANDPARENT ==========")

        try:
            grandparent = buyer.find_element(
                By.XPATH,
                "./../.."
            )

            print("Tag:", grandparent.tag_name)
            print("Text:")
            print(repr(grandparent.text))

        except Exception as error:
            print("Grandparent error:", error)

        print("\n========== ANCESTOR LEVELS ==========")

        for level in range(1, 9):

            try:

                xpath = "./" + "/.." * level

                ancestor = buyer.find_element(
                    By.XPATH,
                    xpath
                )

                text = ancestor.text.strip()

                print(
                    f"\nLEVEL {level}"
                )

                print(
                    "Tag:",
                    ancestor.tag_name
                )

                print(
                    "Text:",
                    repr(text[:1000])
                )

            except Exception as error:

                print(
                    f"Level {level} error:",
                    error
                )

    def close(self):
        self.driver.quit()


if __name__ == "__main__":

    scraper = FlipkartReviewDebug()

    try:

        product_url = (
            "https://www.flipkart.com/"
            "samsung-galaxy-s24-5g-snapdragon-cobalt-violet-256-gb/"
            "p/itm0e4552c03ca7c"
        )

        scraper.open_review_page(
            product_url
        )

        print(
            "\nReview page:"
        )

        print(
            scraper.driver.current_url
        )

        scraper.inspect_certified_buyer()

    finally:

        scraper.close()