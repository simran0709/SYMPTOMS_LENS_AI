from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def profile(gender="Female", language="en-US", age=21):
    return {"age": age, "gender": gender, "conditions": "", "allergies": "", "medications": "", "language": language, "mobile": "", "cycle": {"lastPeriod": "", "cycleLength": 28, "duration": 5}}


def test_age_is_strict_integer_everywhere():
    base = {"symptoms": "I have headache and fever", "profile": profile()}
    assert client.post("/analyze", json=base).status_code == 200
    assert client.post("/analyze", json={**base, "profile": profile(age="21")}).status_code == 422
    assert client.post("/followups", json={"symptoms": base["symptoms"], "profile": profile(age="21")}).status_code == 422
    assert client.post("/analyze/batch", json=[base, base]).status_code == 200
    assert client.post("/analyze/batch", json=[{**base, "profile": profile(age="21")}]).status_code == 422


def test_age_range():
    body = {"symptoms": "I have headache and fever", "profile": profile(age=1)}
    assert client.post("/analyze", json=body).status_code == 200
    body["profile"] = profile(age=120)
    assert client.post("/analyze", json=body).status_code == 200
    for age in [0, 121, -1]:
        body["profile"] = profile(age=age)
        assert client.post("/analyze", json=body).status_code == 422


def test_followup_present_is_strict_boolean():
    base = {"symptoms": "I have headache", "profile": profile()}
    for value in ["yes", "no", "true", "false", 1, 0, None]:
        body = {**base, "followups": [{"symptom": "nausea", "present": value}]}
        assert client.post("/analyze", json=body).status_code == 422
    for value in [True, False]:
        body = {**base, "followups": [{"symptom": "nausea", "present": value}]}
        assert client.post("/analyze", json=body).status_code == 200


def test_conflicting_followups_rejected_and_identical_duplicates_allowed():
    base = {"symptoms": "I have headache", "profile": profile()}
    conflict = {**base, "followups": [{"symptom": "nausea", "present": True}, {"symptom": "nausea", "present": False}]}
    r = client.post("/analyze", json=conflict)
    assert r.status_code == 422 and r.json()["detail"]["code"] == "conflicting_followup"
    duplicate = {**base, "followups": [{"symptom": "nausea", "present": True}, {"symptom": "nausea", "present": True}]}
    assert client.post("/analyze", json=duplicate).status_code == 200


def test_unknown_followup_rejected():
    r = client.post("/analyze", json={"symptoms": "I have headache", "profile": profile(), "followups": [{"symptom": "made_up_symptom", "present": True}]})
    assert r.status_code == 422 and r.json()["detail"]["code"] == "unsupported_followup_symptom"


def test_followups_reject_empty_whitespace_unknown_and_malformed_followups():
    base = {"profile": profile()}
    for symptoms in ["", "   ", "I like playing football."]:
        r = client.post("/followups", json={**base, "symptoms": symptoms})
        assert r.status_code == 422
    for value in [None, {}, 123, "invalid"]:
        r = client.post("/followups", json={**base, "symptoms": "I have headache", "followups": value})
        assert r.status_code == 422


def test_headache_fever_maps_to_brain_in_all_supported_languages():
    cases = [
        "I have headache and fever",
        "मुझे सिरदर्द और बुखार है",
        "ನನಗೆ ತಲೆನೋವು ಮತ್ತು ಜ್ವರ ಇದೆ",
    ]
    for text in cases:
        r = client.post("/analyze", json={"symptoms": text, "profile": profile()})
        assert r.status_code == 200
        data = r.json()
        assert data["primary_condition"] != "No dataset prediction"
        assert data["organ_affected"] == "Brain"
        assert data["body_system"] == "Neurological"
        assert "Brain" in data["mechanism"]


def test_stomach_takes_priority_over_generic_cough_for_mixed_input():
    r = client.post("/analyze", json={"symptoms": "I have stomach pain and cough", "profile": profile()})
    assert r.status_code == 200
    data = r.json()
    assert data["primary_condition"] != "No dataset prediction"
    assert data["organ_affected"] == "Stomach"
    assert data["body_system"] == "Digestive"
    assert "Stomach" in data["mechanism"]


def test_batch_is_raw_list_and_limit_is_enforced():
    one = {"symptoms": "I have headache and fever", "profile": profile()}
    assert client.post("/analyze/batch", json=[one]).status_code == 200
    assert client.post("/analyze/batch", json=[one] * 5).status_code == 200
    assert client.post("/analyze/batch", json=[one] * 6).status_code == 413
    assert client.post("/analyze/batch", json=[]).status_code == 422


def test_natural_urinary_phrase_is_recognized_without_fake_rf_diagnosis():
    r = client.post("/analyze", json={"symptoms": "It burns when I pee", "profile": profile()})
    assert r.status_code == 200
    data = r.json()
    assert data["organ_affected"] == "Bladder"
    assert data["primary_condition"] == "No dataset prediction"
    assert "burning urination" in data["recognized_symptoms"]
    assert data["immediate_relief"] != ["Rest and monitor symptoms", "Maintain normal hydration", "Avoid triggers that clearly worsen symptoms"]


def test_organ_specific_educational_content_is_not_identical_for_every_report():
    kidney = client.post("/analyze", json={"symptoms": "I have kidney pain", "profile": profile()}).json()
    stomach = client.post("/analyze", json={"symptoms": "I have stomach pain", "profile": profile()}).json()
    assert kidney["organ_affected"] == "Kidneys"
    assert stomach["organ_affected"] == "Stomach"
    assert kidney["immediate_relief"] != stomach["immediate_relief"]
    assert kidney["foods_to_avoid"] != stomach["foods_to_avoid"]


def test_common_hindi_and_kannada_urinary_phrases_map_to_bladder():
    cases = [
        ("पेशाब करते समय जलन है", "burning urination"),
        ("मूत्र में खून है", "blood in urine"),
        ("ಮೂತ್ರ ಮಾಡುವಾಗ ಉರಿ ಇದೆ", "burning urination"),
        ("ಮೂತ್ರದಲ್ಲಿ ರಕ್ತ ಇದೆ", "blood in urine"),
    ]
    for text, expected in cases:
        r = client.post("/analyze", json={"symptoms": text, "profile": profile()})
        assert r.status_code == 200
        data = r.json()
        assert data["organ_affected"] == "Bladder"
        assert expected in data["recognized_symptoms"]


def test_kidney_phrases_work_in_hindi_and_kannada():
    cases = ["मुझे गुर्दे में दर्द है", "ನನಗೆ ಮೂತ್ರಪಿಂಡದಲ್ಲಿ ನೋವು ಇದೆ"]
    for text in cases:
        r = client.post("/analyze", json={"symptoms": text, "profile": profile()})
        assert r.status_code == 200
        data = r.json()
        assert data["organ_affected"] == "Kidneys"
        assert "kidney pain" in data["recognized_symptoms"]


def test_confidence_display_contract_for_anatomy_only_and_low_evidence_cases():
    kidney = client.post("/analyze", json={"symptoms": "I have kidney pain", "profile": profile()}).json()
    assert kidney["model_confidence"] == 0.0
    assert kidney["confidence_label"] == "No matching RF feature"
    assert "no matching positive feature" in kidney["evidence_note"].lower()

    headache = client.post("/analyze", json={"symptoms": "I have a headache", "profile": profile()}).json()
    assert headache["model_confidence"] > 0.0
    assert headache["primary_condition"] != "Insufficient evidence"
    assert headache["confidence_label"] == "Model prediction available"
    assert "Random Forest" in headache["evidence_note"]
