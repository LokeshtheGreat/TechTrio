from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from urllib.parse import urlparse


class AmazonScraper:
    BASE_URL = "https://www.amazon.in"

    def __init__(self):
        options = Options()

        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")

        self.driver = webdriver.Chrome(options=options)

    def clean_product_url(self, url):
        """
        Convert an Amazon product URL into a clean /dp/ URL.
        """

        if not url:
            return None

        parsed_url = urlparse(url)

        parts = parsed_url.path.split("/")

        if "dp" in parts:
            dp_index = parts.index("dp")

            if len(parts) > dp_index + 1:
                product_id = parts[dp_index + 1]

                return f"{self.BASE_URL}/dp/{product_id}"

        return url

    def extract_title(self, product):
        """
        Extract the actual product title from a search result.
        """

        selectors = [
            "h2 span",
            "h2.a-size-medium span",
            "h2.a-size-base-plus span",
            "a.a-link-normal h2 span"
        ]

        for selector in selectors:

            try:
                elements = product.find_elements(
                    By.CSS_SELECTOR,
                    selector
                )

                for element in elements:

                    text = element.text.strip()

                    # Ignore very short / invalid titles
                    if len(text) > 10:
                        return text

            except Exception:
                continue

        return None

    def extract_url(self, product):
        """
        Extract the Amazon product URL.
        """

        selectors = [
            "a[href*='/dp/']",
            "a.a-link-normal[href*='/dp/']",
            "h2 a"
        ]

        for selector in selectors:

            try:
                elements = product.find_elements(
                    By.CSS_SELECTOR,
                    selector
                )

                for element in elements:

                    href = element.get_attribute("href")

                    if href and "/dp/" in href:
                        return self.clean_product_url(href)

            except Exception:
                continue

        return None

    def search_product(self, product_name):
        """
        Search Amazon India and return the first usable product.
        """

        search_url = (
            f"{self.BASE_URL}/s?k="
            + product_name.replace(" ", "+")
        )

        try:

            self.driver.get(search_url)

            wait = WebDriverWait(self.driver, 15)

            wait.until(
                EC.presence_of_element_located(
                    (
                        By.CSS_SELECTOR,
                        "div[data-component-type='s-search-result']"
                    )
                )
            )

            products = self.driver.find_elements(
                By.CSS_SELECTOR,
                "div[data-component-type='s-search-result']"
            )

            for product in products:

                title = self.extract_title(product)

                product_url = self.extract_url(product)

                if title and product_url:

                    return {
                        "platform": "Amazon",
                        "search_term": product_name,
                        "name": title,
                        "url": product_url
                    }

            return {
                "platform": "Amazon",
                "search_term": product_name,
                "name": None,
                "url": None,
                "error": "No usable product result found."
            }

        except Exception as error:

            return {
                "platform": "Amazon",
                "search_term": product_name,
                "name": None,
                "url": None,
                "error": str(error)
            }

    def close(self):
        """
        Close the Selenium browser.
        """

        self.driver.quit()


if __name__ == "__main__":

    scraper = AmazonScraper()

    try:

        result = scraper.search_product(
            "Samsung Galaxy S24"
        )

        print("\nAmazon Search Result:")
        print(result)

    finally:

        scraper.close()