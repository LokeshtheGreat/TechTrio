from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class Product:
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    product_id: Optional[str] = None
    amazon_url: Optional[str] = None
    flipkart_url: Optional[str] = None


class ProductResolver:
    # Known smartphone brands
    KNOWN_BRANDS = [
        "Samsung",
        "Apple",
        "OnePlus",
        "Google",
        "Xiaomi",
        "Redmi",
        "Realme",
        "iQOO",
        "Nothing",
        "Motorola",
        "Vivo",
        "Oppo",
        "Honor",
        "Sony",
        "Nokia",
        "Asus",
        "Infinix",
        "Tecno",
        "Lava",
        "Poco",
    ]

    PRODUCTS_CONFIG = [
        {
            "product_id": "apple_iphone_17",
            "product_name": "Apple iPhone 17",
            "brand": "Apple",
            "model": "iPhone 17",
            "amazon_url": "https://www.amazon.in/dp/B0FQFYXCC4",
            "amazon_asin": "B0FQFYXCC4",
            "flipkart_url": "https://www.flipkart.com/apple-iphone-17-white-256-gb/product-reviews/itm68ad8410784c7?pid=MOBHQV9YAZYYWY8A&lid=LSTMOBHQV9YAZYYWY8A6D2THC&marketplace=FLIPKART",
            "flipkart_product_id": "MOBHQV9YAZYYWY8A"
        },
        {
            "product_id": "samsung_galaxy_s26_ultra_5g",
            "product_name": "Samsung Galaxy S26 Ultra 5G",
            "brand": "Samsung",
            "model": "Galaxy S26 Ultra 5G",
            "amazon_url": "https://www.amazon.in/dp/B0GL8G49LV",
            "amazon_asin": "B0GL8G49LV",
            "flipkart_url": "https://www.flipkart.com/samsung-galaxy-s26-ultra-5g-cobalt-violet-256-gb/product-reviews/itmf4799d3841c43?pid=MOBHKGAPUXRHVXHZ&lid=LSTMOBHKGAPUXRHVXHZWUKACF&marketplace=FLIPKART",
            "flipkart_product_id": "MOBHKGAPUXRHVXHZ"
        },
        {
            "product_id": "redmi_15_5g",
            "product_name": "Redmi 15 5G",
            "brand": "Redmi",
            "model": "15 5G",
            "amazon_url": "https://www.amazon.in/dp/B0FJFT4VDY",
            "amazon_asin": "B0FJFT4VDY",
            "flipkart_url": "https://www.flipkart.com/redmi-15-5g-midnight-black-128-gb/product-reviews/itmd7bced8727891?pid=MOBHFH9544VVMQNN&lid=LSTMOBHFH9544VVMQNNHIZB8E&marketplace=FLIPKART",
            "flipkart_product_id": "MOBHFH9544VVMQNN"
        },
        {
            "product_id": "oneplus_13s_5g",
            "product_name": "OnePlus 13s 5G",
            "brand": "OnePlus",
            "model": "13s 5G",
            "amazon_url": "https://www.amazon.in/dp/B0F5WTG8RG",
            "amazon_asin": "B0F5WTG8RG",
            "flipkart_url": "https://www.flipkart.com/oneplus-13s-5g-black-velvet-256-gb/product-reviews/itmb6d10cf953b5d?pid=MOBHCTQTGUGEJHMG&lid=LSTMOBHCTQTGUGEJHMG2UBZOF&marketplace=FLIPKART",
            "flipkart_product_id": "MOBHCTQTGUGEJHMG"
        },
        {
            "product_id": "vivo_v70_5g",
            "product_name": "vivo V70 5G",
            "brand": "vivo",
            "model": "V70 5G",
            "amazon_url": "https://www.amazon.in/dp/B0GHQVR1N8",
            "amazon_asin": "B0GHQVR1N8",
            "flipkart_url": "https://www.flipkart.com/vivo-v70-passion-red-2026-256-gb/product-reviews/itmecfa7a31699de?pid=MOBHZFFH6ZBHTHZU&lid=LSTMOBHZFF6ZBHTHZUBNFFP4&marketplace=FLIPKART",
            "flipkart_product_id": "MOBHZFFH6ZBHTHZU"
        }
    ]

    def _match_config(self, product_name: str) -> Optional[dict]:
        product_lower = product_name.lower()
        
        if "iphone 17" in product_lower:
            return next(p for p in self.PRODUCTS_CONFIG if p["product_id"] == "apple_iphone_17")
        if "s26 ultra" in product_lower:
            return next(p for p in self.PRODUCTS_CONFIG if p["product_id"] == "samsung_galaxy_s26_ultra_5g")
        if "redmi 15 5g" in product_lower:
            return next(p for p in self.PRODUCTS_CONFIG if p["product_id"] == "redmi_15_5g")
        if "oneplus 13s" in product_lower:
            return next(p for p in self.PRODUCTS_CONFIG if p["product_id"] == "oneplus_13s_5g")
        if "v70" in product_lower:
            return next(p for p in self.PRODUCTS_CONFIG if p["product_id"] == "vivo_v70_5g")
            
        return None

    def resolve(self, product_name: str) -> Product:
        """
        Convert a user's product search into a canonical product object.
        """

        product_name = " ".join(product_name.strip().split())

        if not product_name:
            raise ValueError("Product name cannot be empty.")

        config_match = self._match_config(product_name)
        if config_match:
            return Product(
                name=config_match['product_name'],
                brand=config_match['brand'],
                model=config_match['model'],
                product_id=config_match['product_id'],
                amazon_url=config_match['amazon_url'],
                flipkart_url=config_match['flipkart_url']
            )

        brand = self._detect_brand(product_name)

        model = self._extract_model(product_name, brand)

        return Product(
            name=product_name,
            brand=brand,
            model=model
        )

    def _detect_brand(self, product_name: str) -> Optional[str]:
        """
        Detect the smartphone brand from the product name.
        """

        product_lower = product_name.lower()

        for brand in self.KNOWN_BRANDS:
            if brand.lower() in product_lower:
                return brand

        return None

    def _extract_model(
        self,
        product_name: str,
        brand: Optional[str]
    ) -> Optional[str]:
        """
        Remove the detected brand from the product name
        and keep the remaining text as the model.
        """

        if not brand:
            return product_name

        model = product_name

        # Remove only the first occurrence of the brand
        brand_start = model.lower().find(brand.lower())

        if brand_start != -1:
            model = (
                model[:brand_start]
                + model[brand_start + len(brand):]
            )

        model = " ".join(model.split()).strip()

        return model if model else None


if __name__ == "__main__":
    resolver = ProductResolver()

    test_products = [
        "Samsung Galaxy S24",
        "OnePlus 13",
        "iQOO 13",
        "Nothing Phone 3",
        "Google Pixel 9",
        "Apple iPhone 16 Pro",
    ]

    for product_name in test_products:
        product = resolver.resolve(product_name)
        print(asdict(product))