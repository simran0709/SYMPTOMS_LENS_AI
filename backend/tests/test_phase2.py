import pytest
from fastapi.testclient import TestClient
from main import app
from model import predict_disease_details
from organ_mapping import organ_for_condition, system_for_organ

client = TestClient(app)


def profile(gender="Female", language="en-US"):
    return {"age":21,"gender":gender,"conditions":"","allergies":"","medications":"","language":language,"mobile":"","cycle":{"lastPeriod":"","cycleLength":28,"duration":5}}


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_model_info():
    r = client.get("/model-info")
    assert r.status_code == 200
    data = r.json()
    assert data["train_set_size"] == 197545
    assert data["test_set_size"] == 49400
    assert round(float(data["accuracy"]), 4) == 0.4407


def test_organ_map():
    data = client.get("/organ-map").json()["canonical"]
    assert data["Brain"][1] == "मस्तिष्क"
    assert data["Brain"][2] == "ಮೆದುಳು"
    assert data["Lungs"][1] == "फेफड़े"
    assert data["Lungs"][2] == "ಶ್ವಾಸಕೋಶಗಳು"


@pytest.mark.parametrize("text", [
    "I have fever and cough",
    "मुझे बुखार और खांसी है",
    "ನನಗೆ ಜ್ವರ ಮತ್ತು ಕೆಮ್ಮು ಇದೆ",
])
def test_multilingual_positive_inputs(text):
    p = predict_disease_details(text)
    assert p["condition"]
    assert p["top_predictions"]


@pytest.mark.parametrize("text", [
    "I have fever but no cough",
    "मुझे बुखार है लेकिन खांसी नहीं है",
    "ನನಗೆ ಜ್ವರ ಇದೆ ಆದರೆ ಕೆಮ್ಮು ಇಲ್ಲ",
])
def test_multilingual_negation_inputs(text):
    p = predict_disease_details(text)
    assert p["condition"]
    assert p["negated_symptoms"] or p["matched_symptoms"]


def test_analyze_returns_ml_evidence():
    r = client.post("/analyze", json={"symptoms":"I have a headache and nausea", "profile":profile()})
    assert r.status_code == 200
    data = r.json()
    assert "model_confidence" in data
    assert "top_predictions" in data
    assert "matched_symptoms" in data
    assert "evidence_note" in data


def test_followups_are_context_aware():
    r = client.post("/followups", json={"symptoms":"I have a headache and nausea", "profile":profile()})
    assert r.status_code == 200
    qs = r.json()["questions"]
    assert len(qs) >= 3
    assert any(q["id"] == "duration" for q in qs)
    assert any(q["id"] == "severity" for q in qs)
    assert any(q["id"] == "associated" for q in qs)


def test_cycle_validation_uses_strings():
    r = client.post("/analyze", json={"symptoms":"I have fever and cough", "profile":profile()})
    assert r.status_code == 200


def test_condition_mapping():
    assert organ_for_condition("Tension Headache") == "Brain"
    assert system_for_organ("Brain") == "Neurological"

def test_cycle_numbers_from_frontend_are_accepted():
    r = client.post("/analyze", json={"symptoms":"I have fever and cough", "profile":profile() | {"cycle":{"lastPeriod":"","cycleLength":28,"duration":5}}})
    assert r.status_code == 200


def test_headache_natural_language_alias():
    p = predict_disease_details("My head is aching")
    assert "headache" in p["matched_symptoms"]


def test_negation_does_not_spill_between_hindi_clauses():
    p = predict_disease_details("सिरदर्द नहीं है और बुखार है")
    assert "headache" in p["negated_symptoms"]
    assert "fever" in p["matched_symptoms"]
    assert "fever" not in p["negated_symptoms"]


def test_negation_does_not_spill_between_kannada_clauses():
    p = predict_disease_details("ನನಗೆ ತಲೆನೋವು ಇಲ್ಲ ಮತ್ತು ಜ್ವರ ಇದೆ")
    assert "headache" in p["negated_symptoms"]
    assert "fever" in p["matched_symptoms"]
    assert "fever" not in p["negated_symptoms"]


def test_unsupported_symptom_has_explicit_path():
    r = client.post("/analyze", json={"symptoms":"I have severe tooth pain", "profile":profile()})
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "unsupported_symptoms"


def test_negated_only_input_is_recognized():
    r = client.post("/analyze", json={"symptoms":"I do not have fever", "profile":profile()})
    assert r.status_code == 200
    data = r.json()
    assert data["primary_condition"] == "No dataset prediction"
    assert "fever" in data["negated_symptoms"]


def test_emergency_chest_breathing_rule():
    r = client.post("/analyze", json={"symptoms":"I have sharp chest pain and shortness of breath", "profile":profile()})
    assert r.status_code == 200
    assert r.json()["urgency"] == "Emergency"
    assert r.json()["crisis"] is True


def test_batch_limit_is_explicit():
    payload = [{"symptoms":"I have fever and cough", "profile":profile()} for _ in range(6)]
    assert client.post("/analyze/batch", json=payload).status_code == 413

def test_followup_structured_answer_is_used_without_question_label_injection():
    body = {"symptoms":"I have a headache", "profile":profile(), "followups":[{"symptom":"nausea", "present":False}]}
    r = client.post("/analyze", json=body)
    assert r.status_code == 200
    data = r.json()
    assert "nausea" in data["negated_symptoms"]
    assert "nausea" not in data["matched_symptoms"]


def test_gender_is_case_insensitive():
    for gender in ["Female", "female", "FEMALE"]:
        p = profile(gender=gender)
        r = client.post("/followups", json={"symptoms":"I have headache", "profile":p})
        assert r.status_code == 200


def test_model_info_has_caveat_and_methodology():
    data = client.get("/model-info").json()
    assert data["num_classes"] == 773
    assert "evaluation_methodology" in data
    assert "not clinical diagnostic accuracy" in data["dataset_caveat"].lower()


def test_natural_english_symptom_aliases_cover_common_phrases():
    cases = {
        "my head hurts": "headache", "feverish": "fever", "my throat hurts": "sore_throat",
        "stuffy nose": "nasal_congestion", "runny nose": "coryza", "feeling dizzy": "dizziness",
        "very tired": "fatigue", "short of breath": "shortness_of_breath", "hard to breathe": "difficulty_breathing",
        "dry cough": "cough", "chest pressure": "sharp_chest_pain", "stomach ache": "sharp_abdominal_pain",
        "burning in my stomach": "burning_abdominal_pain", "heartburn": "regurgitation",
        "throwing up blood": "vomiting_blood", "loose stools": "diarrhea", "back ache": "back_pain",
        "pain in my lower back": "low_back_pain", "stiff neck": "neck_stiffness_or_tightness",
        "shoulder pain": "shoulder_pain", "arm pain": "arm_pain", "finger pain": "hand_or_finger_pain",
        "wrist pain": "wrist_pain", "hip pain": "hip_pain", "leg pain": "leg_pain",
        "knee pain": "knee_pain", "ankle pain": "ankle_pain", "toe pain": "foot_or_toe_pain",
        "groin pain": "groin_pain", "back spasms": "back_cramps_or_spasms", "cannot sleep": "insomnia",
    }
    for phrase, expected in cases.items():
        p = predict_disease_details(phrase)
        assert expected.replace("_", " ") in p["matched_symptoms"], (phrase, p["matched_symptoms"])

def test_location_only_symptoms_are_recognized_without_fake_rf_feature():
    from model import recognized_extra_symptoms
    assert "kidney pain" in recognized_extra_symptoms("I have kidney pain")
    assert "burning urination" in recognized_extra_symptoms("I have burning when I urinate")

def test_analyze_location_only_symptoms_returns_safe_result():
    for phrase, organ in [("I have kidney pain", "Kidneys"), ("I have burning when I urinate", "Bladder")]:
        r = client.post("/analyze", json={"symptoms":phrase, "profile":profile()})
        assert r.status_code == 200
        data = r.json()
        assert data["organ_affected"] == organ
        assert phrase.split()[2] not in data.get("matched_symptoms", [])
        assert data["recognized_symptoms"]
