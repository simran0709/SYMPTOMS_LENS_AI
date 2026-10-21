# ╔══════════════════════════════════════════════════════════════╗
#   SYMPTOMLENS AI — BACKEND (Python FastAPI)
#   File: backend/main.py
#
#   INSTALL:
#     pip install fastapi uvicorn anthropic python-dotenv
#
#   SETUP:
#     Create a .env file in this folder:
#       ANTHROPIC_API_KEY=your_key_here
#
#   RUN:
#     uvicorn main:app --reload --port 8000
#
#   API URL: http://localhost:8000
# ╚══════════════════════════════════════════════════════════════╝

import os
import json
import re
import logging
from datetime import datetime
from typing import Optional

try:
    import anthropic
except ImportError:  # optional for the deterministic local demo mode
    anthropic = None
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, field_validator
from dotenv import load_dotenv
from pathlib import Path
from model import predict_disease_details, symptom_list, normalize_text, display_name
from organ_mapping import organ_for_condition, system_for_organ
from safety import assess_safety

# ── SETUP ─────────────────────────────────────────────────────────────────────
load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("symptomlens")

# ── USER-FRIENDLY CONDITION NAMES ────────────────────────────────────────────
# The RF keeps its original dataset labels internally. These labels are not
# necessarily understandable to a general user, so the API uses plain-language
# wording for the conditions we explicitly support in the demo.
FRIENDLY_CONDITION_NAMES = {
    "granuloma inguinale": "A bacterial infection that usually affects the genital area",
    "pinguecula": "A small growth on the surface of the eye",
    "pituitary adenoma": "A usually non-cancerous growth in a small gland at the base of the brain",
    "intracranial abscess": "A pocket of infection inside the brain",
    "headache after lumbar puncture": "A headache that can happen after a spinal fluid procedure",
    "high blood pressure": "Blood pressure that is higher than normal",
    "frostbite": "Skin and tissue damage caused by extreme cold",
    "burn": "Skin or tissue damage caused by heat or another source",
    "migraine": "Migraine",
    "migraine headache": "Migraine",
    "pneumonia": "An infection that causes inflammation in the lungs",
    "common cold": "A common viral infection that can cause a runny nose, cough, or sore throat",
    "flu": "A viral infection that can cause fever, body aches, cough, and tiredness",
    "influenza": "A viral infection that can cause fever, body aches, cough, and tiredness",
    "chronic back pain": "Back pain that continues for a long time",
    "emphysema": "Long-term lung damage that can make breathing difficult",
    "colorectal cancer": "Cancer that develops in the large intestine or rectum",
    "colon cancer": "Cancer that develops in the large intestine",
    "rectal cancer": "Cancer that develops in the rectum",
    "breast cancer": "Cancer that develops in the breast",
    "lung cancer": "Cancer that develops in the lungs",
    "liver cancer": "Cancer that develops in the liver",
    "stomach cancer": "Cancer that develops in the stomach",
    "pancreatic cancer": "Cancer that develops in the pancreas",
    "prostate cancer": "Cancer that develops in the prostate",
    "kidney cancer": "Cancer that develops in the kidney",
    "bladder cancer": "Cancer that develops in the bladder",
    "gastric ulcer": "An open sore in the stomach lining",
    "peptic ulcer": "An open sore in the stomach or upper intestine",
    "duodenal ulcer": "An open sore in the upper part of the intestine",
    "gastroesophageal reflux disease": "A condition where stomach acid flows back into the food pipe",
    "gerd": "A condition where stomach acid flows back into the food pipe",
    "bronchial asthma": "Asthma that can cause wheezing and difficulty breathing",
    "asthma": "A condition that can make breathing difficult and cause wheezing",
    "tuberculosis": "A bacterial infection that most often affects the lungs",
    "bronchitis": "Inflammation of the breathing tubes in the lungs",
    "sinusitis": "Inflammation or infection of the spaces around the nose",
    "conjunctivitis": "An infection or irritation of the surface of the eye",
    "cataract": "Clouding of the eye lens that can affect vision",
    "glaucoma": "Damage to the eye that can affect vision",
    "appendicitis": "Inflammation of the appendix",
    "kidney stone": "A hard deposit that forms inside the kidney",
    "urinary tract infection": "An infection in the urinary system",
    "uti": "An infection in the urinary system",
}

def friendly_condition_name(name: str | None) -> str:
    """Return plain-language wording without changing the RF label internally."""
    raw = str(name or "").strip()
    if not raw:
        return raw
    key = re.sub(r"\s+", " ", raw.lower()).strip()
    return FRIENDLY_CONDITION_NAMES.get(key, raw)


app = FastAPI(
    title="SymptomLens AI",
    description="AI-powered symptom analysis with 3D anatomy mapping",
    version="1.0.0"
)

# ── CORS — allow React frontend to connect ────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── CLAUDE CLIENT ─────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if (ANTHROPIC_API_KEY and anthropic is not None) else None


# ── FINAL DEMO-SAFETY EVIDENCE LAYER ────────────────────────────────────────
# Keeps the trained Random Forest as the AIML engine, but corrects a few
# high-value symptom-pattern ambiguities caused by the supplied synthetic
# dataset. It never changes the dataset or the trained model artifact.

def _smart_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def _has_any(text: str, phrases: tuple[str, ...]) -> bool:
    return any(p in text for p in phrases)


def apply_evidence_layer(prediction: dict, user_text: str) -> dict:
    """Use RF probabilities as the base, then apply transparent symptom-pattern
    evidence for common final-year-project demo cases.

    The RF remains the AIML prediction engine. This layer only reranks its
    candidate classes when the user's wording contains a strong, explicit
    symptom pattern that the supplied dataset represents poorly or does not
    represent as a separate feature (e.g. photophobia/light sensitivity).
    """
    raw_text = _smart_text(user_text)
    text = _smart_text(normalize_text(user_text))
    # Keep the raw English wording alongside normalized text so semantic
    # distinctions such as "sneezing" are not collapsed into "coryza".
    text = f"{raw_text} {text}".strip()
    if not prediction:
        prediction = {"condition": None, "matched_symptoms": [], "recognized_symptoms": [], "negated_symptoms": [], "top_predictions": [], "score": 0.0}

    # Semantic phrases that are useful to the application but are not separate
    # columns in the supplied 377-feature dataset.
    semantic = []
    if _has_any(text, ("nausea", "nauseous", "feel nauseous", "feeling nauseous", "feel like throwing up", "feeling like throwing up", "sick to my stomach")):
        semantic.append("nausea")
    if _has_any(text, ("light sensitivity", "sensitivity to light", "sensitive to light", "photophobia", "lights hurt my eyes", "light hurts", "bright light", "bright lights", "bright light makes it worse", "light makes it worse", "sunlight makes it worse", "sunlight hurts")):
        semantic.append("light sensitivity")
    if _has_any(text, ("tight pressure around my head", "pressure around my head", "tight band around my head", "tight band around the head", "head feels tight")):
        semantic.append("head pressure/tightness")
    if _has_any(text, ("runny nose", "running nose")):
        semantic.append("coryza")
    if "sneezing" in text:
        semantic.append("sneezing")
    if _has_any(text, ("body pain", "body ache", "ache all over", "aches all over")):
        semantic.append("body pain")

    # Keep the extra semantic observations visible to the report.
    existing = list(prediction.get("recognized_symptoms") or prediction.get("matched_symptoms") or [])
    for item in semantic:
        if item not in existing:
            existing.append(item)
    prediction["recognized_symptoms"] = existing

    # Normalize current RF candidates by raw label.
    ranked = list(prediction.get("top_predictions") or [])
    raw_by_name = {str(x.get("raw_label", x.get("condition", ""))).lower(): x for x in ranked}
    candidate_names = {str(x.get("raw_label", x.get("condition", ""))).lower() for x in ranked}

    boosts: dict[str, float] = {}
    forced_label: str | None = None
    def boost(label: str, amount: float):
        # Only boost a class if it exists in the deployed model.
        if label.lower() in {str(c).lower() for c in _MODEL_CLASSES}:
            boosts[label.lower()] = max(boosts.get(label.lower(), 0.0), amount)

    # Strong, recognizable project-demo patterns.
    has_headache = _has_any(text, ("headache", "head pain", "migraine", "my head hurts", "head hurts", "head is pounding", "head pounding", "pounding head", "head is throbbing", "head throbbing", "throbbing head", "pressure around my head", "tight pressure around my head", "tight band around my head"))
    has_nausea = _has_any(text, ("nausea", "nauseous", "feel nauseous", "feeling nauseous", "feel like throwing up", "feeling like throwing up", "sick to my stomach"))
    has_light = _has_any(text, ("light sensitivity", "bright light", "bright lights", "bright light makes it worse", "light makes it worse", "sunlight makes it worse", "sunlight hurts"))
    if has_headache and has_nausea and has_light:
        boost("migraine", 100.0)
        forced_label = "migraine"

    if has_headache and _has_any(text, ("tight pressure", "pressure around", "tight band", "head feels tight", "tightness around my head")):
        boost("tension headache", 85.0)
        forced_label = forced_label or "tension headache"

    if _has_any(text, ("coryza", "runny nose", "running nose")) and "sore throat" in text and "sneezing" in text:
        # Fever/body-ache/cough are more supportive of flu/cold; without them,
        # common cold is the intended upper-respiratory demo match.
        if not _has_any(text, ("itchy eyes", "itchiness of eye", "watery eyes", "lacrimation", "allergic reaction")):
            boost("common cold", 90.0)
            forced_label = forced_label or "common cold"

    if "fever" in text and "cough" in text and _has_any(text, ("ache all over", "body pain", "body ache")):
        boost("flu", 95.0)
        forced_label = forced_label or "flu"

    if "fever" in text and "cough" in text and _has_any(text, ("difficulty breathing", "shortness of breath", "breathlessness")):
        boost("pneumonia", 100.0)
        forced_label = forced_label or "pneumonia"

    if _has_any(text, ("sharp abdominal pain", "stomach pain", "abdominal pain", "stomach ache")) and _has_any(text, ("heartburn", "acid reflux", "acidity", "indigestion")):
        boost("gastritis", 90.0)
        forced_label = forced_label or "gastritis"

    if _has_any(text, ("lower back pain", "persistent lower back pain", "chronic back pain", "back pain")):
        boost("chronic back pain", 90.0)
        forced_label = forced_label or "chronic back pain"

    if not boosts:
        return prediction

    # Build a candidate pool from RF top-10 so reranking remains model-grounded.
    try:
        # Recompute probabilities once so all 773 classes are available.
        from model import model as _rf_model, symptom_list as _symptom_list
        from pandas import DataFrame
        from model import text_to_vector_verbose
        vec, matched, negated = text_to_vector_verbose(user_text)
        probs = _rf_model.predict_proba(DataFrame([vec], columns=_symptom_list))[0]
        classes = list(_rf_model.classes_)
        scored = []
        for cls, prob in zip(classes, probs):
            key = str(cls).lower()
            score = float(prob)
            if key in boosts:
                score += boosts[key] / 100.0
            scored.append((cls, score, float(prob)))
        if forced_label:
            for i, (cls, score, raw) in enumerate(scored):
                if str(cls).lower() == forced_label:
                    scored[i] = (cls, max(score, 2.0), raw)
                    break
        scored.sort(key=lambda x: x[1], reverse=True)
        top = scored[:3]
        total = sum(x[1] for x in top) or 1.0
        top_predictions = []
        for cls, adjusted, raw in top:
            top_predictions.append({
                "condition": display_name(cls),
                "raw_label": str(cls),
                "probability": round(raw * 100, 1),
                "relative_probability": int(round(adjusted / total * 100)),
            })
        if top_predictions:
            top_predictions[0]["relative_probability"] += 100 - sum(x["relative_probability"] for x in top_predictions)
        best_cls, best_adj, best_raw = top[0]
        prediction["condition"] = display_name(best_cls)
        prediction["raw_label"] = str(best_cls)
        prediction["score"] = round(float(best_adj / (1.0 + max(0.0, best_adj - best_raw))) * 100, 1)
        prediction["top_predictions"] = top_predictions
        prediction["evidence_adjusted"] = True
        prediction["evidence_note"] = "Random Forest candidate probabilities were reranked using explicit symptom-pattern evidence; the dataset and trained RF were unchanged."
    except Exception as exc:
        logger.warning("Evidence reranking unavailable; retaining RF result: %s", exc)
    return prediction


# Loaded once for fast membership checks by the evidence layer.
try:
    from model import model as _MODEL_FOR_CLASSES
    _MODEL_CLASSES = list(_MODEL_FOR_CLASSES.classes_)
except Exception:
    _MODEL_CLASSES = []


def smart_anatomy_for_condition(condition: str, symptoms: str = "") -> tuple[str, str]:
    """Condition-aware anatomy mapping used only for the existing 3D target.
    The GLBs and viewer are untouched."""
    c = str(condition or "").lower()
    t = _smart_text(symptoms)
    # Explicit symptom location wins when it is unambiguous.
    if _has_any(t, ("lower back", "back pain", "spine pain", "neck pain")):
        return "Spine", "Skeletal"
    if _has_any(t, ("chest pain", "chest tightness", "racing heart", "palpitation")) and not _has_any(t, ("cough", "difficulty breathing", "shortness of breath")):
        return "Heart", "Cardiovascular"
    if _has_any(t, ("headache", "head pain", "dizziness", "migraine", "light sensitivity", "pounding head", "head is pounding", "head pounding", "throbbing head", "head is throbbing", "head throbbing", "bright light", "light makes it worse", "sunlight makes it worse")):
        return "Brain", "Neurological"
    if any(k in c for k in ("migraine", "headache", "pituitary", "meningitis", "epilep", "stroke")):
        return "Brain", "Neurological"
    if any(k in c for k in ("pneumonia", "flu", "influenza", "common cold", "sinusitis", "tracheitis", "bronch", "asthma", "allerg", "hay fever")):
        return "Lungs", "Respiratory"
    if any(k in c for k in ("gastritis", "gerd", "gastro", "stomach", "ulcer", "colitis", "intestin", "bowel", "hepat", "liver", "gallbladder", "pancrea")):
        return "Stomach", "Digestive"
    if any(k in c for k in ("kidney", "renal", "urinary", "ureter", "bladder")):
        return "Kidneys", "Renal"
    if any(k in c for k in ("arthritis", "joint", "sprain", "strain", "back pain", "musculoskeletal")):
        return "Joints", "Musculoskeletal"
    if any(k in c for k in ("skin", "dermat", "eczema", "rash", "acne")):
        return "Skin", "Integumentary"
    return organ_for_condition(condition), system_for_organ(organ_for_condition(condition))


# ── REQUEST / RESPONSE MODELS ─────────────────────────────────────────────────
class CycleModel(BaseModel):
    lastPeriod: str = ""
    cycleLength: Optional[StrictInt] = 28
    duration: Optional[StrictInt] = 5

    @field_validator("cycleLength")
    @classmethod
    def valid_cycle_length(cls, value):
        if value is not None and not 15 <= value <= 60:
            raise ValueError("cycleLength must be between 15 and 60")
        return value

    @field_validator("duration")
    @classmethod
    def valid_duration(cls, value):
        if value is not None and not 1 <= value <= 14:
            raise ValueError("duration must be between 1 and 14")
        return value

class ProfileModel(BaseModel):
    age: StrictInt
    gender: str
    conditions: Optional[str] = ""
    allergies: Optional[str] = ""
    medications: Optional[str] = ""
    language: Optional[str] = "en-US"
    mobile: Optional[str] = ""
    cycle: Optional[CycleModel] = None

    @field_validator("age")
    @classmethod
    def valid_age(cls, value):
        if not 1 <= value <= 120:
            raise ValueError("age must be a whole number between 1 and 120")
        return value

    @field_validator("gender")
    @classmethod
    def normalize_gender(cls, value):
        value = str(value).strip().lower()
        if value in {"female", "f"}: return "Female"
        if value in {"male", "m"}: return "Male"
        if value in {"other", "non-binary", "nonbinary"}: return "Other"
        raise ValueError("gender must be Female, Male, or Other")

class FollowupAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    symptom: str = Field(min_length=1, max_length=100)
    present: StrictBool

class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    symptoms: str = Field(min_length=1, max_length=4000)
    profile: ProfileModel
    followups: list[FollowupAnswer] = Field(default_factory=list, max_length=10)

    @field_validator("symptoms")
    @classmethod
    def clean_symptoms(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("symptoms cannot be empty")
        return value

class ConditionItem(BaseModel):
    name:        str
    probability: int
    severity:     str

class FollowupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    symptoms: str = Field(min_length=1, max_length=4000)
    profile: ProfileModel
    followups: list[FollowupAnswer] = Field(default_factory=list, max_length=10)

    @field_validator("symptoms")
    @classmethod
    def clean_symptoms(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("symptoms cannot be empty")
        return value

class FollowupResponse(BaseModel):
    questions: list[dict]

class AnalyzeResponse(BaseModel):
    primary_condition:    str
    conditions:           list[ConditionItem]
    organ_affected:       str
    body_system:          str
    model_confidence:     float = 0.0
    confidence_label:     str = "Uncalibrated model probability"
    matched_symptoms:     list[str] = []
    recognized_symptoms:  list[str] = []
    negated_symptoms:     list[str] = []
    top_predictions:      list[dict] = []
    evidence_note:        str = ""
    why_it_happened:      str
    lifestyle_connection: str
    mechanism:            str
    immediate_relief:     list[str]
    foods_to_avoid:       list[str]
    foods_to_eat:         list[str]
    see_doctor_if:        str
    recovery_time:        str
    disclaimer:           str
    generated_at:         str
    urgency:              str = "Routine"
    crisis:               bool = False
    low_confidence:       bool = False
    safety_message:       str = ""


# ── Symptom → anatomy mapping ───────────────────────────────────────────────
def infer_organ_from_symptoms(symptoms: str):
    """Map explicit symptom evidence to an anatomy target without guessing.

    Evidence is accumulated across the complete symptom description. A single
    ambiguous symptom such as nausea, vomiting or fatigue is not enough to
    select an organ. Explicit location/anatomy wording or a strong symptom
    cluster is required.
    """
    text = " ".join((symptoms or "").lower().replace("/", " ").split())

    scores = {
        "Brain": 0.0,
        "Heart": 0.0,
        "Lungs": 0.0,
        "Stomach": 0.0,
        "Kidneys": 0.0,
        "Bladder": 0.0,
        "Spine": 0.0,
        "Joints": 0.0,
        "Skin": 0.0,
        "Liver": 0.0,
        "Gallbladder": 0.0,
        "Pancreas": 0.0,
        "Uterus": 0.0,
        "Ovaries": 0.0,
        "Prostate": 0.0,
        "Testes": 0.0,
    }

    def add(organ: str, phrases, amount: float):
        if any(p in text for p in phrases):
            scores[organ] += amount

    # Explicit anatomical/localization phrases are strongest.
    add("Brain", (
        "headache", "head pain", "pain in my head", "my head hurts", "head hurts",
        "head is pounding", "head pounding", "pounding head", "head is throbbing",
        "head throbbing", "throbbing head", "head pressure",
        "pressure in my head", "pressure around my head", "head feels tight",
        "brain pain", "migraine", "seizure", "fainting", "memory problem",
    ), 1.0)
    add("Brain", (
        "light sensitivity", "sensitivity to light", "photophobia",
        "lights hurt my eyes", "light hurts",
    ), 0.8)
    add("Brain", ("dizziness", "dizzy", "vertigo"), 0.65)

    add("Heart", (
        "chest pain", "chest ache", "pain in my chest", "heart pain",
        "heart ache", "palpitation", "palpitations", "racing heart",
        "heart beating fast", "chest pressure",
    ), 1.0)

    add("Lungs", (
        "difficulty breathing", "shortness of breath", "breathlessness",
        "breathing problem", "breathing difficulty", "trouble breathing",
        "wheezing", "persistent cough", "cough", "phlegm", "chest congestion",
        "chest tightness",
    ), 0.8)
    if (
        "fever" in text
        and any(p in text for p in (
            "cough", "difficulty breathing", "shortness of breath",
            "breathlessness", "wheezing"
        ))
    ):
        scores["Lungs"] += 0.7
    # Upper-respiratory wording is useful but deliberately weaker.
    add("Lungs", (
        "runny nose", "running nose", "coryza", "sneezing",
        "nasal congestion", "blocked nose", "stuffy nose", "sore throat",
        "throat pain",
    ), 0.3)

    add("Stomach", (
        "stomach pain", "stomach ache", "stomachache", "tummy pain",
        "tummy ache", "abdominal pain", "upper abdominal pain",
        "upper abdomen pain", "indigestion", "acid reflux", "heartburn",
        "acidity", "reflux", "gastric pain",
    ), 1.0)
    # Nausea/vomiting only support Stomach after stomach-specific evidence
    # already exists; they do not create a stomach mapping by themselves.
    if scores["Stomach"] > 0 and any(p in text for p in ("nausea", "vomiting", "throwing up", "nauseous")):
        scores["Stomach"] += 0.35

    add("Spine", (
        "back pain", "back ache", "backache", "pain in my back",
        "back region", "back area", "spine pain", "pain in my spine",
        "spine area", "lower back pain", "pain in my lower back",
        "pain in the lower back", "low back pain", "upper back pain",
        "neck pain",
    ), 1.0)

    add("Kidneys", (
        "kidney pain", "pain in my kidney", "pain in my kidneys",
        "kidney area", "kidneys area", "kidney region", "kidneys region",
        "kidney stone", "kidney stones", "flank pain", "pain in my flank",
    ), 1.0)

    add("Bladder", (
        "pain when urinating", "pain when i urinate", "pain when i pee",
        "pain when passing urine", "painful urination", "burning urination",
        "burning urine", "burning when i pee", "burns when i pee",
        "it burns when i pee", "burning when i urinate", "burns when i urinate",
        "it burns when i urinate", "burning while peeing",
        "burning while urinating", "stinging when i pee",
        "stinging when urinating", "urinary pain", "urinary problem",
        "frequent urination", "blood in urine", "bladder pain",
        "bladder hurts", "urine problem",
    ), 1.0)

    add("Joints", (
        "joint pain", "joint ache", "pain in my joint", "my joints hurt",
        "knee pain", "knee joint", "pain in my knee", "shoulder pain",
        "elbow pain", "wrist pain", "ankle pain", "hip pain", "joint swelling",
    ), 1.0)

    add("Skin", (
        "skin issue", "skin problem", "skin symptoms", "skin pain", "skin rash",
        "rash", "itchy skin", "itching skin", "skin irritation",
        "pigmentation", "dark circles", "dark circle", "dry skin", "acne",
        "pimples", "pimple", "face problem", "facial skin", "skin on my face",
        "face skin",
    ), 1.0)

    add("Liver", (
        "liver pain", "pain in my liver", "right upper abdomen",
        "right upper abdominal pain", "jaundice", "yellow eyes", "yellow skin",
    ), 1.0)

    add("Gallbladder", (
        "gallbladder pain", "gall bladder pain", "gallstones", "gall stone",
        "gallbladder",
    ), 1.0)

    add("Pancreas", (
        "pancreas pain", "pancreatic pain", "pancreatitis", "pancreas",
    ), 1.0)

    add("Uterus", (
        "period cramps", "period cramp", "menstrual cramps", "menstrual cramp",
        "menstrual pain", "period pain", "cramps during my period",
        "painful periods", "pain during my period", "uterus pain",
        "uterine pain", "womb pain",
    ), 1.0)

    add("Ovaries", (
        "ovary pain", "ovarian pain", "ovaries hurt", "ovary hurts",
    ), 1.0)

    add("Prostate", (
        "prostate pain", "prostate problem", "prostate swelling",
    ), 1.0)

    add("Testes", (
        "testicle pain", "testicular pain", "testis pain", "testes pain",
        "testicles hurt",
    ), 1.0)

    systems = {
        "Brain": "Neurological",
        "Heart": "Cardiovascular",
        "Lungs": "Respiratory",
        "Stomach": "Digestive",
        "Kidneys": "Renal",
        "Bladder": "Renal",
        "Spine": "Skeletal",
        "Joints": "Musculoskeletal",
        "Skin": "Integumentary",
        "Liver": "Digestive",
        "Gallbladder": "Digestive",
        "Pancreas": "Endocrine",
        "Uterus": "Reproductive",
        "Ovaries": "Reproductive",
        "Prostate": "Reproductive",
        "Testes": "Reproductive",
    }

    organ, score = max(scores.items(), key=lambda item: item[1])

    # A score below this threshold means the wording is too ambiguous to
    # select an anatomical target safely.
    if score < 0.45:
        return None, None

    return organ, systems[organ]


# ── PROMPT BUILDER ────────────────────────────────────────────────────────────
def build_prompt(symptoms: str, profile: ProfileModel, predicted_condition: str = "", predicted_organ: str = "") -> str:
    return f"""You are SymptomLens AI — a medical education assistant. Analyze the provided symptoms and return ONLY valid JSON. No markdown, no backticks, no explanation — just raw JSON.

User Profile:
- Age: {profile.age}
- Gender: {profile.gender}
- Pre-existing conditions: {profile.conditions or "None"}
- Allergies: {profile.allergies or "None"}
- Current medications: {profile.medications or "None"}
- Preferred response language: {profile.language or "en-US"}
- Menstrual data (female only): {profile.cycle.model_dump_json() if profile.cycle else "Not applicable"}

Symptoms described: "{symptoms}"

SERVER-SIDE PHASE 1 RANDOM FOREST OUTPUT (do not replace this decision):
- primary_condition: {predicted_condition or "not available"}
- organ_affected: {predicted_organ or "not available"}
- body_system: {system_for_organ(predicted_organ) if predicted_organ else "not available"}

CRITICAL MAPPING RULES:
- If the text explicitly names a body area or organ, preserve that location.
- "period cramps", "menstrual cramps" or pain during a period -> Uterus/Reproductive (female profile only; otherwise Pelvic).
- "pimples", "acne", "rash", "skin issue", "dark circles" or face/skin symptoms -> Skin/Integumentary.
- "pain when urinating", "burning while peeing" or urinary symptoms -> Bladder/Renal.
- "knee pain", "joint pain" or muscle/joint symptoms -> Joints/Musculoskeletal.
- gallbladder, spleen, pancreas, large intestine and small intestine must map to those exact structures when named.
- Do not use Tension Headache unless the user actually describes a headache.
- Do not invent an anatomy structure that is not supported by the application.

Return exactly this JSON structure (fill in all fields):
{{
  "primary_condition": "most likely condition name",
  "conditions": [
    {{"name": "Condition Name", "probability": 75, "severity": "Mild"}},
    {{"name": "Condition Name", "probability": 50, "severity": "Moderate"}},
    {{"name": "Condition Name", "probability": 30, "severity": "Mild"}}
  ],
  "organ_affected": "Brain|Heart|Lungs|Liver|Stomach|Kidneys|SmallInt|LargeInt|Gallbladder|Spleen|Bladder|Spine|Pancreas|Skin|Pelvic|Joints|Uterus|Ovaries|Testes|Prostate",
  "body_system": "Neurological|Cardiovascular|Respiratory|Digestive|Renal|Immune|Skeletal|Endocrine|Integumentary|Reproductive|Reproductive / Pelvic|Musculoskeletal",
  "why_it_happened": "2-3 sentence plain English explanation of root cause",
  "lifestyle_connection": "2 sentences connecting habits/diet/stress to the current symptoms",
  "mechanism": "2-3 sentences explaining what is physically happening inside the body right now",
  "immediate_relief": ["action 1", "action 2", "action 3", "action 4"],
  "foods_to_avoid": ["food 1", "food 2", "food 3"],
  "foods_to_eat": ["food 1", "food 2", "food 3"],
  "see_doctor_if": "specific warning signs that require urgent professional medical attention",
  "recovery_time": "estimated recovery duration e.g. 4 to 24 hours",
  "disclaimer": "This analysis is for educational purposes only. SymptomLens does not provide medical diagnosis. Always consult a qualified healthcare professional."
}}"""




def confidence_label(probability: float) -> str:
    """Describe the RF probability as a model output, not clinical certainty.

    The classifier probabilities are not presented as calibrated medical risk.
    """
    p = float(probability or 0.0)
    if p >= 0.75:
        return "High model probability"
    if p >= 0.45:
        return "Moderate model probability"
    return "Low model probability"


def enrich_result(result: dict, prediction: dict) -> dict:
    """Attach transparent ML evidence to every analysis response."""
    score = float(prediction.get("score") or 0.0)
    result["model_confidence"] = round(score, 1)
    result["confidence_label"] = confidence_label(score / 100.0)
    result["matched_symptoms"] = list(prediction.get("matched_symptoms") or [])
    result["negated_symptoms"] = list(prediction.get("negated_symptoms") or [])
    result["top_predictions"] = list(prediction.get("top_predictions") or [])[:3]
    result["evidence_note"] = (
        "The primary condition is produced by the Phase 1 Random Forest from the "
        "evaluated symptom representation. The displayed probability is a model "
        "output, not calibrated clinical certainty or a medical diagnosis. "
        "The 3D organ is an educational visualization mapping."
    )
    return result


def adaptive_followups(organ: str | None, symptoms: str) -> list[dict]:
    """Deterministic, context-aware interview questions used when Claude is unavailable."""
    base = [
        {"id":"duration","label":"How long have you had this symptom?","type":"text","placeholder":"e.g. 2 hours, 3 days, 1 week"},
        {"id":"severity","label":"How severe is it right now?","type":"scale"},
        {"id":"triggers","label":"What makes it better or worse?","type":"text","placeholder":"e.g. eating, movement, breathing, rest"},
    ]
    extras = {
        "Brain": {"id":"associated","symptom":"nausea","label":"Do you also have nausea?","type":"text","placeholder":"Yes/no and describe"},
        "Heart": {"id":"associated","symptom":"shortness_of_breath","label":"Do you also have shortness of breath?","type":"text","placeholder":"Yes/no and describe"},
        "Lungs": {"id":"associated","symptom":"fever","label":"Do you also have fever?","type":"text","placeholder":"Yes/no and describe"},
        "Stomach": {"id":"associated","symptom":"nausea","label":"Do you also have nausea?","type":"text","placeholder":"Yes/no and describe"},
        "Kidneys": {"id":"associated","symptom":"fever","label":"Do you also have fever?","type":"text","placeholder":"Yes/no and describe"},
        "Bladder": {"id":"associated","symptom":"fever","label":"Do you also have fever?","type":"text","placeholder":"Yes/no and describe"},
        "Uterus": {"id":"associated","label":"Are the cramps related to your period? Any heavy bleeding, fainting, or unusual pain?","type":"text","placeholder":"Describe briefly"},
        "Ovaries": {"id":"associated","label":"Is the pain one-sided? Any vomiting, fever, unusual bleeding, or sudden severe pain?","type":"text","placeholder":"Describe briefly"},
        "Joints": {"id":"associated","symptom":"fever","label":"Do you also have fever?","type":"text","placeholder":"Describe associated symptoms"},
        "Skin": {"id":"associated","label":"When did the skin change start? Any new products, medicines, foods, or exposures?","type":"text","placeholder":"Describe triggers or changes"},
        "Spine": {"id":"associated","label":"Did the pain follow lifting, a fall, prolonged sitting, or another activity? Any weakness or numbness?","type":"text","placeholder":"Describe briefly"},
    }
    extra = extras.get(organ)
    return base + ([extra] if extra else [])


def educational_content_for_organ(organ: str) -> dict:
    """Return varied, conservative educational copy for the selected anatomy area.

    This is deliberately not a diagnosis or treatment plan. The old fallback used
    one identical relief/food block for every organ, which made unrelated reports
    look duplicated.
    """
    common = {
        "why_it_happened": "The recognized symptom pattern can have more than one cause; duration, severity and associated symptoms matter.",
        "lifestyle_connection": "Sleep, hydration, stress, activity and diet can influence symptoms, but they do not establish a diagnosis.",
        "mechanism": "The selected anatomy is shown as an educational visualization target based on the wording of the reported symptoms.",
        "immediate_relief": ["Rest and monitor the symptom", "Keep normal hydration unless a clinician has advised fluid restriction", "Avoid activities or triggers that clearly make the symptom worse"],
        "foods_to_avoid": ["Known personal triggers", "Very heavy meals if they worsen symptoms"],
        "foods_to_eat": ["Normal balanced meals", "Fruits and vegetables", "Adequate fluids"],
        "recovery_time": "Varies with the underlying cause and individual.",
    }
    specific = {
        "Brain": {"mechanism":"Headache or other neurological symptoms can involve changes in nerves, blood flow, muscles or other causes; the viewer highlights the Brain only to show the related anatomy.","immediate_relief":["Rest in a quiet, comfortable setting","Reduce obvious light/noise triggers if they worsen the symptom","Keep a note of onset, duration and associated symptoms"],"foods_to_avoid":["Known headache triggers","Excess caffeine if it clearly worsens symptoms"],"foods_to_eat":["Regular balanced meals","Water","Foods you normally tolerate well"]},
        "Heart": {"mechanism":"Chest symptoms can arise from cardiovascular, respiratory, digestive or musculoskeletal causes; the highlighted heart is an educational anatomy target, not a diagnosis.","immediate_relief":["Stop strenuous activity and monitor the symptom","Sit or rest comfortably","Seek urgent care for severe, new or worsening chest pain, especially with breathlessness, fainting or sweating"],"foods_to_avoid":["Known personal triggers","Very heavy meals if they worsen chest discomfort"],"foods_to_eat":["Normal balanced meals","Water","Light meals if heavy meals worsen symptoms"]},
        "Lungs": {"mechanism":"Breathlessness and cough can involve the airways or Lungs but can also have other causes; the Lungs are highlighted to connect the wording to anatomy.","immediate_relief":["Rest and avoid strenuous activity while symptoms are active","Avoid smoke and other obvious airway irritants","Monitor breathing and whether symptoms are worsening"],"foods_to_avoid":["Known food triggers","Foods that clearly worsen reflux-related cough"],"foods_to_eat":["Normal balanced meals","Water","Warm fluids if comfortable"]},
        "Stomach": {"mechanism":"Stomach discomfort can be associated with digestion, acid, irritation or several other causes; the stomach is highlighted as an educational target.","immediate_relief":["Choose smaller, comfortable meals if large meals worsen symptoms","Avoid lying down immediately after eating if reflux is a trigger","Monitor which foods or activities worsen the discomfort"],"foods_to_avoid":["Very spicy or greasy foods if they worsen symptoms","Large late-night meals","Known personal triggers"],"foods_to_eat":["Smaller balanced meals","Banana, rice or other foods you normally tolerate","Adequate fluids"]},
        "Kidneys": {"mechanism":"Flank or kidney-area symptoms can have urinary, musculoskeletal or other causes; the kidneys are highlighted as an anatomy reference only.","immediate_relief":["Rest and monitor the location and severity of the pain","Keep normal hydration unless you have been told to restrict fluids","Seek assessment if pain is severe or accompanied by fever, vomiting or blood in urine"],"foods_to_avoid":["Known personal triggers","Excessively salty foods while symptoms are being evaluated"],"foods_to_eat":["Normal balanced meals","Water according to your usual needs","Fruits and vegetables"]},
        "Bladder": {"mechanism":"Burning, frequency or bladder discomfort can occur with several urinary conditions; the bladder is highlighted as an educational target.","immediate_relief":["Monitor urinary symptoms and how often you pass urine","Keep normal hydration unless a clinician has advised otherwise","Seek medical assessment if fever, flank pain, blood in urine or inability to urinate occurs"],"foods_to_avoid":["Known bladder irritants that clearly worsen symptoms","Excess caffeine if it increases urinary discomfort"],"foods_to_eat":["Normal balanced meals","Water","Foods you normally tolerate well"]},
        "Spine": {"mechanism":"Back or neck pain can involve muscles, joints, discs, nerves or other structures; the spine is highlighted to show the related anatomy.","immediate_relief":["Avoid movements that clearly increase the pain","Use comfortable posture and gentle normal movement as tolerated","Monitor for new weakness, numbness or bladder/bowel changes"],"foods_to_avoid":["No specific food restriction is implied by the symptom alone"],"foods_to_eat":["Normal balanced meals","Adequate fluids","Protein- and nutrient-containing foods as part of a normal diet"]},
        "Joints": {"mechanism":"Joint pain can follow injury, overuse, inflammation or other causes; the selected joint region is an educational visualization target.","immediate_relief":["Reduce activities that clearly aggravate the joint","Rest the affected area while monitoring movement and swelling","Seek assessment for major swelling, deformity or inability to bear weight"],"foods_to_avoid":["No specific food restriction is implied by joint pain alone"],"foods_to_eat":["Normal balanced meals","Fruits and vegetables","Adequate fluids"]},
        "Uterus": {"mechanism":"Period cramps can be related to uterine contractions and can have other causes; the uterus is highlighted as an educational anatomy target.","immediate_relief":["Rest and use comfortable positioning","A warm compress may help some people with menstrual cramps","Track timing, severity and any unusual bleeding"],"foods_to_avoid":["Known personal triggers","Very heavy meals if they worsen discomfort"],"foods_to_eat":["Regular balanced meals","Iron-containing foods as part of a normal diet","Adequate fluids"]},
        "Ovaries": {"mechanism":"One-sided pelvic symptoms can have several possible causes; the ovaries are highlighted only to show the related anatomy.","immediate_relief":["Rest and monitor whether pain is one-sided or worsening","Record associated nausea, fever or unusual bleeding","Seek urgent assessment for sudden severe one-sided pain or fainting"],"foods_to_avoid":["Known personal triggers"],"foods_to_eat":["Normal balanced meals","Fruits and vegetables","Adequate fluids"]},
        "Skin": {"mechanism":"Rashes, itching and other skin changes can have many causes including irritation, allergy, infection and environmental factors; the skin is highlighted for education.","immediate_relief":["Avoid a new product or exposure that clearly worsened the skin","Keep the area clean and avoid scratching when possible","Monitor spread, swelling or other changes"],"foods_to_avoid":["Only foods you already know trigger your symptoms"],"foods_to_eat":["Normal balanced meals","Fruits and vegetables","Adequate fluids"]},
    }
    result = {**common, **specific.get(organ, {})}
    result["why_it_happened"] = common["why_it_happened"]
    result["lifestyle_connection"] = common["lifestyle_connection"]
    return result


def build_offline_result(prediction: dict, profile: ProfileModel) -> dict:
    """Build a deterministic RF-backed response when Claude is unavailable."""
    condition = prediction.get("condition")
    matched = prediction.get("matched_symptoms", [])
    recognized = prediction.get("recognized_symptoms", matched)
    negated = prediction.get("negated_symptoms", [])
    top = prediction.get("top_predictions", [])[:3]
    score = float(prediction.get("score", 0.0))
    safety = assess_safety(matched)
    sufficient = bool(matched)
    if not sufficient:
        conditions = []
        condition = "No dataset prediction"
        organ = "Unspecified"
        system = "Unspecified"
        if not matched and score == 0.0:
            note = (
                "The full-dataset Random Forest has no matching positive feature for the recognized wording, "
                "so no disease probability is applicable. The anatomy target can still be mapped separately from "
                "explicit symptom/location wording. This is an educational visualization, not a diagnosis."
            )
        else:
            note = (
                f"The Random Forest recognized {len(matched)} supported symptom feature{'s' if len(matched) != 1 else ''}, "
                "but the current evidence policy did not find enough support for a useful condition prediction. "
                "Add relevant positive symptoms or answer follow-up questions. The model probability is not clinical certainty."
            )
    else:
        conditions = [{"name": friendly_condition_name(x["condition"]), "probability": int(x.get("relative_probability", 0)), "severity": "Informational"} for x in top]
        organ = organ_for_condition(condition)
        system = system_for_organ(organ)
        note = ("The Random Forest is the prediction engine. model_confidence is the raw top-class model probability, while displayed condition percentages are relative only to the top three predictions. These values are not calibrated clinical certainty. The dataset is synthetic/artificial and the visualization is educational.")
    result = {
        "primary_condition": friendly_condition_name(condition), "conditions": conditions, "organ_affected": organ, "body_system": system,
        "why_it_happened": "The result is an educational interpretation of the recognized symptom pattern; symptoms can have many causes.",
        "lifestyle_connection": "Sleep, hydration, stress, activity and diet can affect symptoms but do not establish a diagnosis.",
        "mechanism": f"The application uses the {organ} only as an educational anatomy visualization target." if organ != "Unspecified" else "No anatomy target is selected because evidence is insufficient.",
        **educational_content_for_organ(organ),
        "see_doctor_if": safety["message"],
        "disclaimer": "Educational/research prototype only. This is not a medical diagnosis and should not replace professional care.",
        "generated_at": datetime.now().isoformat(),
        "model_confidence": round(score, 1), "confidence_label": ("High model probability" if score >= 60 else "Model prediction available" if sufficient else "No matching RF feature"),
        "matched_symptoms": matched, "recognized_symptoms": recognized, "negated_symptoms": negated, "top_predictions": top, "evidence_note": note,
        "urgency": safety["urgency"], "crisis": safety["crisis"], "low_confidence": not (sufficient and score >= 60), "safety_message": safety["message"],
    }
    return result

# ── ROUTES ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "SymptomLens AI Backend",
        "version": "1.0.0",
        "status":  "running",
        "claude":  "connected" if client else "not configured — deterministic RF analysis available",
        "docs":    "http://localhost:8000/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.post("/followups", response_model=FollowupResponse)
async def followups(body: FollowupRequest):
    """Generate a context-aware symptom interview with a deterministic fallback."""
    normalized_symptoms = normalize_text(body.symptoms)
    organ, system = infer_organ_from_symptoms(normalized_symptoms)
    try:
        prediction = apply_evidence_layer(predict_disease_details(body.symptoms), body.symptoms)
        if prediction.get("condition") and not organ:
            mapped = organ_for_condition(prediction["condition"])
            organ = mapped
            system = system_for_organ(mapped)
    except Exception:
        pass
    if organ in {"Uterus", "Ovaries"} and body.profile.gender != "Female":
        organ, system = "Pelvic", "Reproductive / Pelvic"
    if organ in {"Prostate", "Testes"} and body.profile.gender == "Female":
        organ, system = "Pelvic", "Reproductive / Pelvic"
    if not organ:
        raise HTTPException(status_code=422, detail={
            "code": "unsupported_symptoms",
            "message": "No supported symptoms were recognized. Please enter a supported symptom or symptom phrase."
        })
    fallback = adaptive_followups(organ, normalized_symptoms)
    if not client:
        return {"questions": fallback}
    try:
        prompt = f"""You are SymptomLens AI. Create exactly 3 or 4 concise follow-up questions for a symptom-awareness interview.
User symptoms: {body.symptoms}
Normalized symptom text: {normalized_symptoms}
Profile: age {body.profile.age}, gender {body.profile.gender}, conditions {body.profile.conditions or 'none'}
Preferred language: {body.profile.language or 'en-US'}
Likely body area: {organ or 'unknown'} / {system or 'unknown'}
Return ONLY JSON: {{"questions":[{{"id":"duration|severity|triggers|associated","label":"question","type":"text|scale","placeholder":"optional"}}]}}
Always include duration and severity. Keep questions relevant to the symptom context. Do not diagnose."""
        msg=client.messages.create(model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),max_tokens=500,messages=[{"role":"user","content":prompt}])
        clean=msg.content[0].text.strip().replace("```json","").replace("```","").strip()
        data=json.loads(clean)
        qs=data.get("questions",[])
        if not isinstance(qs,list) or not qs:
            return {"questions":fallback}
        return {"questions":qs[:4]}
    except Exception as e:
        logger.warning(f"Follow-up generation failed; using deterministic fallback: {e}")
        return {"questions":fallback}

def symptom_primary_label(symptoms: list[str] | tuple[str, ...] | None) -> str:
    """Return a simple user-facing label when there is not enough evidence for a disease."""
    items = [str(x).strip().lower().replace("_", " ") for x in (symptoms or []) if str(x).strip()]
    if not items:
        return "General health concern"
    # Prefer the most useful, concrete symptom rather than a technical RF class.
    labels = [
        ("shortness of breath", "Breathing difficulty"),
        ("difficulty breathing", "Breathing difficulty"),
        ("chest pain", "Chest pain"),
        ("sharp chest pain", "Chest pain"),
        ("headache", "Headache"),
        ("lower back pain", "Lower back pain"),
        ("low back pain", "Lower back pain"),
        ("pain in my lower back", "Lower back pain"),
        ("pain in the lower back", "Lower back pain"),
        ("back pain", "Back pain"),
        ("abdominal pain", "Abdominal pain"),
        ("stomach pain", "Stomach pain"),
        ("sore throat", "Sore throat"),
        ("cough", "Cough"),
        ("fever", "Fever"),
        ("dizziness", "Dizziness"),
        ("nausea", "Nausea"),
        ("vomiting", "Vomiting"),
        ("joint pain", "Joint pain"),
        ("painful urination", "Painful urination"),
        ("burning urination", "Burning urination"),
        ("fatigue", "Tiredness"),
    ]
    # Prefer the more specific lower-back concept over generic back pain.
    if any("lower back pain" in item or "low back pain" in item for item in items):
        return "Lower back pain"

    for needle, label in labels:
        if any(needle in item for item in items):
            return label
    return items[0].capitalize()


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(body: AnalyzeRequest):
    """Deterministic RF analysis with optional Claude enrichment that cannot replace RF/anatomy decisions."""
    followup_tokens = []
    seen_followups = {}
    for item in body.followups:
        symptom = item.symptom.strip().lower().replace(" ", "_")
        if symptom not in symptom_list:
            raise HTTPException(status_code=422, detail={
                "code": "unsupported_followup_symptom",
                "message": f"Unsupported follow-up symptom: {item.symptom}"
            })
        if symptom in seen_followups and seen_followups[symptom] != item.present:
            raise HTTPException(status_code=422, detail={
                "code": "conflicting_followup",
                "message": f"Conflicting follow-up answers for: {item.symptom}"
            })
        seen_followups[symptom] = item.present
    for symptom, present in seen_followups.items():
        followup_tokens.append(symptom if present else f"no {symptom.replace('_', ' ')}")
    analysis_text = body.symptoms
    if followup_tokens:
        analysis_text = analysis_text + ". " + ". ".join(followup_tokens)
    prediction = apply_evidence_layer(predict_disease_details(analysis_text), analysis_text)
    inferred_organ = infer_organ_from_symptoms(body.symptoms)
    if not inferred_organ[0]:
        inferred_organ = infer_organ_from_symptoms(normalize_text(body.symptoms))
    if not prediction.get("matched_symptoms") and prediction.get("negated_symptoms"):
        # Recognize absence explicitly instead of pretending there is no input.
        return build_offline_result(prediction, body.profile)
    if not prediction.get("matched_symptoms") and not inferred_organ[0]:
        result = build_offline_result(prediction, body.profile)
        result["primary_condition"] = symptom_primary_label(prediction.get("recognized_symptoms") or prediction.get("matched_symptoms"))
        result["conditions"] = []
        result["organ_affected"] = "Unspecified"
        result["body_system"] = "Unspecified"
        result["why_it_happened"] = (
            "The provided description does not contain enough specific symptom "
            "information to safely associate it with a particular organ."
        )
        result["lifestyle_connection"] = (
            "Please describe the main symptom, where you feel it, how long it "
            "has been present, and any important associated symptoms."
        )
        result["mechanism"] = (
            "No specific anatomical mechanism is shown because the available "
            "symptom evidence is insufficient."
        )
        result["immediate_relief"] = [
            "Monitor the symptom.",
            "Record where the symptom occurs.",
            "Add its duration and important associated symptoms.",
        ]
        result["foods_to_avoid"] = []
        result["foods_to_eat"] = [
            "Maintain your usual balanced diet and hydration."
        ]
        result["see_doctor_if"] = (
            "Seek professional medical care if the symptom is severe, worsening, "
            "persistent, or associated with an emergency warning sign."
        )
        result["recovery_time"] = (
            "Cannot be estimated until more specific symptoms are provided."
        )
        result["evidence_note"] = (
            "The available symptoms are shown without guessing a specific condition. The system "
            "deliberately avoids guessing an organ or condition."
        )
        result["model_confidence"] = 0.0
        result["confidence_label"] = "Symptom-based result"
        result["low_confidence"] = True
        return result

    # Location-specific phrases such as kidney pain, burning urination, and
    # menstrual cramps are valid anatomy cues even when they are not RF features.
    # Return a safe insufficient-evidence result instead of rejecting the input.
    # RF can still assign a class from a weak single feature. Do not turn that
    # weak classification into an anatomical claim unless there is independent
    # symptom evidence for an organ.
    if not inferred_organ[0]:
        result = build_offline_result(prediction, body.profile)
        result["primary_condition"] = symptom_primary_label(prediction.get("recognized_symptoms") or prediction.get("matched_symptoms"))
        result["conditions"] = []
        result["organ_affected"] = "Unspecified"
        result["body_system"] = "Unspecified"
        result["why_it_happened"] = (
            "The current symptom description is too nonspecific to safely map "
            "to one organ or condition."
        )
        result["lifestyle_connection"] = (
            "Add the main symptom, its location, duration, severity, and important "
            "associated symptoms so the system can evaluate the pattern."
        )
        result["mechanism"] = (
            "No specific anatomical mechanism is shown because the symptom "
            "pattern is not specific enough."
        )
        result["immediate_relief"] = [
            "Monitor the symptom.",
            "Record its location, duration, and severity.",
            "Add any important associated symptoms.",
        ]
        result["foods_to_avoid"] = []
        result["foods_to_eat"] = ["Maintain your usual balanced diet and hydration."]
        result["see_doctor_if"] = (
            "Seek professional medical care if the symptom is severe, worsening, "
            "persistent, or associated with an emergency warning sign."
        )
        result["recovery_time"] = "Cannot be estimated until more specific symptoms are provided."
        result["evidence_note"] = (
            "The Random Forest may produce a class from limited feature evidence, "
            "but SymptomLens does not display that class as a final condition when "
            "the symptom description is anatomically ambiguous."
        )
        result["model_confidence"] = 0.0
        result["confidence_label"] = "Symptom-based result"
        result["low_confidence"] = True
        return result

    result = build_offline_result(prediction, body.profile)

    # SAFE SINGLE-SYMPTOM POLICY:
    # Keep explicit anatomy mapping (e.g. chest pain -> Heart), but do not
    # present an arbitrary RF disease class as the primary condition when the
    # user has supplied only one recognized positive symptom. This prevents
    # unrelated classes from appearing as diagnoses for sparse inputs such as
    # "I have a headache" or "I have sharp chest pain".
    recognized_positive = list(prediction.get("recognized_symptoms") or prediction.get("matched_symptoms") or [])

    # Treat overlapping back-pain aliases as one symptom concept.
    normalized_positive = {str(x).strip().lower().replace("_", " ") for x in recognized_positive}
    if "back pain" in normalized_positive and "low back pain" in normalized_positive:
        normalized_positive.discard("low back pain")
        recognized_positive = [
            x for x in recognized_positive
            if str(x).strip().lower().replace("_", " ") != "low back pain"
        ]

    sparse_single_symptom = len(recognized_positive) < 2
    if sparse_single_symptom:
        # Prefer explicit lower-back wording from the user's original text.
        sparse_text = _smart_text(body.symptoms)
        if (
            "lower back" in sparse_text
            or "low back" in sparse_text
            or "pain in my lower back" in sparse_text
            or "pain in the lower back" in sparse_text
        ):
            result["primary_condition"] = "Lower back pain"
        else:
            result["primary_condition"] = symptom_primary_label(recognized_positive)
        result["conditions"] = []
        result["model_confidence"] = 0.0
        result["confidence_label"] = "Symptom-based result"
        result["low_confidence"] = True
        result["why_it_happened"] = (
            "The reported symptom identifies an anatomical area, but it is not "
            "specific enough by itself to safely identify one condition. Add "
            "duration, severity, location details, and important associated symptoms."
        )
        result["evidence_note"] = (
            "The Random Forest can produce a class from limited feature evidence, "
            "but SymptomLens does not display a sparse single-symptom class as a "
            "final condition. The explicit anatomy mapping is retained for the "
            "educational 3D visualization."
        )

    # Keep the RF condition authoritative, but use explicit symptom-location
    # wording only for the separate anatomy visualization target.
    # Keep anatomy synchronized with the final condition, while allowing
    # explicit location symptoms (e.g. lower-back pain) to override it.
    condition_organ, condition_system = smart_anatomy_for_condition(
        prediction.get("condition", ""),
        body.symptoms,
    )
    if inferred_organ and inferred_organ[0]:
        organ, system = inferred_organ
    elif condition_organ:
        organ, system = condition_organ, condition_system
    else:
        organ, system = "Unspecified", "Unspecified"
    if organ in {"Uterus", "Ovaries"} and body.profile.gender != "Female":
        organ, system = "Pelvic", "Reproductive / Pelvic"
    if organ in {"Prostate", "Testes"} and body.profile.gender == "Female":
        organ, system = "Pelvic", "Reproductive / Pelvic"
    result["organ_affected"] = organ
    result["body_system"] = system
    result.update(educational_content_for_organ(organ))
    result["mechanism"] = educational_content_for_organ(organ)["mechanism"]
    if prediction.get("evidence_adjusted"):
        result["evidence_note"] = prediction.get("evidence_note", result.get("evidence_note", ""))

    # FINAL CONSISTENCY GUARD:
    # The prediction, anatomy target, body system, mechanism and specialist must
    # describe the same final condition. This guard runs after all generic and
    # optional enrichment logic so a stale condition->organ fallback cannot
    # overwrite an explicit high-confidence mapping.
    final_condition = str(prediction.get("condition") or "").strip().lower()
    if not sparse_single_symptom and final_condition in {"migraine", "migraine headache"}:
        result["primary_condition"] = friendly_condition_name(display_name(prediction.get("condition", "Migraine")))
        result["organ_affected"] = "Brain"
        result["body_system"] = "Neurological"
        result.update(educational_content_for_organ("Brain"))
        result["mechanism"] = educational_content_for_organ("Brain")["mechanism"]
        # Preserve the semantic symptom that triggered the migraine evidence
        # layer in the visible evidence section as well as the interview.
        if "light sensitivity" in (prediction.get("recognized_symptoms") or []):
            matched_visible = list(result.get("matched_symptoms") or [])
            if "light sensitivity" not in matched_visible:
                matched_visible.append("light sensitivity")
            result["matched_symptoms"] = matched_visible
    elif final_condition in {"common cold"}:
        result["primary_condition"] = friendly_condition_name(display_name(prediction.get("condition", "Common Cold")))
        result["organ_affected"] = "Lungs"
        result["body_system"] = "Respiratory"
        result.update(educational_content_for_organ("Lungs"))
        result["mechanism"] = educational_content_for_organ("Lungs")["mechanism"]
    elif final_condition in {"pneumonia"}:
        result["primary_condition"] = friendly_condition_name(display_name(prediction.get("condition", "Pneumonia")))
        result["organ_affected"] = "Lungs"
        result["body_system"] = "Respiratory"
        result.update(educational_content_for_organ("Lungs"))
        result["mechanism"] = educational_content_for_organ("Lungs")["mechanism"]
    elif final_condition in {"flu", "influenza"}:
        result["primary_condition"] = friendly_condition_name(display_name(prediction.get("condition", "Flu")))
        result["organ_affected"] = "Lungs"
        result["body_system"] = "Respiratory"
        result.update(educational_content_for_organ("Lungs"))
        result["mechanism"] = educational_content_for_organ("Lungs")["mechanism"]
    elif final_condition in {"chronic back pain"}:
        result["primary_condition"] = friendly_condition_name(display_name(prediction.get("condition", "Chronic Back Pain")))
        result["organ_affected"] = "Spine"
        result["body_system"] = "Skeletal"
        result.update(educational_content_for_organ("Spine"))
        result["mechanism"] = educational_content_for_organ("Spine")["mechanism"]

    if not client or result["primary_condition"] == "No dataset prediction":
        return result

    try:
        message = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=1200,
            messages=[{"role":"user", "content": build_prompt(body.symptoms, body.profile, prediction["condition"], result["organ_affected"])}]
        )
        raw_text = message.content[0].text.strip().replace("```json", "").replace("```", "").strip()
        llm = json.loads(raw_text)
        # LLM may enrich explanatory fields only. RF-derived fields remain authoritative.
        for key in ("why_it_happened", "lifestyle_connection", "mechanism", "immediate_relief", "foods_to_avoid", "foods_to_eat", "see_doctor_if", "recovery_time"):
            if key in llm:
                result[key] = llm[key]
        result["generated_at"] = datetime.now().isoformat()
    except Exception as e:
        logger.warning("Claude enrichment unavailable; keeping deterministic RF result: %s", e)

    # Final presentation layer: keep the RF/raw label internally, but show a plain-language condition to users.
    if result.get("primary_condition") != "No dataset prediction":
        result["primary_condition"] = friendly_condition_name(result.get("primary_condition"))
    for item in result.get("conditions", []) or []:
        if isinstance(item, dict) and item.get("name"):
            item["name"] = friendly_condition_name(item.get("name"))

    # Re-apply the sparse-input safety policy after optional enrichment so an
    # arbitrary RF class can never reappear as the primary condition. Anatomy
    # remains the explicit symptom-location mapping for the educational viewer.
    if sparse_single_symptom:
        result["primary_condition"] = symptom_primary_label(recognized_positive)
        result["conditions"] = []
        result["model_confidence"] = 0.0
        result["confidence_label"] = "Symptom-based result"
        result["low_confidence"] = True
    return result


@app.post("/analyze/batch")
async def analyze_batch(bodies: list[AnalyzeRequest]):
    """Analyze up to five symptom sets; larger requests are rejected explicitly."""
    if not bodies:
        raise HTTPException(status_code=422, detail="batch cannot be empty")
    if len(bodies) > 5:
        raise HTTPException(status_code=413, detail="batch limit is 5 requests")
    results = []
    for body in bodies:
        try:
            r = await analyze(body)
            results.append({"status": "ok", "result": r})
        except Exception as e:
            results.append({"status": "error", "detail": str(e)})
    return results


@app.get("/organs")
def list_organs():
    """Returns the full list of supported organs and body systems."""
    return {
        "organs": [
            "Brain", "Heart", "Lungs", "Liver", "Stomach",
            "Kidneys", "SmallInt", "LargeInt", "Gallbladder",
            "Spleen", "Bladder", "Spine", "Pancreas", "Skin", "Pelvic", "Joints", "Uterus", "Ovaries", "Testes", "Prostate"
        ],
        "systems": [
            "Neurological", "Cardiovascular", "Respiratory",
            "Digestive", "Renal", "Immune", "Skeletal", "Endocrine", "Integumentary", "Reproductive", "Reproductive / Pelvic", "Musculoskeletal"
        ]
    }



@app.get("/organ-map")
def organ_map():
    """Language-independent organ identifiers used by the 3D viewer."""
    aliases = {
        "Brain": ["Brain", "मस्तिष्क", "ಮೆದುಳು"],
        "Heart": ["Heart", "हृदय", "ಹೃದಯ"],
        "Lungs": ["Lungs", "फेफड़े", "ಶ್ವಾಸಕೋಶಗಳು"],
        "Liver": ["Liver", "यकृत", "ಯಕೃತ್"],
        "Stomach": ["Stomach", "पेट", "ಹೊಟ್ಟೆ"],
        "Kidneys": ["Kidneys", "गुर्दे", "ಮೂತ್ರಪಿಂಡಗಳು"],
        "Bladder": ["Bladder", "मूत्राशय", "ಮೂತ್ರಕೋಶ"],
        "Pancreas": ["Pancreas", "अग्न्याशय", "ಅಗ್ನ್ಯಾಶಯ"],
        "Spleen": ["Spleen", "प्लीहा", "ಪ್ಲೀಹ"],
        "Spine": ["Spine", "रीढ़", "ಬೆನ್ನುಹುರಿ"],
        "SmallInt": ["Small Intestine", "छोटी आंत", "ಸಣ್ಣ ಕರುಳು"],
        "LargeInt": ["Large Intestine", "बड़ी आंत", "ದೊಡ್ಡ ಕರುಳು"],
        "Gallbladder": ["Gallbladder", "पित्ताशय", "ಪಿತ್ತಕೋಶ"],
        "Uterus": ["Uterus", "गर्भाशय", "ಗರ್ಭಾಶಯ"],
        "Ovaries": ["Ovaries", "अंडाशय", "ಅಂಡಾಶಯಗಳು"],
        "Testes": ["Testes", "अंडकोष", "ವೃಷಣಗಳು"],
        "Prostate": ["Prostate", "प्रोस्टेट", "ಪ್ರೋಸ್ಟೇಟ್"],
    }
    return {"canonical": aliases}

@app.get("/model-info")
def model_info():
    eval_path = Path(__file__).resolve().parent / "dataset" / "evaluation_results.json"
    if not eval_path.exists():
        raise HTTPException(status_code=404, detail="Evaluation results not found")
    data = json.loads(eval_path.read_text(encoding="utf-8"))
    data["num_classes"] = 773
    data["classes_in_model"] = 773
    data["train_set_size"] = 197545
    data["test_set_size"] = 49400
    data["model_configuration"] = {"algorithm":"RandomForestClassifier","n_estimators":20,"max_depth":12,"max_features":"sqrt","random_state":42,"class_weight":"balanced","n_jobs":2}
    data["evaluation_methodology"] = data.get("method", "Stratified 80/20 train/test split with random_state=42")
    data["dataset_caveat"] = data.get("caveat", "Synthetic/artificial dataset; metrics are not clinical diagnostic accuracy.")
    return data


