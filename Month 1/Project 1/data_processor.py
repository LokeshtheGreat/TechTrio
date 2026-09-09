import pandas as pd
import os
import csv
from datetime import datetime

CSV_FILE = "data/crypto_prices.csv"

def save_to_csv(data):
    """
    Saves scraped data to CSV.
    Creates file with headers if it doesn't exist.
    Appends if it does.
    data format: list of dicts [{ "rank": 1, "name": "Bitcoin", "price": "$...", "change_24h": "...", "market_cap": "$..." }]
    """
    file_exists = os.path.isfile(CSV_FILE)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Add timestamp to each row
    for row in data:
        row["timestamp"] = timestamp
            
    keys = ["timestamp", "rank", "name", "price", "change_24h", "market_cap"]
    
    with open(CSV_FILE, "a", newline="", encoding="utf-8") as f:
        # Insert a blank line between batches for readability if file already exists
        if file_exists and os.path.getsize(CSV_FILE) > 0:
            f.write("\n")
            
        writer = csv.DictWriter(f, fieldnames=keys)
        if not file_exists:
            writer.writeheader()
        writer.writerows(data)

def get_latest_data():
    """
    Reads the CSV and returns the most recent 10 entries (the latest scrape batch).
    Uses datetime-aware comparison to handle mixed timestamp formats safely.
    """
    if not os.path.isfile(CSV_FILE):
        return []
        
    df = pd.read_csv(CSV_FILE).dropna(subset=["timestamp"])
    
    if df.empty:
        return []
        
    # Parse timestamps as datetime objects to handle mixed formats correctly.
    # (Naive string max() fails when the CSV has multiple timestamp formats,
    #  e.g. "9/4/2026 20:15" vs "2026-09-06 17:48:44")
    df["_dt"] = pd.to_datetime(df["timestamp"], format="mixed", dayfirst=False, errors="coerce")
    
    # Get the original timestamp string that corresponds to the latest datetime
    latest_time = df.loc[df["_dt"].idxmax(), "timestamp"]
    
    latest_df = df[df["timestamp"] == latest_time].drop(columns=["_dt"])
    latest_df = latest_df.sort_values(by="rank")
    
    return latest_df.to_dict("records")

def get_historical_data():
    """
    Returns the full dataframe for visualization purposes.
    """
    if not os.path.isfile(CSV_FILE):
        return pd.DataFrame()
        
    return pd.read_csv(CSV_FILE)

