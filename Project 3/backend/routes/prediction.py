"""
Prediction Routes Blueprint for Heart Disease Risk Estimator.

Exposes:
- POST /predict/major: Random Forest clinical pipeline
- POST /predict/minor: Keras Neural Network screening pipeline
- POST /predict/simple: Alias for /predict/minor
"""

from flask import Blueprint, request, jsonify
from services.model_service import model_service
from services.validation_service import (
    validate_major_input,
    sanitize_major_input,
    validate_minor_input,
    sanitize_minor_input
)

prediction_bp = Blueprint("prediction", __name__)


@prediction_bp.route("/predict/major", methods=["POST"])
def predict_major():
    """
    Handle Major (Random Forest) prediction requests.
    Expects 11 clinical features.
    """
    if not request.is_json:
        return jsonify({
            "success": False,
            "error": "Request body must be valid JSON with Content-Type: application/json."
        }), 400

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({
            "success": False,
            "error": "Malformed or empty JSON payload."
        }), 400

    # Check model availability first
    if not model_service.is_major_available:
        return jsonify({
            "success": False,
            "error": "Major model is currently unavailable on the server."
        }), 503

    # Input validation
    is_valid, errors = validate_major_input(payload)
    if not is_valid:
        return jsonify({
            "success": False,
            "error": "Input validation failed.",
            "details": errors
        }), 400

    try:
        sanitized = sanitize_major_input(payload)
        result = model_service.predict_major(sanitized)
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({
            "success": False,
            "error": f"An unexpected error occurred during prediction: {str(exc)}"
        }), 500


@prediction_bp.route("/predict/minor", methods=["POST"])
@prediction_bp.route("/predict/simple", methods=["POST"])
def predict_minor():
    """
    Handle Minor (Keras Neural Network) prediction requests.
    Accepts /predict/minor and alias /predict/simple.
    Expects 11 cardiovascular dataset features (age in years).
    """
    if not request.is_json:
        return jsonify({
            "success": False,
            "error": "Request body must be valid JSON with Content-Type: application/json."
        }), 400

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({
            "success": False,
            "error": "Malformed or empty JSON payload."
        }), 400

    # Check model availability
    if not model_service.is_minor_available:
        return jsonify({
            "success": False,
            "error": "Minor model is currently unavailable on the server."
        }), 503

    # Input validation
    is_valid, errors = validate_minor_input(payload)
    if not is_valid:
        return jsonify({
            "success": False,
            "error": "Input validation failed.",
            "details": errors
        }), 400

    try:
        sanitized = sanitize_minor_input(payload)
        result = model_service.predict_minor(sanitized)
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({
            "success": False,
            "error": f"An unexpected error occurred during prediction: {str(exc)}"
        }), 500
