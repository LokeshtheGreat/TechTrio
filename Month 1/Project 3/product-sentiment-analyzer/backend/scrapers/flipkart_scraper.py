from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from urllib.parse import quote


class FlipkartScraper:
    BASE_URL = "https://www.flipkart.com"

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
        Convert a Flipkart URL into a clean product URL.
        """

        if not url:
            return None

        if url.startswith("/"):
            url = self.BASE_URL + url

        if "/p/" in url:
            return url.split("?")[0]

        return url

    def find_product_container(self, link):
        """
        Find a useful parent container around the product link.
        """

        try:

            container = link.find_element(
                By.XPATH,
                "./ancestor::div[.//a[contains(@href, '/p/')]][1]"
            )

            if container:
                return container

        except Exception:
            pass

        return link

    def extract_product_name(self, container):
        """
        Extract a likely product title from the product container.
        """

        # First try common title elements.
        selectors = [
            "div.KzDlHZ",
            "div._4rR01T",
            "a.wjcEIp",
            "a[href*='/p/']"
        ]

        for selector in selectors:

            try:

                elements = container.find_elements(
                    By.CSS_SELECTOR,
                    selector
                )

                for element in elements:

                    text = element.text.strip()

                    if not text:
                        continue

                    lines = [
                        line.strip()
                        for line in text.splitlines()
                        if line.strip()
                    ]

                    # Look for a line that resembles a product title.
                    for line in lines:

                        lower = line.lower()

                        if len(line) < 15:
                            continue

                        if "currently unavailable" in lower:
                            continue

                        if "out of stock" in lower:
                            continue

                        if "add to compare" in lower:
                            continue

                        if "ratings &" in lower:
                            continue

                        if "reviews" in lower:
                            continue

                        if "ram" in lower:
                            continue

                        if "rom" in lower:
                            continue

                        if "battery" in lower:
                            continue

                        if "processor" in lower:
                            continue

                        if "₹" in line:
                            continue

                        if "% off" in lower:
                            continue

                        if "bank offer" in lower:
                            continue

                        if "exchange" in lower:
                            continue

                        return line

            except Exception:
                continue

        return None

    def extract_availability(self, container):
        """
        Detect product availability.
        """

        text = container.text.lower()

        if "currently unavailable" in text:
            return "unavailable"

        if "out of stock" in text:
            return "out_of_stock"

        return "available"

    def search_product(self, product_name):
        """
        Search Flipkart and return the first usable product.
        """

        encoded_name = quote(product_name)

        search_url = (
            f"{self.BASE_URL}/search?q={encoded_name}"
        )

        try:

            self.driver.get(search_url)

            wait = WebDriverWait(self.driver, 15)

            wait.until(
                EC.presence_of_element_located(
                    (
                        By.CSS_SELECTOR,
                        "a[href*='/p/']"
                    )
                )
            )

            product_links = self.driver.find_elements(
                By.CSS_SELECTOR,
                "a[href*='/p/']"
            )

            for link in product_links:

                href = link.get_attribute("href")

                if not href:
                    continue

                product_url = self.clean_product_url(href)

                if not product_url:
                    continue

                container = self.find_product_container(link)

                title = self.extract_product_name(container)

                availability = self.extract_availability(
                    container
                )

                if title:

                    return {
                        "platform": "Flipkart",
                        "search_term": product_name,
                        "name": title,
                        "availability": availability,
                        "url": product_url
                    }

            return {
                "platform": "Flipkart",
                "search_term": product_name,
                "name": None,
                "availability": "unknown",
                "url": None,
                "error": "No usable product result found."
            }

        except Exception as error:

            return {
                "platform": "Flipkart",
                "search_term": product_name,
                "name": None,
                "availability": "unknown",
                "url": None,
                "error": str(error)
            }

    def close(self):
        """
        Close the Selenium browser.
        """

        self.driver.quit()


if __name__ == "__main__":

    scraper = FlipkartScraper()

    try:

        result = scraper.search_product(
            "Samsung Galaxy S24"
        )

        print("\nFlipkart Search Result:")
        print(result)

    finally:

        scraper.close()