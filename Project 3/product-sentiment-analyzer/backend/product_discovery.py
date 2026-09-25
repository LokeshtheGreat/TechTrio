from scrapers.amazon_scraper import AmazonScraper
from scrapers.flipkart_scraper import FlipkartScraper


class ProductDiscovery:

    def search(self, product_name):
        """
        Search for a product across Amazon and Flipkart.
        """

        amazon_scraper = None
        flipkart_scraper = None

        results = {
            "search_term": product_name,
            "amazon": None,
            "flipkart": None
        }

        try:
            # Create scrapers
            amazon_scraper = AmazonScraper()
            flipkart_scraper = FlipkartScraper()

            # Search Amazon
            results["amazon"] = amazon_scraper.search_product(
                product_name
            )

            # Search Flipkart
            results["flipkart"] = flipkart_scraper.search_product(
                product_name
            )

            return results

        finally:

            # Always close browsers
            if amazon_scraper:
                amazon_scraper.close()

            if flipkart_scraper:
                flipkart_scraper.close()


if __name__ == "__main__":

    discovery = ProductDiscovery()

    result = discovery.search(
        "Samsung Galaxy S24"
    )

    print("\nProduct Discovery Result:")
    print(result)