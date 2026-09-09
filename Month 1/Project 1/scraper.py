import time
from datetime import datetime
import sys
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def scrape_coinmarketcap(top_n=10):
    print("Initializing options...", flush=True)
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36")
    
    # Use normal page load strategy to wait for full DOM and JS execution
    options.page_load_strategy = "normal"
    
    print("Installing/Finding ChromeDriver...", flush=True)
    driver_path = ChromeDriverManager().install()
    driver = webdriver.Chrome(service=Service(driver_path), options=options)
    driver.set_page_load_timeout(30)
    
    data = []
    
    try:
        t_start = time.time()
        try:
            driver.get("https://coinmarketcap.com/")
        except Exception as e:
            print(f"Page load timeout or error, but continuing: {e}", flush=True)
        
        # Wait for document.readyState == "complete" then for table presence
        WebDriverWait(driver, 15).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.XPATH, "//table//tbody/tr"))
        )
        
        # Semantically locate the Bitcoin row to confirm dynamic data is hydrated.
        # Identifies the row where rank="1", name contains "Bitcoin", symbol contains "BTC".
        # Does NOT use fixed row indices (tr[1] is the CMC20 promotional row, not Bitcoin).
        def bitcoin_readiness(d):
            try:
                rows = d.find_elements(By.XPATH, "//table//tbody/tr")
                for row in rows:
                    tds = row.find_elements(By.TAG_NAME, "td")
                    if len(tds) < 8:
                        continue
                    rank_text = tds[1].text.strip()
                    name_text = tds[2].text.strip()
                    price_text = tds[3].text.strip()
                    if rank_text == "1" and "Bitcoin" in name_text and "BTC" in name_text:
                        if price_text and price_text.startswith("$") and len(price_text) > 3:
                            skeletons = row.find_elements(By.XPATH, ".//*[contains(@class, 'skeleton') or contains(@class, 'loading-box')]")
                            if len(skeletons) == 0:
                                return True
            except Exception:
                pass  # Ignore stale elements during React hydration
            return False

        # Bounded explicit hydration wait (10 seconds max). Does NOT wait for price text
        # to change — a valid live price can be identical to the SSR price.
        try:
            WebDriverWait(driver, 10).until(bitcoin_readiness)
        except Exception:
            pass  # Timed out — proceed anyway with whatever data is rendered
            
        # Short stabilization pause to let React finish any final layout pass
        time.sleep(1)
        
        # Scroll slightly to ensure lazy-rendered rows are visible
        driver.execute_script("window.scrollTo(0, 1000);")
        time.sleep(1)
        
        rows = driver.find_elements(By.XPATH, "//table//tbody/tr")
        print(f"Found {len(rows)} rows.", flush=True)
        
        count = 0
        for row in rows:
            if count >= top_n:
                break
                
            try:
                tds = row.find_elements(By.TAG_NAME, "td")
                if len(tds) < 8:
                    continue
                    
                rank_text = tds[1].text.strip()
                name_text = tds[2].text.strip()
                name = name_text.split("\n")[0] if "\n" in name_text else name_text
                
                price_text = tds[3].text.strip()
                change_24h_text = tds[5].text.strip()
                
                is_down = len(tds[5].find_elements(By.XPATH, ".//span[contains(@class, 'icon-caret-down')]")) > 0
                if not is_down:
                     is_down = len(tds[5].find_elements(By.XPATH, ".//span[contains(@class, 'icon-Caret-down')]")) > 0
                
                if is_down and not change_24h_text.startswith("-"):
                    change_24h_text = "-" + change_24h_text
                    
                market_cap_text = tds[7].text.strip().split("\n")[0]
                
                if rank_text and name and price_text:
                    data.append({
                        "rank": int(rank_text),
                        "name": name,
                        "price": price_text,
                        "change_24h": change_24h_text,
                        "market_cap": market_cap_text
                    })
                    count += 1
            except Exception as e:
                print(f"Error parsing row: {e}", flush=True)
                
        t_end = time.time()
        print(f"Extraction complete: {count} rows in {t_end - t_start:.1f}s", flush=True)
        
    except Exception as e:
        print(f"Scraping failed: {e}", flush=True)
    finally:
        driver.quit()
        
    return data

if __name__ == "__main__":
    res = scrape_coinmarketcap(10)
    for r in res:
        print(r, flush=True)

