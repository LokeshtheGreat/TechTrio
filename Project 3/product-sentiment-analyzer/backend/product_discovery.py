from scrapers.amazon_scraper import AmazonScraper
from scrapers.flipkart_scraper import FlipkartScraper


class ProductDiscovery:

    def search(self, product):
        """
        Search for a product across Amazon and Flipkart, using canonical URLs if available.
        """

        amazon_scraper = None
        flipkart_scraper = None

        # product might be a string (from old usages) or a Product object
        is_object = hasattr(product, 'name')
        product_name = product.name if is_object else product

        results = {
            "search_term": product_name,
            "amazon": None,
            "flipkart": None
        }

        try:
            # Search Amazon
            if is_object and getattr(product, 'amazon_url', None):
                results["amazon"] = {
                    "platform": "Amazon",
                    "source_platform": "amazon",
                    "search_term": product_name,
                    "name": product_name,
                    "url": product.amazon_url
                }
            else:
                amazon_scraper = AmazonScraper()
                results["amazon"] = amazon_scraper.search_product(product_name)
                if results["amazon"] and "platform" in results["amazon"]:
                    results["amazon"]["source_platform"] = "amazon"

            # Search Flipkart
            if is_object and getattr(product, 'flipkart_url', None):
                results["flipkart"] = {
                    "platform": "Flipkart",
                    "source_platform": "flipkart",
                    "search_term": product_name,
                    "name": product_name,
                    "url": product.flipkart_url,
                    "availability": "unknown"
                }
            else:
                flipkart_scraper = FlipkartScraper()
                results["flipkart"] = flipkart_scraper.search_product(product_name)
                if results["flipkart"] and "platform" in results["flipkart"]:
                    results["flipkart"]["source_platform"] = "flipkart"

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