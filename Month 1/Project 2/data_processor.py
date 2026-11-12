import os
import shutil
import pandas as pd
import glob
from datetime import datetime

DATA_DIR = "data"
HISTORY_DIR = os.path.join(DATA_DIR, "history")
NOTIFICATIONS_DIR = os.path.join(DATA_DIR, "notifications")
CURRENT_FILE = os.path.join(DATA_DIR, "movies_current.csv")
PREVIOUS_FILE = os.path.join(DATA_DIR, "movies_previous.csv")

def ensure_directories():
    os.makedirs(HISTORY_DIR, exist_ok=True)
    os.makedirs(NOTIFICATIONS_DIR, exist_ok=True)

def get_date_str(date=None):
    if date is None:
        return datetime.now().strftime("%Y-%m-%d")
    return date

def save_snapshot(movies, date=None):
    ensure_directories()
    
    if os.path.exists(CURRENT_FILE):
        shutil.copy(CURRENT_FILE, PREVIOUS_FILE)
        
    date_str = get_date_str(date)
    history_file = os.path.join(HISTORY_DIR, f"{date_str}.csv")
    df = pd.DataFrame(movies)
    df.to_csv(history_file, index=False)
    df.to_csv(CURRENT_FILE, index=False)
    
    update_daily_notifications(date_str)
    
    return history_file

def update_daily_notifications(date_str):
    if not os.path.exists(CURRENT_FILE) or not os.path.exists(PREVIOUS_FILE):
        return
        
    latest_df = pd.read_csv(CURRENT_FILE)
    previous_df = pd.read_csv(PREVIOUS_FILE)
    
    latest_df = latest_df.where(pd.notnull(latest_df), None)
    previous_df = previous_df.where(pd.notnull(previous_df), None)
    
    latest = latest_df.to_dict(orient="records")
    previous = previous_df.to_dict(orient="records")
    
    prev_map = {str(m["title"]).strip(): m for m in previous if m.get("title")}
    
    records_to_add = []
    
    for curr in latest:
        if not curr.get("title"): continue
        title = str(curr["title"]).strip()
        curr_rank = curr.get("rank")
        curr_rating = curr.get("rating")
        
        if title not in prev_map:
            # We store rank and rating combined in current_value for new entry, e.g. "250|8.5" 
            # Or just store rank as requested by user and lookup rating later. Let's just store rank.
            records_to_add.append({
                "date": date_str,
                "type": "new_entry",
                "title": title,
                "previous_value": "",
                "current_value": curr_rank
            })
        else:
            prev = prev_map[title]
            prev_rank = prev.get("rank")
            prev_rating = prev.get("rating")
            
            if curr_rank is not None and prev_rank is not None and curr_rank != prev_rank:
                records_to_add.append({
                    "date": date_str,
                    "type": "ranking_change",
                    "title": title,
                    "previous_value": prev_rank,
                    "current_value": curr_rank
                })
                    
            if curr_rating is not None and prev_rating is not None:
                try:
                    c_rat = float(curr_rating)
                    p_rat = float(prev_rating)
                    if abs(c_rat - p_rat) >= 0.05:
                        records_to_add.append({
                            "date": date_str,
                            "type": "rating_change",
                            "title": title,
                            "previous_value": round(p_rat, 1),
                            "current_value": round(c_rat, 1)
                        })
                except (ValueError, TypeError):
                    pass

    if records_to_add:
        notif_file = os.path.join(NOTIFICATIONS_DIR, f"{date_str}.csv")
        
        existing_records = []
        if os.path.exists(notif_file):
            df = pd.read_csv(notif_file)
            df = df.where(pd.notnull(df), None)
            existing_records = df.to_dict(orient="records")
            
        existing_set = set()
        for r in existing_records:
            key = (r["type"], r["title"], str(r.get("previous_value", "")), str(r.get("current_value", "")))
            existing_set.add(key)
            
        new_df_records = []
        for c in records_to_add:
            key = (c["type"], c["title"], str(c.get("previous_value", "")), str(c.get("current_value", "")))
            if key not in existing_set:
                new_df_records.append(c)
                existing_set.add(key)
                
        if new_df_records:
            new_df = pd.DataFrame(new_df_records)
            if os.path.exists(notif_file):
                new_df.to_csv(notif_file, mode="a", header=False, index=False)
            else:
                new_df.to_csv(notif_file, index=False)

def get_historical_changes():
    ensure_directories()
    
    empty_result = {
        "new_entries": [],
        "ranking_changes": [],
        "rating_changes": [],
        "summary": {
            "new_entries": 0,
            "ranking_changes": 0,
            "rating_changes": 0
        }
    }
    
    date_str = get_date_str()
    notif_file = os.path.join(NOTIFICATIONS_DIR, f"{date_str}.csv")
    
    if not os.path.exists(notif_file):
        return empty_result
        
    df = pd.read_csv(notif_file)
    df = df.where(pd.notnull(df), None)
    records = df.to_dict(orient="records")
    
    current_map = {}
    if os.path.exists(CURRENT_FILE):
        curr_df = pd.read_csv(CURRENT_FILE)
        curr_df = curr_df.where(pd.notnull(curr_df), None)
        curr_records = curr_df.to_dict(orient="records")
        current_map = {str(m["title"]).strip(): m for m in curr_records if m.get("title")}
    
    new_entries = []
    ranking_changes = []
    rating_changes = []
    
    for r in records:
        r_type = r["type"]
        title = r["title"]
        r_date = r["date"]
        try:
            curr_val = r["current_value"]
            prev_val = r["previous_value"]
        except:
            continue
            
        if r_type == "new_entry":
            rating = "?"
            if title in current_map:
                rating = current_map[title].get("rating", "?")
            new_entries.append({
                "title": title,
                "current_rank": curr_val,
                "rating": rating,
                "change_type": "new",
                "date": r_date
            })
        elif r_type == "ranking_change":
            try:
                p_rank = int(float(prev_val))
                c_rank = int(float(curr_val))
                c_amount = abs(c_rank - p_rank)
                c_type = "up" if c_rank < p_rank else "down"
                ranking_changes.append({
                    "title": title,
                    "previous_rank": p_rank,
                    "current_rank": c_rank,
                    "change_amount": c_amount,
                    "change_type": c_type,
                    "date": r_date
                })
            except Exception as e:
                pass
        elif r_type == "rating_change":
            try:
                p_rat = float(prev_val)
                c_rat = float(curr_val)
                rating_changes.append({
                    "title": title,
                    "previous_rating": p_rat,
                    "current_rating": c_rat,
                    "change_amount": round(abs(c_rat - p_rat), 1),
                    "change_type": "rating",
                    "date": r_date
                })
            except Exception as e:
                pass
            
    return {
        "new_entries": new_entries,
        "ranking_changes": ranking_changes,
        "rating_changes": rating_changes,
        "summary": {
            "new_entries": len(new_entries),
            "ranking_changes": len(ranking_changes),
            "rating_changes": len(rating_changes)
        }
    }
    
def snapshot_exists(date=None):
    date_str = get_date_str(date)
    history_file = os.path.join(HISTORY_DIR, f"{date_str}.csv")
    return os.path.exists(history_file)

def load_snapshot(date=None):
    date_str = get_date_str(date)
    history_file = os.path.join(HISTORY_DIR, f"{date_str}.csv")
    if os.path.exists(history_file):
        df = pd.read_csv(history_file)
        df = df.where(pd.notnull(df), None)
        return df.to_dict(orient="records")
    return []

def get_latest_snapshot():
    ensure_directories()
    files = glob.glob(os.path.join(HISTORY_DIR, "*.csv"))
    if not files:
        if os.path.exists(CURRENT_FILE):
            df = pd.read_csv(CURRENT_FILE)
            df = df.where(pd.notnull(df), None)
            return df.to_dict(orient="records")
        return []
    latest_file = sorted(files)[-1]
    df = pd.read_csv(latest_file)
    df = df.where(pd.notnull(df), None)
    return df.to_dict(orient="records")
    
def get_available_snapshots():
    ensure_directories()
    files = glob.glob(os.path.join(HISTORY_DIR, "*.csv"))
    dates = []
    for f in files:
        basename = os.path.basename(f)
        if basename.endswith(".csv"):
            dates.append(basename[:-4])
    return sorted(dates, reverse=True)
