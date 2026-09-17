from flask import Flask, render_template, jsonify, Response, request
import os
import threading
import queue
import json
from movie_details import get_movie_details
from data_processor import get_historical_changes, snapshot_exists, load_snapshot, get_date_str, save_snapshot, get_available_snapshots
from scraper import scrape_top_250




app = Flask(__name__)

# State management for scraping
scrape_lock = threading.Lock()
scrape_state = "idle"  # idle, running, completed, error
scrape_queue = queue.Queue()

def log_to_queue(message):
    scrape_queue.put({"event": "message", "data": str(message)})

def run_scrape_job():
    global scrape_state
    try:
        log_to_queue("Starting background scraping job...")
        movies = scrape_top_250(headless=True, log_callback=log_to_queue)
        
        if movies:
            log_to_queue("Scraping completed successfully.")
            log_to_queue("Saving today's snapshot...")
            save_snapshot(movies)
            log_to_queue("Today's snapshot saved successfully.")
            scrape_queue.put({"event": "complete", "data": json.dumps({"status": "completed"})})
            with scrape_lock:
                scrape_state = "completed"
        else:
            log_to_queue("Scraping failed: Zero movies extracted.")
            scrape_queue.put({"event": "error", "data": json.dumps({"status": "error", "message": "Zero movies extracted"})})
            with scrape_lock:
                scrape_state = "error"
    except Exception as e:
        error_msg = f"Scraping failed: {str(e)}"
        log_to_queue(error_msg)
        scrape_queue.put({"event": "error", "data": json.dumps({"status": "error", "message": str(e)})})
        with scrape_lock:
            scrape_state = "error"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status')
def get_status():
    exists = snapshot_exists()
    date_str = get_date_str()
    
    return jsonify({
        "snapshot_exists": exists,
        "scrape_required": not exists,
        "date": date_str
    })

@app.route('/api/movies')
def get_movies():
    if snapshot_exists():
        movies = load_snapshot()
        
        # Keep summary mock structure for UI for now
        summary = {
            "total_movies": len(movies),
            "avg_rating": round(sum(m['rating'] for m in movies if m.get('rating')) / len([m for m in movies if m.get('rating')]), 1) if movies else 0,
            "last_update": get_date_str(),
            "new_entries": 0,
            "ranking_changes": 0
        }
        
        return jsonify({
            "movies": movies,
            "summary": summary
        })
    else:
        return jsonify({
            "movies": [],
            "message": "Today's snapshot is not available.",
            "scrape_required": True
        }), 404

@app.route('/api/scrape', methods=['POST'])
def start_scrape():
    global scrape_state
    with scrape_lock:
        if scrape_state == "running":
            return jsonify({
                "started": False,
                "status": "running",
                "message": "A scraping job is already running."
            })
            
        scrape_state = "running"
        
        # Clear old log messages
        while not scrape_queue.empty():
            try:
                scrape_queue.get_nowait()
            except queue.Empty:
                break
                
    # Start background thread
    thread = threading.Thread(target=run_scrape_job)
    thread.daemon = True
    thread.start()
    
    return jsonify({
        "started": True,
        "status": "running"
    })

@app.route('/api/logs')
def stream_logs():
    def generate():
        while True:
            item = scrape_queue.get()
            event = item.get("event", "message")
            data = item.get("data", "")
            
            # SSE Format
            if event == "message":
                yield f"data: {data}\n\n"
            else:
                yield f"event: {event}\ndata: {data}\n\n"
                
            if event in ["complete", "error"]:
                break
                
    return Response(generate(), mimetype='text/event-stream')


@app.route('/api/changes', methods=['GET'])
def get_changes():
    try:
        changes = get_historical_changes()
        return jsonify(changes)
    except Exception as e:
        print(f"Error getting changes: {e}")
        return jsonify({
            "new_entries": [],
            "ranking_changes": [],
            "rating_changes": [],
            "summary": {"new_entries": 0, "ranking_changes": 0, "rating_changes": 0},
            "error": str(e)
        }), 500


@app.route('/api/movie/<imdb_id>', methods=['GET'])
def get_movie_details_api(imdb_id):
    details = get_movie_details(imdb_id)
    if details:
        return jsonify(details)
    else:
        return jsonify({"error": "Movie details not found", "imdb_id": imdb_id}), 404


@app.route('/api/history/dates')
def get_history_dates():
    return jsonify(get_available_snapshots())

@app.route('/api/history/<date>')
def get_history_by_date(date):
    movies = load_snapshot(date)
    return jsonify({
        "date": date,
        "movies": movies
    })



if __name__ == '__main__':
    app.run(debug=True)

