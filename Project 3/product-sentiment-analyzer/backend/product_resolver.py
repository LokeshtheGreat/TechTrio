from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class Product:
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None


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

    def resolve(self, product_name: str) -> Product:
        """
        Convert a user's product search into a canonical product object.
        """

        product_name = " ".join(product_name.strip().split())

        if not product_name:
            raise ValueError("Product name cannot be empty.")

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