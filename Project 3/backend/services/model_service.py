"""
Model Service for Heart Disease Risk Estimator.

Loads and serves inference for:
1. Major Model: Serialized scikit-learn Pipeline (Random Forest).
2. Minor Model: Serialized Keras 3 Sequential Neural Network & scikit-learn preprocessor.

Models are loaded once during service initialization.
Paths are resolved relative to this source file.
"""

from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import logging
import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Base paths resolved relative to this file
_SERVICES_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _SERVICES_DIR.parent
_PROJECT_ROOT = _BACKEND_DIR.parent
_MODELS_DIR = _PROJECT_ROOT / "ml" / "models"

MAJOR_MODEL_PATH = _MODELS_DIR / "major_model_rf.joblib"
MINOR_KERAS_PATH = _MODELS_DIR / "minor_model_keras.keras"
MINOR_PREP_PATH = _MODELS_DIR / "minor_preprocessor.pkl"

# Exact raw feature column orders as expected by each model artifact
MAJOR_FEATURE_COLUMNS = [
    "Age",
    "Sex",
    "ChestPainType",
    "RestingBP",
    "Cholesterol",
    "FastingBS",
    "RestingECG",
    "MaxHR",
    "ExerciseAngina",
    "Oldpeak",
    "ST_Slope"
]

MINOR_FEATURE_COLUMNS = [
    "age",
    "gender",
    "height",
    "weight",
    "ap_hi",
    "ap_lo",
    "cholesterol",
    "gluc",
    "smoke",
    "alco",
    "active"
]

# Classification thresholds
MAJOR_DECISION_THRESHOLD = 0.5
MINOR_DECISION_THRESHOLD = 0.5


class ModelService:
    """
    Singleton service managing model lifecycle and inference execution.
    """

    def __init__(self) -> None:
        self.major_pipeline: Optional[Any] = None
        self.minor_model: Optional[Any] = None
        self.minor_preprocessor: Optional[Any] = None

        self.major_load_error: Optional[str] = None
        self.minor_load_error: Optional[str] = None

        self._load_major_model()
        self._load_minor_model()

    def _load_major_model(self) -> None:
        """Load the Major Random Forest scikit-learn Pipeline."""
        try:
            if not MAJOR_MODEL_PATH.exists():
                raise FileNotFoundError(f"Major model artifact not found at {MAJOR_MODEL_PATH}")
            self.major_pipeline = joblib.load(MAJOR_MODEL_PATH)
            logger.info("Major Random Forest model loaded successfully from %s", MAJOR_MODEL_PATH)
        except Exception as exc:
            self.major_pipeline = None
            self.major_load_error = str(exc)
            logger.error("Failed to load Major model: %s", exc)

    def _load_minor_model(self) -> None:
        """Load the Minor Keras Neural Network and scikit-learn Preprocessor."""
        try:
            if not MINOR_KERAS_PATH.exists():
                raise FileNotFoundError(f"Minor Keras artifact not found at {MINOR_KERAS_PATH}")
            if not MINOR_PREP_PATH.exists():
                raise FileNotFoundError(f"Minor preprocessor artifact not found at {MINOR_PREP_PATH}")

            # Lazy import keras to avoid overhead if not available
            import keras
            self.minor_model = keras.models.load_model(MINOR_KERAS_PATH)
            self.minor_preprocessor = joblib.load(MINOR_PREP_PATH)
            logger.info("Minor Keras model & preprocessor loaded successfully.")
        except Exception as exc:
            self.minor_model = None
            self.minor_preprocessor = None
            self.minor_load_error = str(exc)
            logger.error("Failed to load Minor model: %s", exc)

    @property
    def is_major_available(self) -> bool:
        return self.major_pipeline is not None

    @property
    def is_minor_available(self) -> bool:
        return self.minor_model is not None and self.minor_preprocessor is not None

    def get_health_status(self) -> Dict[str, Any]:
        """
        Return model availability and operational status.
        Never reports a model as available when loading has failed.
        """
        major_ok = self.is_major_available
        minor_ok = self.is_minor_available

        if major_ok and minor_ok:
            status = "healthy"
        elif major_ok or minor_ok:
            status = "degraded"
        else:
            status = "unavailable"

        details: Dict[str, Any] = {
            "status": status,
            "models_loaded": {
                "major": major_ok,
                "minor": minor_ok,
            }
        }

        errors: Dict[str, str] = {}
        if not major_ok and self.major_load_error:
            errors["major"] = self.major_load_error
        if not minor_ok and self.minor_load_error:
            errors["minor"] = self.minor_load_error

        if errors:
            details["errors"] = errors

        return details

    def predict_major(self, sanitized_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run inference using the Major Random Forest Pipeline.

        Expects sanitized dictionary containing all 11 required columns.
        Raw values are passed directly into a pandas DataFrame since the
        loaded pipeline contains its own ColumnTransformer and imputation steps.
        """
        if not self.is_major_available:
            raise RuntimeError(f"Major model is not available: {self.major_load_error}")

        # Construct DataFrame in the exact training column order
        df = pd.DataFrame([{col: sanitized_data[col] for col in MAJOR_FEATURE_COLUMNS}])

        # The pipeline handles median imputation for Cholesterol and categorical encoding
        proba = self.major_pipeline.predict_proba(df)
        
        # Positive class is label 1
        pos_proba = float(proba[0][1])
        prediction = 1 if pos_proba >= MAJOR_DECISION_THRESHOLD else 0
        predicted_status = "Positive" if prediction == 1 else "Negative"

        return {
            "success": True,
            "prediction": prediction,
            "predicted_status": predicted_status,
            "model_score": round(pos_proba, 4),
            "model_type": "Major Random Forest",
            "disclaimer": "This result is an experimental machine learning prediction, not a clinical or medical diagnosis."
        }

    def predict_minor(self, sanitized_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run inference using the Minor Keras Neural Network.

        Expects sanitized dictionary with age in years.
        Applies preprocessor once, then executes Keras model prediction.
        """
        if not self.is_minor_available:
            raise RuntimeError(f"Minor model is not available: {self.minor_load_error}")

        # Construct DataFrame in exact column order (age is already in years)
        df = pd.DataFrame([{col: sanitized_data[col] for col in MINOR_FEATURE_COLUMNS}])

        # Apply preprocessor once
        transformed = self.minor_preprocessor.transform(df)

        # Run Keras inference
        raw_pred = self.minor_model.predict(transformed, verbose=0)
        pos_proba = float(raw_pred[0][0])

        prediction = 1 if pos_proba >= MINOR_DECISION_THRESHOLD else 0
        predicted_status = "Positive" if prediction == 1 else "Negative"

        return {
            "success": True,
            "prediction": prediction,
            "predicted_status": predicted_status,
            "model_score": round(pos_proba, 4),
            "model_type": "Minor Keras",
            "disclaimer": "This result is an experimental machine learning prediction, not a clinical or medical diagnosis."
        }


# Global singleton instance
model_service = ModelService()
