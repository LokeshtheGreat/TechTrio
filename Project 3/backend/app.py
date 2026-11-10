"""
Flask Application Entrypoint for Heart Disease Risk Estimator Backend.

Configures:
- Prediction routes blueprint
- CORS support for local frontend (http://localhost:5501, http://127.0.0.1:5501)
- Health check endpoints (/health and /api/health)
- Development server running on port 8000
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS

from routes.prediction import prediction_bp
from services.model_service import model_service

app = Flask(__name__)

# Configure CORS specifically for local frontend development origins
CORS(
    app,
    resources={r"/*": {"origins": [
        "http://localhost:5501",
        "http://127.0.0.1:5501",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000"
    ]}},
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)

# Register prediction routes blueprint
app.register_blueprint(prediction_bp)


@app.route("/", methods=["GET"])
def home():
    """Service information root route."""
    return jsonify({
        "message": "Heart Disease Risk Estimator Backend",
        "status": "running",
        "endpoints": {
            "health": ["/health", "/api/health"],
            "predict_major": "/predict/major",
            "predict_minor": ["/predict/minor", "/predict/simple"]
        }
    }), 200


@app.route("/health", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Health check endpoint reporting server status and actual model availability.
    Never reports a model as available if its artifact failed to load.
    """
    health_info = model_service.get_health_status()
    status_code = 200 if health_info["status"] in ("healthy", "degraded") else 503
    return jsonify({
        "status": health_info["status"],
        "service": "Heart Disease Risk Estimator API",
        "models_loaded": health_info["models_loaded"],
        **({"errors": health_info["errors"]} if "errors" in health_info else {})
    }), status_code


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    debug = os.environ.get("FLASK_DEBUG", "0").lower() in ("1", "true")
    print(f"Starting Heart Disease Risk Estimator Backend on port {port} (debug={debug})...")
    app.run(host="0.0.0.0", port=port, debug=debug)
