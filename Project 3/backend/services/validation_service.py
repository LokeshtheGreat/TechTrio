"""
Input Validation Service for Heart Disease Risk Estimator.

Validates input features for both Major (Random Forest Pipeline)
and Minor (Keras Neural Network) models.
"""

from typing import Any, Dict, List, Tuple
import numpy as np


# =============================================================================
# MAJOR MODEL SPECIFICATIONS
# =============================================================================

MAJOR_CATEGORICAL_ALLOWED = {
    "Sex": {"M", "F"},
    "ChestPainType": {"ATA", "NAP", "ASY", "TA"},
    "RestingECG": {"Normal", "ST", "LVH"},
    "ExerciseAngina": {"Y", "N"},
    "ST_Slope": {"Up", "Flat", "Down"},
}

MAJOR_NUMERIC_BOUNDS = {
    "Age": (18.0, 120.0),
    "RestingBP": (50.0, 260.0),
    "MaxHR": (40.0, 250.0),
    "Oldpeak": (-5.0, 10.0),
}


def validate_major_input(data: Any) -> Tuple[bool, Dict[str, str]]:
    """
    Validate input data for the Major Random Forest model.

    Expected Schema:
      - Age: numeric (18-120)
      - Sex: 'M' or 'F'
      - ChestPainType: 'ATA', 'NAP', 'ASY', 'TA'
      - RestingBP: numeric (50-260)
      - Cholesterol: numeric (0-800) or missing/None/empty (median-imputed)
      - FastingBS: 0 or 1
      - RestingECG: 'Normal', 'ST', 'LVH'
      - MaxHR: numeric (40-250)
      - ExerciseAngina: 'Y' or 'N'
      - Oldpeak: numeric (-5.0 to 10.0)
      - ST_Slope: 'Up', 'Flat', 'Down'

    Returns:
        Tuple of (is_valid: bool, errors: Dict[str, str])
    """
    if not isinstance(data, dict):
        return False, {"body": "Request payload must be a JSON object."}

    errors: Dict[str, str] = {}

    # Required fields (Cholesterol is optional because training pipeline imputes median)
    required_fields = [
        "Age", "Sex", "ChestPainType", "RestingBP", "FastingBS",
        "RestingECG", "MaxHR", "ExerciseAngina", "Oldpeak", "ST_Slope"
    ]

    for field in required_fields:
        if field not in data or data[field] is None or data[field] == "":
            errors[field] = f"Field '{field}' is required."

    # Validate numeric bounds
    for field, (min_val, max_val) in MAJOR_NUMERIC_BOUNDS.items():
        if field in data and data[field] is not None and data[field] != "":
            try:
                val = float(data[field])
                if not (min_val <= val <= max_val):
                    errors[field] = f"Field '{field}' must be between {min_val} and {max_val}."
            except (ValueError, TypeError):
                errors[field] = f"Field '{field}' must be a valid number."

    # Validate Cholesterol (if provided)
    if "Cholesterol" in data and data["Cholesterol"] not in (None, "", "null", np.nan):
        try:
            chol = float(data["Cholesterol"])
            if not (0.0 <= chol <= 800.0):
                errors["Cholesterol"] = "Field 'Cholesterol' must be between 0 and 800 mg/dL if provided."
        except (ValueError, TypeError):
            errors["Cholesterol"] = "Field 'Cholesterol' must be a valid number or null."

    # Validate FastingBS (0 or 1)
    if "FastingBS" in data and data["FastingBS"] not in (None, ""):
        try:
            fbs = int(data["FastingBS"])
            if fbs not in (0, 1):
                errors["FastingBS"] = "Field 'FastingBS' must be 0 (<= 120 mg/dL) or 1 (> 120 mg/dL)."
        except (ValueError, TypeError):
            errors["FastingBS"] = "Field 'FastingBS' must be an integer (0 or 1)."

    # Validate Categoricals
    for field, allowed in MAJOR_CATEGORICAL_ALLOWED.items():
        if field in data and data[field] not in (None, ""):
            val_str = str(data[field]).strip()
            if val_str not in allowed:
                errors[field] = f"Field '{field}' must be one of: {sorted(list(allowed))}."

    is_valid = len(errors) == 0
    return is_valid, errors


def sanitize_major_input(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize validated Major input into types expected by the pipeline.
    """
    chol = data.get("Cholesterol")
    if chol in (None, "", "null", np.nan):
        chol_val = np.nan
    else:
        chol_val = float(chol)

    return {
        "Age": int(round(float(data["Age"]))),
        "Sex": str(data["Sex"]).strip(),
        "ChestPainType": str(data["ChestPainType"]).strip(),
        "RestingBP": float(data["RestingBP"]),
        "Cholesterol": chol_val,
        "FastingBS": int(data["FastingBS"]),
        "RestingECG": str(data["RestingECG"]).strip(),
        "MaxHR": float(data["MaxHR"]),
        "ExerciseAngina": str(data["ExerciseAngina"]).strip(),
        "Oldpeak": float(data["Oldpeak"]),
        "ST_Slope": str(data["ST_Slope"]).strip(),
    }


# =============================================================================
# MINOR MODEL SPECIFICATIONS
# =============================================================================

MINOR_CATEGORICAL_ALLOWED = {
    "gender": {1, 2},
    "cholesterol": {1, 2, 3},
    "gluc": {1, 2, 3},
    "smoke": {0, 1},
    "alco": {0, 1},
    "active": {0, 1},
}

MINOR_NUMERIC_BOUNDS = {
    "age": (18.0, 120.0),      # in years (must NOT be in days)
    "height": (100.0, 250.0),  # in cm
    "weight": (30.0, 300.0),   # in kg
    "ap_hi": (50.0, 260.0),    # systolic blood pressure
    "ap_lo": (30.0, 180.0),    # diastolic blood pressure
}


def validate_minor_input(data: Any) -> Tuple[bool, Dict[str, str]]:
    """
    Validate input data for the Minor Keras Neural Network model.

    Expected Schema:
      - age: numeric in years (18-120)
      - gender: 1 (female) or 2 (male)
      - height: numeric in cm (100-250)
      - weight: numeric in kg (30-300)
      - ap_hi: systolic BP (50-260)
      - ap_lo: diastolic BP (30-180)
      - cholesterol: 1 (normal), 2 (above normal), 3 (well above normal)
      - gluc: 1 (normal), 2 (above normal), 3 (well above normal)
      - smoke: 0 or 1
      - alco: 0 or 1
      - active: 0 or 1

    Returns:
        Tuple of (is_valid: bool, errors: Dict[str, str])
    """
    if not isinstance(data, dict):
        return False, {"body": "Request payload must be a JSON object."}

    errors: Dict[str, str] = {}

    expected_fields = [
        "age", "gender", "height", "weight", "ap_hi", "ap_lo",
        "cholesterol", "gluc", "smoke", "alco", "active"
    ]

    for field in expected_fields:
        if field not in data or data[field] is None or data[field] == "":
            errors[field] = f"Field '{field}' is required."

    # Validate numeric continuous bounds
    for field, (min_val, max_val) in MINOR_NUMERIC_BOUNDS.items():
        if field in data and data[field] not in (None, ""):
            try:
                val = float(data[field])
                if not (min_val <= val <= max_val):
                    errors[field] = f"Field '{field}' must be between {min_val} and {max_val}."
            except (ValueError, TypeError):
                errors[field] = f"Field '{field}' must be a valid number."

    # Validate blood pressure relationship if both valid
    if "ap_hi" in data and "ap_lo" in data and "ap_hi" not in errors and "ap_lo" not in errors:
        try:
            hi = float(data["ap_hi"])
            lo = float(data["ap_lo"])
            if lo >= hi:
                errors["ap_lo"] = "Diastolic blood pressure (ap_lo) must be lower than systolic (ap_hi)."
        except (ValueError, TypeError):
            pass

    # Validate categorical integers
    for field, allowed in MINOR_CATEGORICAL_ALLOWED.items():
        if field in data and data[field] not in (None, ""):
            try:
                val = int(data[field])
                if val not in allowed:
                    errors[field] = f"Field '{field}' must be one of: {sorted(list(allowed))}."
            except (ValueError, TypeError):
                errors[field] = f"Field '{field}' must be an integer ({sorted(list(allowed))})."

    is_valid = len(errors) == 0
    return is_valid, errors


def sanitize_minor_input(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize validated Minor input into exact DataFrame format expected by preprocessor.
    """
    return {
        "age": float(data["age"]),
        "gender": int(data["gender"]),
        "height": float(data["height"]),
        "weight": float(data["weight"]),
        "ap_hi": int(round(float(data["ap_hi"]))),
        "ap_lo": int(round(float(data["ap_lo"]))),
        "cholesterol": int(data["cholesterol"]),
        "gluc": int(data["gluc"]),
        "smoke": int(data["smoke"]),
        "alco": int(data["alco"]),
        "active": int(data["active"]),
    }
