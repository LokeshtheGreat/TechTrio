import os
import pandas as pd
import json
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

DATA_DIR = "data"
DETAILS_FILE = os.path.join(DATA_DIR, "movie_details.csv")

def ensure_directories():
    os.makedirs(DATA_DIR, exist_ok=True)

def get_all_cached_details():
    if not os.path.exists(DETAILS_FILE):
        return {}
    try:
        df = pd.read_csv(DETAILS_FILE, keep_default_na=False)
        cache = {}
        for _, row in df.iterrows():
            d = row.to_dict()
            for k, v in d.items():
                if v == "":
                    d[k] = None
            cache[d['imdb_id']] = d
        return cache
    except Exception:
        return {}

def scrape_movie_details(driver, url, imdb_id):
    details = {
        "imdb_id": imdb_id,
        "title": None,
        "poster_url": None,
        "plot": None,
        "genre": None,
        "director": None,
        "cast": None,
        "runtime": None
    }
    
    try:
        driver.get(url)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//h1")))
        
        try:
            details["title"] = driver.find_element(By.XPATH, "//h1").text.strip()
        except: pass
            
        try:
            details["poster_url"] = driver.find_element(By.XPATH, "//meta[@property='og:image']").get_attribute("content")
        except: pass
            
        try:
            plot = driver.find_element(By.XPATH, "//span[@data-testid='plot-xl']").text.strip()
            if plot and not ('h' in plot and 'm' in plot and len(plot) < 15):
                details["plot"] = plot
        except:
            try:
                plot = driver.find_element(By.XPATH, "//span[@data-testid='plot-xs_to_m']").text.strip()
                if plot and not ('h' in plot and 'm' in plot and len(plot) < 15):
                    details["plot"] = plot
            except: pass
            
        try:
            import time
            for _ in range(5):
                driver.execute_script("window.scrollBy(0, 800);")
                time.sleep(0.5)
                
            genre_texts = []
            # Preferred selector
            elements = driver.find_elements(By.CSS_SELECTOR, "a.ipc-chip.ipc-chip--on-base span.ipc-chip__text")
            for el in elements:
                try:
                    href = el.find_element(By.XPATH, "..").get_attribute("href") or ""
                    if "genres=" in href or "/interest/" in href:
                        if el.text.strip() and el.text.strip() not in genre_texts:
                            genre_texts.append(el.text.strip())
                except: pass
                
            # Fallback if DOM uses different class (e.g. ipc-chip--on-baseAlt)
            if not genre_texts:
                elements = driver.find_elements(By.CSS_SELECTOR, "a.ipc-chip span.ipc-chip__text")
                for el in elements:
                    try:
                        href = el.find_element(By.XPATH, "..").get_attribute("href") or ""
                        if "genres=" in href or "/interest/" in href:
                            if el.text.strip() and el.text.strip() not in genre_texts:
                                genre_texts.append(el.text.strip())
                    except: pass
                    
            if genre_texts:
                details["genre"] = ", ".join(genre_texts)
        except: pass
            
        try:
            directors = driver.find_elements(By.XPATH, "//li[@data-testid='title-pc-principal-credit'][1]//ul//a")
            if directors:
                details["director"] = ", ".join([d.text for d in directors])
        except: pass
            
        try:
            cast_items = driver.find_elements(By.XPATH, "//div[@data-testid='title-cast-item']")
            if cast_items:
                cast_data = []
                for item in cast_items[:5]:
                    try:
                        actor_name = item.find_element(By.XPATH, ".//a[@data-testid='title-cast-item__actor']").text.strip()
                    except: continue
                    try:
                        img = item.find_element(By.XPATH, ".//img[contains(@class, 'ipc-image')]").get_attribute("src")
                    except: img = None
                    try:
                        role = item.find_element(By.XPATH, ".//a[@data-testid='cast-item-characters-link']").text.strip()
                        if not role:
                            role = item.find_element(By.XPATH, ".//span[@class='ipc-metadata-list-item__list-content-item']").text.strip()
                    except: role = None
                    cast_data.append({"name": actor_name, "role": role, "image_url": img})
                if cast_data:
                    details["cast"] = json.dumps(cast_data)
        except: pass
            
        try:
            items = driver.find_elements(By.XPATH, "//ul[contains(@class, 'ipc-inline-list')]//li[@role='presentation']")
            for item in items:
                text = item.text.strip()
                if 'h' in text and 'm' in text and len(text) <= 10:
                    details["runtime"] = text
                    break
        except: pass
            
    except Exception as e:
        print(f"Critical error scraping {url}: {e}")
        
    return details

def save_movie_details(details_list):
    ensure_directories()
    df = pd.DataFrame(details_list)
    df.to_csv(DETAILS_FILE, index=False)

def get_movie_details(imdb_id):
    if not os.path.exists(DETAILS_FILE): return None
    try:
        df = pd.read_csv(DETAILS_FILE, keep_default_na=False)
        record = df[df['imdb_id'] == imdb_id]
        if not record.empty:
            rec_dict = record.iloc[0].to_dict()
            for k, v in rec_dict.items():
                if v == "": rec_dict[k] = None
            if rec_dict.get('cast'):
                try:
                    rec_dict['cast'] = json.loads(rec_dict['cast'])
                except: pass
            return rec_dict
    except: pass
    return None
