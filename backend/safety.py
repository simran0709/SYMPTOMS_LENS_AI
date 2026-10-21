"""Deterministic safety/triage checks for the educational prototype.
These rules are not a diagnosis and do not replace emergency services.
"""

EMERGENCY_COMBINATIONS = [
    {"sharp_chest_pain", "shortness_of_breath"},
    {"sharp_chest_pain", "fainting"},
    {"shortness_of_breath", "fainting"},
    {"severe_chest_pain", "shortness_of_breath"},
]

EMERGENCY_SINGLETONS = {
    "seizure",
    "fainting",
}

URGENT_SINGLETONS = {
    "shortness_of_breath",
    "sharp_chest_pain",
    "severe_chest_pain",
    "blood_in_stool",
    "blood_in_urine",
}


def assess_safety(matched_symptoms: list[str]) -> dict:
    matched = {str(x).replace(" ", "_").lower() for x in (matched_symptoms or [])}
    if any(combo.issubset(matched) for combo in EMERGENCY_COMBINATIONS) or matched & EMERGENCY_SINGLETONS:
        return {
            "urgency": "Emergency",
            "crisis": True,
            "message": "This symptom pattern can require emergency medical assessment. Use your local emergency service now, especially if symptoms are severe or worsening.",
        }
    if matched & URGENT_SINGLETONS:
        return {
            "urgency": "Urgent",
            "crisis": False,
            "message": "This symptom pattern may need prompt professional medical assessment. Seek urgent care if severe, sudden, or worsening.",
        }
    return {
        "urgency": "Routine",
        "crisis": False,
        "message": "For severe, sudden, or rapidly worsening symptoms, seek professional medical care rather than relying on this educational tool.",
    }
