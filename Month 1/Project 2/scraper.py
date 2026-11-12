from selenium import webdriver
import undetected_chromedriver as uc
import movie_details

# Suppress harmless Windows exception during undetected-chromedriver garbage collection
if hasattr(uc.Chrome, "__del__"):
    original_del = uc.Chrome.__del__
    def silent_del(self):
        try:
            original_del(self)
        except OSError:
            pass
    uc.Chrome.__del__ = silent_del
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# Centralized selectors for easy maintenance
SELECTORS = {
    "list_container": "ul.ipc-metadata-list",
    "movie_item": "li.ipc-metadata-list-summary-item",
    "metadata_items": ".cli-title-metadata li.ipc-inline-list__item",
    "rating": ".ipc-rating-star--rating",
    "rank": '[data-testid="title-list-item-ranking"] .ipc-signpost__text',
    "link": "a.ipc-title-link-wrapper"
}

def scrape_top_250(headless=False, log_callback=None):
    def log(message):
        print(message)
        if log_callback:
            log_callback(message)
            
    # FORCE headless to False regardless of what app.py passes to bypass WAF 403 Forbidden
    headless = False
    
    options = uc.ChromeOptions()
    if headless:
        options.add_argument("--headless=new")
    
    # Standard options for stability
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--window-position=-32000,-32000") # Hide window off-screen to bypass headless WAF detection
    # Removed user-agent as per instructions
    
    log("Starting undetected-chromedriver...")
    driver = uc.Chrome(options=options)
    
    movies_data = []
    
    try:
        url = "https://www.imdb.com/chart/top/"
        log(f"Opening {url}...")
        driver.get(url)
        
        # Wait for the main list container to appear
        log("Waiting for page content to load...")
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["list_container"]))
            )
            log("Page loaded.")
        except TimeoutException:
            log("Error: Timed out waiting for IMDb Top 250 list to load.")
            with open('debug_timeout.html', 'w', encoding='utf-8') as f:
                f.write(driver.page_source)
            log("Saved debug_timeout.html")
            return []
            
        # Wait for at least one movie element to be present
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["movie_item"]))
        )
        
        import time
        log("Scrolling to load lazy-loaded items...")
        last_count = 0
        attempts = 0
        while True:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            current_elements = driver.find_elements(By.CSS_SELECTOR, SELECTORS["movie_item"])
            current_count = len(current_elements)
            
            if current_count >= 250:
                break
                
            if current_count == last_count:
                attempts += 1
                if attempts >= 3:
                    break
            else:
                attempts = 0
            
            last_count = current_count
        
        # Find all movie elements
        movie_elements = driver.find_elements(By.CSS_SELECTOR, SELECTORS["movie_item"])
        log(f"Found {len(movie_elements)} movie entries.\n")
        
        if movie_elements:
            first_item = movie_elements[0]
            outer_html = first_item.get_attribute('outerHTML')
            log(f"--- DIAGNOSTICS (First Movie) ---")
            log(f"Tag: {first_item.tag_name}")
            log(f"Class: {first_item.get_attribute('class')}")
            log(f"Visible Text: {first_item.text}")
            log(f"Outer HTML:\n{outer_html}\n-------------------")
            
            with open('debug_first_movie.html', 'w', encoding='utf-8') as f:
                f.write(outer_html)
                
        for index, item in enumerate(movie_elements):
            try:
                # Scroll into view to ensure lazy-loaded content or dynamic scripts trigger if needed
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", item)
                
                # Rank
                rank_elem = item.find_element(By.CSS_SELECTOR, SELECTORS["rank"])
                rank_text = rank_elem.text.strip()
                rank = int(rank_text.replace("#", ""))
                
                # Title
                title_elem = item.find_element(By.XPATH, ".//a[contains(@class, 'ipc-title-link-wrapper')]//h4")
                title = title_elem.text.strip()
                    
                # URL
                link_elem = item.find_element(By.CSS_SELECTOR, SELECTORS["link"])
                movie_url = link_elem.get_attribute("href")
                if "?" in movie_url:
                    movie_url = movie_url.split("?")[0] # Clean tracking parameters
                    
                # Year (typically the first metadata item)
                metadata = item.find_elements(By.CSS_SELECTOR, SELECTORS["metadata_items"])
                year = None
                if metadata:
                    year_text = metadata[0].text.strip()
                    if year_text.isdigit():
                        year = int(year_text)
                        
                # Rating
                rating_elem = item.find_element(By.CSS_SELECTOR, SELECTORS["rating"])
                rating_text = rating_elem.text.strip()
                rating = float(rating_text) if rating_text else None
                
                movie_dict = {
                    "rank": rank,
                    "title": title,
                    "year": year,
                    "rating": rating,
                    "url": movie_url
                }
                
                movies_data.append(movie_dict)
                log(f"[{index+1}/{len(movie_elements)}] #{rank} {title} ({year}) - {rating}")
                
            except NoSuchElementException as e:
                log(f"Warning: Missing element for movie at index {index}. Skipping. Error: {e}")
            except Exception as e:
                log(f"Warning: Unexpected error processing movie at index {index}. Skipping. Error: {e}")
                
        # Validation output
        log("\n--- Validation ---")
        log(f"Movies scraped: {len(movies_data)}")
        log(f"Skipped movies: {len(movie_elements) - len(movies_data)}")
        if movies_data:
            log(f"First movie: {movies_data[0]['title']} (#{movies_data[0]['rank']})")
            log(f"Last movie: {movies_data[-1]['title']} (#{movies_data[-1]['rank']})")
            
        if len(movies_data) == 0:
            log("ERROR: Zero movies extracted.")
        elif len(movies_data) < 250:
            log(f"WARNING: Extracted {len(movies_data)} movies, expected 250.")
            
        ranks = [m['rank'] for m in movies_data]
        if len(ranks) != len(set(ranks)):
            log("WARNING: Duplicate ranks detected.")
            

        # --- DETAILS EXTRACTION ---
        if movies_data:
            log("\n--- Extracting Movie Details ---")
            cached_details = movie_details.get_all_cached_details()
            
            for i, m in enumerate(movies_data):
                url = m['url']
                
                imdb_id = None
                try:
                    parts = url.split('/')
                    for part in parts:
                        if part.startswith('tt') and part[2:].isdigit():
                            imdb_id = part
                            break
                except Exception:
                    pass
                    
                if not imdb_id:
                    log(f"Warning: Could not extract IMDb ID from {url}")
                    continue
                    
                if imdb_id in cached_details:
                    log(f"[DETAILS {i+1}/{len(movies_data)}] {m['title']} — cached")
                else:
                    log(f"[DETAILS {i+1}/{len(movies_data)}] {m['title']} — scraping details")
                    try:
                        details = movie_details.scrape_movie_details(driver, url, imdb_id)
                        cached_details[imdb_id] = details
                    except Exception as e:
                        log(f"Warning: Failed to extract details for {m['title']}. Error: {e}")
                        
            if cached_details:
                log(f"Saving {len(cached_details)} movie details to persistent cache...")
                movie_details.save_movie_details(list(cached_details.values()))
                log("Movie details saved successfully.")
    finally:
        log("\nClosing browser.")
        driver.quit()
        
    return movies_data

if __name__ == "__main__":
    # Test execution
    movies = scrape_top_250(headless=False)
