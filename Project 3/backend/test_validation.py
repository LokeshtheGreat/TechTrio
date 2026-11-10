
from services.validation_service import validate_major_input

sample = {
    "Age": 45,
    "Sex": "M",
    "ChestPainType": "ATA",
    "RestingBP": 120,
    "Cholesterol": 200,
    "FastingBS": 0,
    "RestingECG": "Normal",
    "MaxHR": 160,
    "ExerciseAngina": "N",
    "Oldpeak": 0.0,
    "ST_Slope": "Up"
}

valid, errors = validate_major_input(sample)

print("Valid:", valid)
print("Errors:", errors)
