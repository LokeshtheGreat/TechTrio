from flask import Flask, render_template, jsonify
import threading
import time
from datetime import datetime

from scraper import scrape_coinmarketcap
from data_processor import save_to_csv, get_latest_data
from visualization import generate_visualizations
from portfolio import calculate_portfolio_value

app = Flask(__name__)

SCRAPE_INTERVAL = 15 # Configure scrape interval in seconds (default 30s)

def background_scraper():
    while True:
        try:
            print(f"[{datetime.now()}] Starting scrape...")
            data = scrape_coinmarketcap(10)
            if data:
                save_to_csv(data)
                generate_visualizations()
                print(f"[{datetime.now()}] Scrape complete. {len(data)} rows saved.")
            else:
                print(f"[{datetime.now()}] Scrape returned no data.")
        except Exception as e:
            print(f"[{datetime.now()}] Background task error: {e}")
            
        time.sleep(SCRAPE_INTERVAL)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/data")
def api_data():
    data = get_latest_data()
    actual_last_update = data[0]['timestamp'] if data and len(data) > 0 else "Never"
    return jsonify({
        "status": "success",
        "last_update": actual_last_update,
        "data": data
    })

@app.route("/api/history/<coin_name>")
def api_history(coin_name):
    """Return all real CSV observations for a single coin as [{ts, price, change_24h}]."""
    try:
        import pandas as pd, os, re
        csv_file = "data/crypto_prices.csv"
        if not os.path.isfile(csv_file):
            return jsonify({"status": "error", "data": []})
        df = pd.read_csv(csv_file).dropna(subset=["timestamp", "name"])
        # Match coin by safe name (lowercase, alphanumeric only) so URL slug works
        safe_name = re.sub(r'[^a-z0-9]', '', coin_name.lower())
        coin_df = df[df["name"].apply(lambda n: re.sub(r'[^a-z0-9]', '', str(n).lower()) == safe_name)].copy()
        if coin_df.empty:
            return jsonify({"status": "ok", "data": []})
        coin_df["_dt"] = pd.to_datetime(coin_df["timestamp"], format="mixed", dayfirst=False, errors="coerce")
        coin_df = coin_df.dropna(subset=["_dt"]).sort_values("_dt")
        records = [
            {
                "ts": row["_dt"].isoformat(),
                "price": row["price"],
                "change_24h": row["change_24h"]
            }
            for _, row in coin_df.iterrows()
        ]
        return jsonify({"status": "ok", "data": records})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e), "data": []})

if __name__ == "__main__":
    # Start the background scraper thread
    scraper_thread = threading.Thread(target=background_scraper, daemon=True)
    scraper_thread.start()
    
    app.run(debug=True, port=5000, use_reloader=False, threaded=True)

