from flask import Blueprint, jsonify
from services.scrape_service import get_job_status, trigger_batch_scrape

scrape_bp = Blueprint("scrape", __name__)

@scrape_bp.route("/status", methods=["GET"])
def get_status():
    return jsonify(get_job_status())

@scrape_bp.route("", methods=["POST"])
def manual_batch_scrape():
    success, job_id = trigger_batch_scrape(trigger="manual")
    if success:
        return jsonify({
            "success": True,
            "job_id": job_id,
            "status": "running",
            "trigger": "manual"
        })
    else:
        return jsonify({
            "success": False,
            "error": "A scraping job is already running.",
            "job_id": job_id
        }), 409
