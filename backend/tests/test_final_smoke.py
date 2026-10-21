from fastapi.testclient import TestClient
from main import app
from model import predict_disease_details

client = TestClient(app)


def profile(gender="Female", language="en-US"):
    return {
        "age": 21, "gender": gender, "conditions": "", "allergies": "",
        "medications": "", "language": language, "mobile": "",
        "cycle": {"lastPeriod": "", "cycleLength": 28, "duration": 5},
    }


def test_multilingual_negation_exact_examples():
    cases = [
        "I have fever but no cough",
        "मुझे बुखार है लेकिन खांसी नहीं है",
        "ನನಗೆ ಜ್ವರ ಇದೆ ಆದರೆ ಕೆಮ್ಮು ಇಲ್ಲ",
    ]
    for text in cases:
        p = predict_disease_details(text)
        assert "fever" in p["matched_symptoms"]
        assert "cough" in p["negated_symptoms"]


def test_frontend_style_cycle_numbers_are_accepted():
    r = client.post("/analyze", json={"symptoms": "I have fever and cough", "profile": profile() | {"cycle": {"lastPeriod": "", "cycleLength": 28, "duration": 5}}})
    assert r.status_code == 200


def test_api_never_uses_mock_result_on_unsupported_input():
    r = client.post("/analyze", json={"symptoms": "I have severe tooth pain", "profile": profile()})
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "unsupported_symptoms"


def test_explicit_location_can_drive_anatomy_target_without_changing_rf_condition_field_type():
    r = client.post("/analyze", json={"symptoms": "I have knee pain", "profile": profile()})
    assert r.status_code == 200
    data = r.json()
    assert data["organ_affected"] == "Joints"
