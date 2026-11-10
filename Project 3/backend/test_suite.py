"""
Comprehensive Backend Test Suite for Heart Disease Risk Estimator.

Tests:
1. Backend starts successfully and initializes Flask app.
2. Both model artifacts load into memory.
3. Major valid input returns a valid prediction.
4. Minor valid input returns a valid prediction.
5. Major invalid categorical input is rejected with 400.
6. Minor missing input is rejected with 400.
7. Missing Major cholesterol is handled gracefully via pipeline median imputation.
8. Malformed / non-JSON requests are rejected with 400.
9. Health endpoints report actual model availability.
10. Response structure matches agreed contract across all endpoints.
"""

import sys
import unittest
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app import app
from services.model_service import model_service
from services.validation_service import (
    validate_major_input,
    validate_minor_input,
    sanitize_major_input,
    sanitize_minor_input
)


class TestHeartDiseaseBackend(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()
        cls.app = app

    def test_01_backend_starts_and_health_reports_models(self):
        """Test 1 & 9: Health endpoints report actual model availability."""
        for endpoint in ["/health", "/api/health"]:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 200, f"Failed at {endpoint}")
            data = response.get_json()
            self.assertEqual(data["status"], "healthy")
            self.assertEqual(data["service"], "Heart Disease Risk Estimator API")
            self.assertTrue(data["models_loaded"]["major"])
            self.assertTrue(data["models_loaded"]["minor"])

    def test_02_both_model_artifacts_loaded(self):
        """Test 2: Both model artifacts are loaded into the service singleton."""
        self.assertTrue(model_service.is_major_available, "Major model pipeline failed to load")
        self.assertTrue(model_service.is_minor_available, "Minor model / preprocessor failed to load")
        self.assertIsNotNone(model_service.major_pipeline)
        self.assertIsNotNone(model_service.minor_model)
        self.assertIsNotNone(model_service.minor_preprocessor)

    def test_03_major_valid_input_prediction(self):
        """Test 3 & 10: Major valid input returns a prediction matching contract."""
        payload = {
            "Age": 55,
            "Sex": "M",
            "ChestPainType": "ASY",
            "RestingBP": 140,
            "Cholesterol": 240,
            "FastingBS": 1,
            "RestingECG": "ST",
            "MaxHR": 130,
            "ExerciseAngina": "Y",
            "Oldpeak": 1.5,
            "ST_Slope": "Flat"
        }
        response = self.client.post("/predict/major", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()

        self.assertTrue(data["success"])
        self.assertIn(data["prediction"], [0, 1])
        self.assertIn(data["predicted_status"], ["Positive", "Negative"])
        self.assertIsInstance(data["model_score"], (int, float))
        self.assertTrue(0.0 <= data["model_score"] <= 1.0)
        self.assertEqual(data["model_type"], "Major Random Forest")
        self.assertIn("disclaimer", data)

    def test_04_minor_valid_input_prediction(self):
        """Test 4 & 10: Minor valid input returns a prediction matching contract."""
        payload = {
            "age": 50.0,
            "gender": 1,
            "height": 165.0,
            "weight": 68.0,
            "ap_hi": 120,
            "ap_lo": 80,
            "cholesterol": 1,
            "gluc": 1,
            "smoke": 0,
            "alco": 0,
            "active": 1
        }
        for endpoint in ["/predict/minor", "/predict/simple"]:
            response = self.client.post(endpoint, json=payload)
            self.assertEqual(response.status_code, 200, f"Failed at {endpoint}")
            data = response.get_json()

            self.assertTrue(data["success"])
            self.assertIn(data["prediction"], [0, 1])
            self.assertIn(data["predicted_status"], ["Positive", "Negative"])
            self.assertIsInstance(data["model_score"], (int, float))
            self.assertTrue(0.0 <= data["model_score"] <= 1.0)
            self.assertEqual(data["model_type"], "Minor Keras")
            self.assertIn("disclaimer", data)

    def test_05_major_invalid_categorical_rejected(self):
        """Test 5: Major invalid categorical values are rejected with 400."""
        invalid_payloads = [
            {"Sex": "X"},
            {"ChestPainType": "UNKNOWN"},
            {"RestingECG": "INVALID"},
            {"ExerciseAngina": "MAYBE"},
            {"ST_Slope": "DIAGONAL"},
        ]
        base_valid = {
            "Age": 50, "Sex": "M", "ChestPainType": "ATA", "RestingBP": 120,
            "Cholesterol": 200, "FastingBS": 0, "RestingECG": "Normal",
            "MaxHR": 150, "ExerciseAngina": "N", "Oldpeak": 0.0, "ST_Slope": "Up"
        }

        for bad in invalid_payloads:
            payload = {**base_valid, **bad}
            response = self.client.post("/predict/major", json=payload)
            self.assertEqual(response.status_code, 400, f"Expected 400 for {bad}")
            data = response.get_json()
            self.assertFalse(data["success"])
            self.assertIn("details", data)

    def test_06_minor_missing_input_rejected(self):
        """Test 6: Minor payload with missing fields is rejected with 400."""
        incomplete_payload = {
            "age": 45.0,
            "gender": 1,
            # height missing
            # weight missing
            "ap_hi": 120,
            "ap_lo": 80,
            "cholesterol": 1,
            "gluc": 1,
            "smoke": 0,
            "alco": 0,
            "active": 1
        }
        response = self.client.post("/predict/minor", json=incomplete_payload)
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertFalse(data["success"])
        self.assertIn("height", data["details"])
        self.assertIn("weight", data["details"])

    def test_07_missing_major_cholesterol_handled_correctly(self):
        """Test 7: Major input with missing/None cholesterol is accepted and imputed."""
        payload_none_chol = {
            "Age": 60,
            "Sex": "F",
            "ChestPainType": "NAP",
            "RestingBP": 130,
            "Cholesterol": None,  # Explicitly None
            "FastingBS": 0,
            "RestingECG": "Normal",
            "MaxHR": 145,
            "ExerciseAngina": "N",
            "Oldpeak": 0.5,
            "ST_Slope": "Up"
        }
        response = self.client.post("/predict/major", json=payload_none_chol)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertIn(data["prediction"], [0, 1])

        # Also test omitted cholesterol key
        del payload_none_chol["Cholesterol"]
        response2 = self.client.post("/predict/major", json=payload_none_chol)
        self.assertEqual(response2.status_code, 200)
        data2 = response2.get_json()
        self.assertTrue(data2["success"])

    def test_08_malformed_json_rejected(self):
        """Test 8: Malformed or non-JSON payloads are rejected with 400."""
        # Non-JSON content type
        response1 = self.client.post(
            "/predict/major",
            data="not a json",
            content_type="text/plain"
        )
        self.assertEqual(response1.status_code, 400)
        self.assertFalse(response1.get_json()["success"])

        # Empty body
        response2 = self.client.post(
            "/predict/major",
            data="",
            content_type="application/json"
        )
        self.assertEqual(response2.status_code, 400)
        self.assertFalse(response2.get_json()["success"])

    def test_09_root_endpoint_metadata(self):
        """Test root metadata endpoint."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "running")
        self.assertIn("endpoints", data)


if __name__ == "__main__":
    unittest.main(verbosity=2)
