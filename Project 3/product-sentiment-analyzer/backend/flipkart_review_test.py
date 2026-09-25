from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


options = Options()

options.add_argument("--headless=new")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--window-size=1920,1080")


driver = webdriver.Chrome(options=options)


try:

    product_url = (
        "https://www.flipkart.com/"
        "samsung-galaxy-s24-5g-snapdragon-cobalt-violet-256-gb/"
        "p/itm0e4552c03ca7c"
    )

    print("Opening product page...")

    driver.get(product_url)

    time.sleep(5)

    # --------------------------------------------------
    # Open Ratings & Reviews section
    # --------------------------------------------------

    ratings_link = WebDriverWait(
        driver,
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

    print("Ratings & Reviews link found.")

    driver.execute_script(
        "arguments[0].scrollIntoView({block:'center'});",
        ratings_link
    )

    time.sleep(1)

    driver.execute_script(
        "arguments[0].click();",
        ratings_link
    )

    print("Ratings & Reviews section opened.")

    # Wait for actual review links
    WebDriverWait(
        driver,
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

    # --------------------------------------------------
    # Find actual review links
    # --------------------------------------------------

    review_links = driver.find_elements(
        By.CSS_SELECTOR,
        "a[href*='/product-reviews/']"
    )

    print(
        "Review links found:",
        len(review_links)
    )

    if not review_links:

        print("No review links found.")

    else:

        # Use the first actual review link
        first_review_link = review_links[0]

        print("\nFirst review link:")
        print(
            first_review_link.get_attribute(
                "href"
            )
        )

        print(
            "\nClicking first review..."
        )

        driver.execute_script(
            "arguments[0].click();",
            first_review_link
        )

        # --------------------------------------------------
        # Wait for product-reviews page
        # --------------------------------------------------

        WebDriverWait(
            driver,
            20
        ).until(
            lambda driver:
            "/product-reviews/" in driver.current_url
        )

        time.sleep(4)

        print(
            "\n========== REVIEW PAGE =========="
        )

        print(
            "Current URL:"
        )

        print(
            driver.current_url
        )

        print(
            "\nPage title:"
        )

        print(
            driver.title
        )

        # --------------------------------------------------
        # Extract page text
        # --------------------------------------------------

        body_text = driver.find_element(
            By.TAG_NAME,
            "body"
        ).text

        print(
            "\n========== REVIEW PAGE TEXT ==========\n"
        )

        print(
            body_text[:15000]
        )

        # --------------------------------------------------
        # Count useful review markers
        # --------------------------------------------------

        print(
            "\n========== COUNTS =========="
        )

        verified_purchase = driver.find_elements(
            By.XPATH,
            "//*[normalize-space()='Verified Purchase']"
        )

        review_for = driver.find_elements(
            By.XPATH,
            "//*[contains("
            "normalize-space(), "
            "'Review for:'"
            ")]"
        )

        product_review_links = driver.find_elements(
            By.CSS_SELECTOR,
            "a[href*='/product-reviews/']"
        )

        print(
            "Verified Purchase:",
            len(verified_purchase)
        )

        print(
            "Review for:",
            len(review_for)
        )

        print(
            "Product review links:",
            len(product_review_links)
        )

finally:

    driver.quit()