from flask import Flask, jsonify
from flask_cors import CORS

from routes.product_routes import product_bp
import os
import sys
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from database.review_repository import ReviewRepository

from routes.product_routes import product_bp
from routes.scrape_routes import scrape_bp
from routes.analytics_routes import analytics_bp

app = Flask(__name__)
CORS(app)

# Initialize Database and Indexes
try:
    repo = ReviewRepository()
    print("Successfully connected to MongoDB and ensured indexes.")
except Exception as e:
    print(f"Failed to initialize MongoDB: {e}")

from services.scheduler_service import start_scheduler
start_scheduler()

# Register routes
app.register_blueprint(product_bp, url_prefix="/api/products")
app.register_blueprint(scrape_bp, url_prefix="/api/scrape")
app.register_blueprint(analytics_bp, url_prefix="/api/analytics")

from routes.query_routes import query_bp
app.register_blueprint(query_bp, url_prefix="/api/query")


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "Product Sentiment Analyzer API is running."
    })


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )