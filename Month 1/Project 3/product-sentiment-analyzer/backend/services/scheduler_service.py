import os
import threading
import time

from services.scrape_service import trigger_batch_scrape

_scheduler_started = False

def run_scheduler_loop(interval_hours):
    interval_seconds = interval_hours * 3600
    while True:
        print(f"[SCHEDULER] Sleeping for {interval_hours} hours...")
        time.sleep(interval_seconds)
        
        print(f"[SCHEDULER] Triggering scheduled scrape...")
        success, job_id = trigger_batch_scrape(trigger="scheduled")
        if not success:
            print(f"[SCHEDULER] Job {job_id} is already running. Skipping scheduled trigger.")

def start_scheduler():
    global _scheduler_started
    if _scheduler_started:
        return
    _scheduler_started = True
    
    # Only start once in Flask dev server
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true" and os.environ.get("FLASK_ENV") == "development":
        return
        
    enabled = os.environ.get("SCRAPER_SCHEDULER_ENABLED", "true").lower() == "true"
    if not enabled:
        print("[SCHEDULER] Scheduler is disabled by environment variable.")
        return
        
    try:
        interval_hours = float(os.environ.get("SCRAPE_INTERVAL_HOURS", "12"))
    except ValueError:
        interval_hours = 12.0
        
    print(f"[SCHEDULER] Starting scheduler (Interval: {interval_hours} hours)")
    t = threading.Thread(target=run_scheduler_loop, args=(interval_hours,), daemon=True)
    t.start()
