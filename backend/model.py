"""SymptomLens Phase 1 (v2) -- classifier and symptom text processing.

Terminology note (per Phase 1 technical audit): this module is a
**classifier + similarity-ranking pipeline**, not an ensemble and not a
"hybrid ML model" in the technical sense. The Random Forest is the primary
decision mechanism (trained/evaluated with a held-out test split -- see
`evaluate.py` and `dataset/evaluation_results.json`). A separate Jaccard
symptom-overlap score is also reported, but purely as an explanatory,
secondary signal shown alongside the prediction; it is not blended into the
model's decision the way v1 did (v1 weighted RF at 5% and Jaccard at 95%,
which was misdescribed as "Random Forest classification").
"""

import re
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# ── Dataset / deployed model ────────────────────────────────────────────────
# The full supplied disease/symptom dataset is used for Phase 2.  The source
# file calls the label column `diseases`; the application keeps the existing
# internal name `prognosis` so the rest of the API remains stable.
DATASET_PATH = Path(__file__).resolve().parent / "dataset" / "Training.csv"
MODEL_PATH = Path(__file__).resolve().parent / "dataset" / "rf_full_773.joblib"

df = pd.read_csv(DATASET_PATH)
if "diseases" in df.columns and "prognosis" not in df.columns:
    df = df.rename(columns={"diseases": "prognosis"})

X = df.drop("prognosis", axis=1).astype("uint8")
y = df["prognosis"].astype(str)
symptom_list = list(X.columns)
DATASET_FEATURE_COUNT = len(symptom_list)

# Build a normalized lookup from the ACTUAL 377 dataset columns.  Natural-language
# aliases are resolved against this lookup instead of inventing feature names.
def _feature_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value).lower()).strip()

_FEATURE_KEY_TO_NAME = {_feature_key(name): name for name in symptom_list}

def _resolve_dataset_feature(candidates: list[str]) -> str | None:
    for candidate in candidates:
        key = _feature_key(candidate)
        if key in _FEATURE_KEY_TO_NAME:
            return _FEATURE_KEY_TO_NAME[key]
    return None

# Phrase -> possible REAL dataset feature names, in preference order.
# The final target is selected only if it exists in Training.csv.
DATASET_PHRASE_CANDIDATES = {
    "sneezing": ["continuous sneezing", "sneezing", "coryza"],
    "sneezing a lot": ["continuous sneezing", "sneezing", "coryza"],
    "light sensitivity": ["sensitivity to light", "light sensitivity", "photophobia"],
    "sensitivity to light": ["sensitivity to light", "light sensitivity", "photophobia"],
    "photophobia": ["sensitivity to light", "light sensitivity", "photophobia"],
    "acidity": ["acidity", "heartburn"],
    "acid reflux": ["acid reflux", "regurgitation", "heartburn"],
    "indigestion": ["indigestion"],
    "difficulty breathing": ["difficulty breathing", "shortness of breath"],
    "shortness of breath": ["shortness of breath", "difficulty breathing"],
    "body pain": ["ache all over", "body pain", "body ache"],
    "body aches": ["ache all over", "body pain", "body ache"],
    "body ache": ["ache all over", "body pain", "body ache"],
    "runny nose": ["coryza", "runny nose"],
    "stuffy nose": ["nasal congestion", "stuffy nose"],
    "blocked nose": ["nasal congestion", "blocked nose"],
    "head pressure": ["headache", "pressure in head"],
    "tight pressure around my head": ["headache"],
    "pressure around my head": ["headache"],
    "lower back pain": ["low back pain", "back pain"],
    "persistent lower back pain": ["low back pain", "back pain"],
}

def _expand_dataset_aliases(text: str) -> str:
    # Resolve phrase aliases to exact columns from the current dataset.
    for phrase, candidates in sorted(DATASET_PHRASE_CANDIDATES.items(), key=lambda x: len(x[0]), reverse=True):
        target = _resolve_dataset_feature(candidates)
        if target and phrase in text:
            text = text.replace(phrase, f" {target} ")
    return text


# The model is trained offline from the supplied full dataset and loaded here
# so starting FastAPI does not retrain hundreds of trees on every restart.
try:
    import joblib
except ImportError as exc:
    raise RuntimeError("joblib is required to load the full-dataset Random Forest") from exc

if not MODEL_PATH.exists():
    raise RuntimeError(f"Full-dataset Random Forest model not found: {MODEL_PATH}")
model = joblib.load(MODEL_PATH, mmap_mode="r")

# The deployed model is required to use the exact vocabulary/order from the
# current 377-feature dataset. Fail loudly if the artifact is stale or was
# trained against a different feature order instead of silently producing a
# plausible but incorrect vector.
MODEL_FEATURE_NAMES = list(getattr(model, "feature_names_in_", []))
if not MODEL_FEATURE_NAMES:
    raise RuntimeError("Deployed Random Forest does not expose feature_names_in_; refusing an unverified feature mapping")
if MODEL_FEATURE_NAMES != symptom_list:
    raise RuntimeError("Deployed Random Forest feature order does not match Training.csv")
if int(getattr(model, "n_features_in_", 0)) != DATASET_FEATURE_COUNT:
    raise RuntimeError("Deployed Random Forest feature count does not match Training.csv")

TRAIN_SET_SIZE = int(len(df) * 0.8)
TEST_SET_SIZE = len(df) - TRAIN_SET_SIZE
NUM_CLASSES = int(len(model.classes_))


# Human-readable display names for the UI/API. The underlying `prognosis`
# values are kept exactly as in the source dataset (see dataset/DATASET.md).
DISPLAY_NAMES = {}

def display_name(condition: str) -> str:
    return DISPLAY_NAMES.get(condition, condition.title())


# ── Symptom-text normalization ───────────────────────────────────────────────
# ── Hindi / Kannada symptom normalization ───────────────────────────────────
# The browser speech recognizer can return Devanagari/Kannada text. These
# phrase mappings convert common symptom expressions to the English symptom
# vocabulary used by the Phase 1 Random Forest. This is deterministic and
# local; no external translation service is required.
MULTILINGUAL_SYMPTOMS = {
    # Hindi
    "\u092e\u0947\u0930\u0947 \u0938\u093f\u0930 \u092e\u0947\u0902 \u092c\u0939\u0941\u0924 \u0924\u0947\u091c \u0926\u0930\u094d\u0926": "headache",
    "\u092e\u0947\u0930\u0947 \u0938\u093f\u0930 \u092e\u0947\u0902 \u0924\u0947\u091c \u0926\u0930\u094d\u0926": "headache",
    "\u0938\u093f\u0930 \u092e\u0947\u0902 \u092c\u0939\u0941\u0924 \u0924\u0947\u091c \u0926\u0930\u094d\u0926": "headache",
    "\u0938\u093f\u0930 \u092e\u0947\u0902 \u0924\u0947\u091c \u0926\u0930\u094d\u0926": "headache",
    "\u0924\u0947\u091c \u0930\u094b\u0936\u0928\u0940 \u0938\u0947 \u0926\u0930\u094d\u0926 \u092c\u0922\u093c \u091c\u093e\u0924\u093e \u0939\u0948": "light sensitivity",
    "\u0924\u0947\u091c \u0930\u094b\u0936\u0928\u0940 \u0938\u0947 \u0926\u0930\u094d\u0926 \u092c\u0922\u093c\u0924\u093e \u0939\u0948": "light sensitivity",
    "\u0930\u094b\u0936\u0928\u0940 \u0938\u0947 \u0926\u0930\u094d\u0926 \u092c\u0922\u093c \u091c\u093e\u0924\u093e \u0939\u0948": "light sensitivity",
    "सिरदर्द": "headache", "सिर में दर्द": "headache", "सिर दर्द": "headache", "सिर में दबाव": "headache", "सिर पर दबाव": "headache",
    "सिर भारी": "headache",
    "मतली": "nausea", "जी मिचलाना": "nausea", "मितली": "nausea",
    "उल्टी": "vomiting", "उल्टी हो रही है": "vomiting",
    "बुखार": "fever", "तेज बुखार": "fever", "खांसी": "cough",
    "गले में खराश": "sore throat", "गला दर्द": "sore throat", "गले में दर्द": "sore throat",
    "नाक बंद": "nasal congestion", "नाक बहना": "coryza", "नाक बह रही है": "coryza",
    "छींक": "sneezing", "छींक आना": "sneezing",
    "चक्कर": "dizziness", "चक्कर आना": "dizziness",
    "कमजोरी": "weakness", "थकान": "fatigue", "थकावट": "fatigue",
    "सांस लेने में तकलीफ": "shortness of breath", "सांस फूलना": "shortness of breath",
    "सांस लेने में परेशानी": "shortness of breath", "सांस लेने में कठिनाई": "shortness of breath",
    "सीने में दर्द": "sharp chest pain", "सीने का दर्द": "sharp chest pain",
    "सीने में जकड़न": "sharp chest pain", "सीने में भारीपन": "sharp chest pain",
    "पेट दर्द": "sharp abdominal pain", "पेट में दर्द": "sharp abdominal pain",
    "पेट में जलन": "sharp abdominal pain", "पेट की जलन": "sharp abdominal pain",
    "पेट जलना": "sharp abdominal pain", "पेट जल रहा है": "sharp abdominal pain",
    "कमर दर्द": "low back pain", "कमर में दर्द": "low back pain", "कमर में दर्द है": "low back pain", "पीठ दर्द": "low back pain", "पीठ में दर्द": "low back pain",
    "जोड़ों में दर्द": "joint pain", "जोड़ों का दर्द": "joint pain",
    "पेशाब करते समय जलन": "burning urination", "पेशाब में जलन": "burning urination",
    "पेशाब करते समय दर्द": "painful urination", "पेशाब में दर्द": "painful urination",
    "बार बार पेशाब": "frequent urination", "बार-बार पेशाब": "frequent urination",
    "मूत्र में खून": "blood in urine", "गुर्दे में दर्द": "kidney pain", "किडनी में दर्द": "kidney pain",
    "मांसपेशियों में दर्द": "muscle pain", "मांसपेशियों का दर्द": "muscle pain",
    "शरीर में दर्द": "body pain", "शरीर दर्द": "body pain",
    "दस्त": "diarrhea", "पतले दस्त": "diarrhea", "कब्ज": "constipation",
    "नींद नहीं आना": "insomnia", "सोने में परेशानी": "insomnia",
    "नींद में परेशानी": "insomnia",
    "लेकिन": "but", "मगर": "but", "पर": "but",
    "नहीं है": "not", "नहीं हैं": "not", "नहीं": "not", "बिना": "without", "मुझे": "i", "मैं": "i", "है": "is", "हैं": "are", "और": "and",

    # Kannada
    "ತಲೆನೋವು": "headache", "ತಲೆ ನೋವು": "headache", "ತಲೆ ಭಾರ": "headache",
    "ವಾಕರಿಕೆ": "nausea", "ಓಕರಿಕೆ": "nausea",
    "ವಾಂತಿ": "vomiting", "ವಾಂತಿ ಆಗುತ್ತಿದೆ": "vomiting",
    "ಜ್ವರ": "fever", "ತೀವ್ರ ಜ್ವರ": "fever", "ಕೆಮ್ಮು": "cough",
    "ಗಂಟಲು ನೋವು": "sore throat", "ಗಂಟಲು ಕೆರೆತ": "sore throat",
    "ಮೂಗು ಕಟ್ಟುವುದು": "nasal congestion", "ಮೂಗು ಸೋರುವುದು": "coryza",
    "ಮೂಗು ಸೋರುತ್ತಿದೆ": "coryza", "ಸೀನು": "sneezing", "ಸೀನು ಬರುವುದು": "sneezing",
    "ತಲೆ ಸುತ್ತುವುದು": "dizziness", "ತಲೆ ತಿರುಗುವುದು": "dizziness",
    "ದೌರ್ಬಲ್ಯ": "weakness", "ಆಯಾಸ": "fatigue", "ಸುಸ್ತು": "fatigue",
    "ಉಸಿರಾಟದ ತೊಂದರೆ": "shortness of breath", "ಉಸಿರಾಟ ಕಷ್ಟ": "shortness of breath",
    "ಉಸಿರಾಟದಲ್ಲಿ ತೊಂದರೆ": "shortness of breath", "ಉಸಿರಾಡಲು ಕಷ್ಟ": "shortness of breath",
    "ಎದೆ ನೋವು": "sharp chest pain", "ಎದೆಯಲ್ಲಿ ನೋವು": "sharp chest pain",
    "ಎದೆಯಲ್ಲಿ ಬಿಗಿತ": "sharp chest pain",
    "ಹೊಟ್ಟೆ ನೋವು": "sharp abdominal pain", "ಹೊಟ್ಟೆಯಲ್ಲಿ ನೋವು": "sharp abdominal pain",
    "ಹೊಟ್ಟೆ ಉರಿ": "sharp abdominal pain", "ಹೊಟ್ಟೆಯಲ್ಲಿ ಉರಿ": "sharp abdominal pain",
    "ಹೊಟ್ಟೆ ಉರಿಯುತ್ತಿದೆ": "sharp abdominal pain", "ಹೊಟ್ಟೆಯಲ್ಲಿ ಉರಿ ಆಗುತ್ತಿದೆ": "sharp abdominal pain",
    "ಬೆನ್ನು ನೋವು": "low back pain", "ಬೆನ್ನಿನಲ್ಲಿ ನೋವು": "low back pain", "ಸೊಂಟ ನೋವು": "low back pain", "ಸೊಂಟದಲ್ಲಿ ನೋವು": "low back pain",
    "ಕೀಲು ನೋವು": "joint pain", "ಕೀಲುಗಳಲ್ಲಿ ನೋವು": "joint pain",
    "ಮೂತ್ರ ಮಾಡುವಾಗ ಉರಿ": "burning urination", "ಮೂತ್ರ ವಿಸರ್ಜನೆ ವೇಳೆ ಉರಿ": "burning urination",
    "ಮೂತ್ರ ಮಾಡುವಾಗ ನೋವು": "painful urination", "ಮೂತ್ರ ವಿಸರ್ಜನೆ ವೇಳೆ ನೋವು": "painful urination",
    "ಆಗಾಗ್ಗೆ ಮೂತ್ರ": "frequent urination", "ಮೂತ್ರದಲ್ಲಿ ರಕ್ತ": "blood in urine",
    "ಮೂತ್ರಪಿಂಡದಲ್ಲಿ ನೋವು": "kidney pain", "ಕಿಡ್ನಿಯಲ್ಲಿ ನೋವು": "kidney pain",
    "ಸ್ನಾಯು ನೋವು": "muscle pain", "ಸ್ನಾಯುಗಳಲ್ಲಿ ನೋವು": "muscle pain",
    "ದೇಹ ನೋವು": "body pain", "ದೇಹದಲ್ಲಿ ನೋವು": "body pain",
    "ಅತಿಸಾರ": "diarrhea", "ಮಲಬದ್ಧತೆ": "constipation",
    "ನಿದ್ರೆ ಬಾರದಿರುವುದು": "insomnia", "ನಿದ್ರೆ ಮಾಡಲು ತೊಂದರೆ": "insomnia",
    "ನಿದ್ರೆ ಬರದಿರುವುದು": "insomnia",
    "ಆದರೆ": "but", "ಇಲ್ಲದೆ": "without", "ಇಲ್ಲ": "not", "ನನಗೆ": "i", "ನಾನು": "i", "ಇದೆ": "is", "ಇವೆ": "are", "ಮತ್ತು": "and",
    "\u0ca8\u0ca8\u0ccd\u0ca8 \u0ca4\u0cb2\u0cc6\u0caf\u0cb2\u0ccd\u0cb2\u0cbf \u0ca4\u0cc1\u0c82\u0cac\u0cbe \u0ca4\u0cc0\u0cb5\u0ccd\u0cb0\u0cb5\u0cbe\u0ca6 \u0ca8\u0ccb\u0cb5\u0cc1 \u0c87\u0ca6\u0cc6": "headache",
    "\u0ca4\u0cb2\u0cc6\u0caf\u0cb2\u0ccd\u0cb2\u0cbf \u0ca4\u0cc1\u0c82\u0cac\u0cbe \u0ca4\u0cc0\u0cb5\u0ccd\u0cb0\u0cb5\u0cbe\u0ca6 \u0ca8\u0ccb\u0cb5\u0cc1": "headache",
    "\u0ca4\u0cc0\u0cb5\u0ccd\u0cb0\u0cb5\u0cbe\u0ca6 \u0ca4\u0cb2\u0cc6\u0ca8\u0ccb\u0cb5\u0cc1": "headache",
    "\u0caa\u0ccd\u0cb0\u0c95\u0cbe\u0cb6\u0cae\u0cbe\u0ca8\u0cb5\u0cbe\u0ca6 \u0cac\u0cc6\u0cb3\u0c95\u0cbf\u0ca8\u0cbf\u0c82\u0ca6 \u0ca8\u0ccb\u0cb5\u0cc1 \u0cb9\u0cc6\u0c9a\u0ccd\u0c9a\u0cbe\u0c97\u0cc1\u0ca4\u0ccd\u0ca4\u0ca6\u0cc6": "light sensitivity",
    "\u0cac\u0cc6\u0cb3\u0c95\u0cbf\u0ca8\u0cbf\u0c82\u0ca6 \u0ca8\u0ccb\u0cb5\u0cc1 \u0cb9\u0cc6\u0c9a\u0ccd\u0c9a\u0cbe\u0c97\u0cc1\u0ca4\u0ccd\u0ca4\u0ca6\u0cc6": "light sensitivity",
    "\u0cac\u0cc6\u0cb3\u0c95\u0cc1 \u0ca8\u0ccb\u0ca1\u0cbf\u0ca6\u0cbe\u0c97 \u0ca8\u0ccb\u0cb5\u0cc1 \u0cb9\u0cc6\u0c9a\u0ccd\u0c9a\u0cbe\u0c97\u0cc1\u0ca4\u0ccd\u0ca4\u0ca6\u0cc6": "light sensitivity",
}



MULTILINGUAL_NEGATED_PHRASES = {
    # Hindi
    "सिरदर्द नहीं": "not headache", "सिर में दर्द नहीं": "not headache",
    "मतली नहीं": "not nausea", "जी मिचलाना नहीं": "not nausea",
    "उल्टी नहीं": "not vomiting", "बुखार नहीं": "not fever",
    "खांसी नहीं": "not cough", "गले में खराश नहीं": "not sore throat",
    "गला दर्द नहीं": "not sore throat", "नाक बंद नहीं": "not nasal congestion",
    "नाक बहना नहीं": "not coryza", "चक्कर नहीं": "not dizziness",
    "कमजोरी नहीं": "not weakness", "थकान नहीं": "not fatigue",
    "सांस लेने में तकलीफ नहीं": "not shortness of breath",
    "सांस फूलना नहीं": "not shortness of breath",
    "सीने में दर्द नहीं": "not sharp chest pain",
    "सीने में जकड़न नहीं": "not sharp chest pain",
    "पेट दर्द नहीं": "not sharp abdominal pain",
    "पेट में दर्द नहीं": "not sharp abdominal pain",
    "पेट में जलन नहीं": "not sharp abdominal pain",
    "कमर दर्द नहीं": "not low back pain", "पीठ दर्द नहीं": "not low back pain",
    "जोड़ों में दर्द नहीं": "not joint pain", "मांसपेशियों में दर्द नहीं": "not muscle pain",
    "दस्त नहीं": "not diarrhea", "कब्ज नहीं": "not constipation",

    # Kannada
    "ತಲೆನೋವು ಇಲ್ಲ": "not headache", "ತಲೆ ನೋವು ಇಲ್ಲ": "not headache",
    "ವಾಕರಿಕೆ ಇಲ್ಲ": "not nausea", "ಓಕರಿಕೆ ಇಲ್ಲ": "not nausea",
    "ವಾಂತಿ ಇಲ್ಲ": "not vomiting", "ಜ್ವರ ಇಲ್ಲ": "not fever",
    "ಕೆಮ್ಮು ಇಲ್ಲ": "not cough", "ಗಂಟಲು ನೋವು ಇಲ್ಲ": "not sore throat",
    "ಗಂಟಲು ಕೆರೆತ ಇಲ್ಲ": "not sore throat", "ಮೂಗು ಕಟ್ಟುವುದು ಇಲ್ಲ": "not nasal congestion",
    "ಮೂಗು ಸೋರುವುದು ಇಲ್ಲ": "not coryza", "ತಲೆ ಸುತ್ತುವುದು ಇಲ್ಲ": "not dizziness",
    "ದೌರ್ಬಲ್ಯ ಇಲ್ಲ": "not weakness", "ಆಯಾಸ ಇಲ್ಲ": "not fatigue",
    "ಉಸಿರಾಟದ ತೊಂದರೆ ಇಲ್ಲ": "not shortness of breath",
    "ಉಸಿರಾಟ ಕಷ್ಟ ಇಲ್ಲ": "not shortness of breath",
    "ಎದೆ ನೋವು ಇಲ್ಲ": "not sharp chest pain",
    "ಎದೆಯಲ್ಲಿ ಬಿಗಿತ ಇಲ್ಲ": "not sharp chest pain",
    "ಹೊಟ್ಟೆ ನೋವು ಇಲ್ಲ": "not sharp abdominal pain",
    "ಹೊಟ್ಟೆಯಲ್ಲಿ ನೋವು ಇಲ್ಲ": "not sharp abdominal pain",
    "ಹೊಟ್ಟೆಯಲ್ಲಿ ಉರಿ ಇಲ್ಲ": "not sharp abdominal pain",
    "ಬೆನ್ನು ನೋವು ಇಲ್ಲ": "not low back pain", "ಸೊಂಟ ನೋವು ಇಲ್ಲ": "not low back pain",
    "ಕೀಲು ನೋವು ಇಲ್ಲ": "not joint pain", "ಸ್ನಾಯು ನೋವು ಇಲ್ಲ": "not muscle pain",
    "ದೇಹ ನೋವು ಇಲ್ಲ": "not body pain", "ಅತಿಸಾರ ಇಲ್ಲ": "not diarrhea",
    "ಮಲಬದ್ಧತೆ ಇಲ್ಲ": "not constipation",
}

def _translate_multilingual(text: str) -> str:
    # Handle explicit negated symptom phrases first.
    for source in sorted(MULTILINGUAL_NEGATED_PHRASES, key=len, reverse=True):
        text = text.replace(source, f" {MULTILINGUAL_NEGATED_PHRASES[source]} ")

    # Then translate remaining multilingual symptom phrases.
    for source in sorted(MULTILINGUAL_SYMPTOMS, key=len, reverse=True):
        text = text.replace(source, f" {MULTILINGUAL_SYMPTOMS[source]} ")
    return text

SYNONYMS = {
    "head pain": "headache",
    "head ache": "headache",
    "stomach pain": "sharp abdominal pain",
    "tummy ache": "sharp abdominal pain",
    "tired": "fatigue",
    "exhausted": "fatigue",
    "weak all over": "weakness",
    "can not sleep": "insomnia",
    "cant sleep": "insomnia",
    "unable to sleep": "insomnia",
    "trouble sleeping": "insomnia",
    "breath problem": "shortness of breath",
    "can not breathe properly": "shortness of breath", "cannot breathe properly": "shortness of breath", "cant breathe properly": "shortness of breath",
    "short of breath": "shortness of breath",
    "trouble breathing": "difficulty breathing",
    "runny nose": "nasal congestion",
    "stuffy nose": "nasal congestion",
    "blocked nose": "nasal congestion",
    "body ache": "ache all over",
    "body pain": "ache all over",
    "body pains": "ache all over",
    "pain throughout my body": "ache all over",
    "muscle ache": "ache all over",
    "throwing up": "vomiting",
    "nauseous": "nausea",
    "feel sick to my stomach": "nausea",
    "throat pain": "sore throat",
    "chest tightness": "sharp chest pain",
    "lower back pain": "low back pain",
    "blurred vision": "diminished vision",
    "blurry vision": "diminished vision",
    "neck stiffness": "neck stiffness or tightness",
    "stiff neck": "neck stiffness or tightness",
    "sneezing": "sneezing",
}


# Additional English aliases mapped to the existing model vocabulary.
ENGLISH_SYMPTOM_ALIASES = {
    # Head / neurological
    "head ache": "headache", "head pain": "headache", "pain in my head": "headache", "my head hurts": "headache", "my head is aching": "headache", "bad headache": "headache", "severe headache": "headache", "throbbing headache": "headache", "pounding headache": "headache", "tight pressure around my head": "headache", "pressure around my head": "headache", "pressure in my head": "headache", "my head feels tight": "headache", "migraine": "headache",
    "feeling dizzy": "dizziness", "feel dizzy": "dizziness", "lightheaded": "dizziness", "light headed": "dizziness", "room is spinning": "dizziness", "spinning sensation": "dizziness", "vertigo": "dizziness",
    "memory problems": "disturbance_of_memory", "memory problem": "disturbance_of_memory", "forgetfulness": "disturbance_of_memory", "loss of sensation": "loss_of_sensation", "numbness": "loss_of_sensation", "reduced sensation": "loss_of_sensation", "face symptoms": "symptoms_of_the_face", "facial symptoms": "symptoms_of_the_face", "vision is blurry": "diminished_vision", "vision blurry": "diminished_vision", "blurry vision": "diminished_vision", "blurred vision": "diminished_vision", "spots in my vision": "spots_or_clouds_in_vision", "clouds in my vision": "spots_or_clouds_in_vision", "vision spots": "spots_or_clouds_in_vision", "cannot see": "blindness", "can not see": "blindness", "can't see": "blindness",
    "seeing things": "delusions_or_hallucinations", "hearing things": "delusions_or_hallucinations", "hallucinations": "delusions_or_hallucinations", "unusual movements": "abnormal_involuntary_movements", "involuntary movements": "abnormal_involuntary_movements",

    # Fever / general
    "feverish": "fever", "high temperature": "fever", "running a fever": "fever", "temperature": "fever", "feeling feverish": "fever", "chills and fever": "chills", "shivering": "chills", "shivering chills": "chills", "very weak": "weakness", "feeling weak": "weakness", "tiredness": "fatigue", "exhaustion": "fatigue", "very tired": "fatigue", "no energy": "fatigue", "sleepy": "sleepiness", "very sleepy": "sleepiness", "body ache": "ache_all_over", "body aches": "ache_all_over", "aching all over": "ache_all_over", "pain all over": "ache_all_over", "flu like symptoms": "flu_like_syndrome", "flu-like symptoms": "flu_like_syndrome",

    # Respiratory / ENT
    "throwing up": "vomiting", "throw up": "vomiting", "being sick": "vomiting", "feel like vomiting": "nausea", "feeling nauseous": "nausea", "queasy": "nausea", "throat pain": "sore_throat", "my throat hurts": "sore_throat", "painful throat": "sore_throat", "scratchy throat": "sore_throat", "blocked nose": "nasal_congestion", "stuffy nose": "nasal_congestion", "runny nose": "coryza", "nose running": "coryza", "sneezing": "sneezing", "sneezing a lot": "sneezing", "breath problem": "shortness_of_breath", "short of breath": "shortness_of_breath", "shortness of breath": "shortness_of_breath", "breathlessness": "shortness_of_breath", "hard to breathe": "difficulty_breathing", "difficulty breathing": "difficulty_breathing", "trouble breathing": "difficulty_breathing", "cannot breathe properly": "difficulty_breathing", "can't breathe properly": "difficulty_breathing", "wheezing": "wheezing", "whistling when breathing": "wheezing", "noisy breathing": "abnormal_breathing_sounds", "abnormal breathing sounds": "abnormal_breathing_sounds", "dry cough": "cough", "coughing": "cough", "persistent cough": "cough",

    # Chest / cardiovascular wording supported by the current model
    "chest pain": "sharp_chest_pain", "sharp chest pain": "sharp_chest_pain", "chest ache": "sharp_chest_pain", "pain in my chest": "sharp_chest_pain", "my chest hurts": "sharp_chest_pain", "chest pressure": "sharp_chest_pain", "chest tightness": "sharp_chest_pain",

    # Digestive
    "stomach pain": "sharp_abdominal_pain", "stomach ache": "sharp_abdominal_pain", "stomachache": "sharp_abdominal_pain", "tummy ache": "sharp_abdominal_pain", "tummy pain": "sharp_abdominal_pain", "belly pain": "sharp_abdominal_pain", "abdominal pain": "sharp_abdominal_pain", "pain in my abdomen": "sharp_abdominal_pain", "acidity": "heartburn", "acid reflux": "regurgitation", "heartburn": "heartburn", "burning stomach": "burning_abdominal_pain", "burning in my stomach": "burning_abdominal_pain", "stomach burning": "burning_abdominal_pain", "acid coming up": "regurgitation_secondary", "food coming back up": "regurgitation_secondary", "vomiting blood": "vomiting_blood", "blood in vomit": "vomiting_blood", "throwing up blood": "vomiting_blood", "loose motions": "diarrhea", "loose stools": "diarrhea", "frequent loose stools": "diarrhea", "watery stools": "diarrhea",

    # Musculoskeletal
    "back pain": "back_pain", "back ache": "back_pain", "pain in my back": "back_pain", "persistent back pain": "back_pain", "lower back pain": "low_back_pain", "lower back ache": "low_back_pain", "pain in my lower back": "low_back_pain", "upper back pain": "back_pain", "neck pain": "neck_pain", "pain in my neck": "neck_pain", "neck stiffness": "neck_stiffness_or_tightness", "stiff neck": "neck_stiffness_or_tightness", "tight neck": "neck_stiffness_or_tightness", "shoulder pain": "shoulder_pain", "pain in my shoulder": "shoulder_pain", "arm pain": "arm_pain", "pain in my arm": "arm_pain", "hand pain": "hand_or_finger_pain", "finger pain": "hand_or_finger_pain", "wrist pain": "wrist_pain", "pain in my wrist": "wrist_pain", "hip pain": "hip_pain", "pain in my hip": "hip_pain", "leg pain": "leg_pain", "pain in my leg": "leg_pain", "knee pain": "knee_pain", "pain in my knee": "knee_pain", "ankle pain": "ankle_pain", "pain in my ankle": "ankle_pain", "foot pain": "foot_or_toe_pain", "toe pain": "foot_or_toe_pain", "pain in my foot": "foot_or_toe_pain", "groin pain": "groin_pain", "lower body pain": "lower_body_pain", "back cramps": "back_cramps_or_spasms", "back spasms": "back_cramps_or_spasms", "back stiffness": "back_stiffness_or_tightness", "back feels tight": "back_stiffness_or_tightness",

    # Sleep
    "cannot sleep": "insomnia", "can not sleep": "insomnia", "cant sleep": "insomnia", "unable to sleep": "insomnia", "trouble sleeping": "insomnia", "sleeping difficulty": "insomnia", "difficulty sleeping": "insomnia",
}


# These common location/urinary/reproductive/skin phrases are intentionally
# recognized for anatomy and interview purposes even though they are not
# columns in the current RF vocabulary. They must never be silently converted
# into a different medical symptom just to force a prediction.
EXTRA_LOCATION_SYMPTOMS = {
    "kidney pain": "kidney pain", "pain in my kidney": "kidney pain", "pain in my kidneys": "kidney pain",
    "flank pain": "flank pain", "kidney stone pain": "kidney stone pain",
    "burning urination": "burning urination", "painful urination": "painful urination",
    "frequent urination": "frequent urination", "blood in urine": "blood in urine",
    "burning when i urinate": "burning urination", "burning when i pee": "burning urination",
    "burns when i pee": "burning urination", "it burns when i pee": "burning urination",
    "burns when i urinate": "burning urination", "it burns when i urinate": "burning urination",
    "burning while urinating": "burning urination", "burning while i pee": "burning urination",
    "burning urine": "burning urination", "burning when passing urine": "burning urination",
    "stinging when i pee": "burning urination", "stinging when urinating": "burning urination",
    "pain when urinating": "painful urination", "pain when i pee": "painful urination",
    "it hurts when i pee": "painful urination", "it hurts when i urinate": "painful urination",
    "frequent urination": "frequent urination", "peeing frequently": "frequent urination",
    "peeing a lot": "frequent urination", "urinating frequently": "frequent urination",
    "blood in urine": "blood in urine", "blood when i pee": "blood in urine", "bladder pain": "bladder pain",
    "pelvic pain": "pelvic pain", "period cramps": "menstrual cramps", "menstrual cramps": "menstrual cramps",
    "period pain": "menstrual cramps", "painful periods": "menstrual cramps",
    "ovary pain": "ovary pain", "ovarian pain": "ovary pain", "testicle pain": "testicular pain",
    "testicular pain": "testicular pain", "prostate pain": "prostate pain",
    "skin rash": "skin rash", "rash": "skin rash", "itchy skin": "itching", "itching": "itching",
    "acne": "acne", "pimples": "acne", "yellow skin": "jaundice", "yellow eyes": "jaundice", "jaundice": "jaundice",
    "liver pain": "liver pain", "gallbladder pain": "gallbladder pain", "gallstone pain": "gallbladder pain",
    "pancreas pain": "pancreatic pain", "spleen pain": "spleen pain",
    "bloating": "bloating", "constipation": "constipation", "blood in stool": "blood in stool",
    "painful bowel movement": "painful bowel movement", "bowel movement pain": "painful bowel movement",
}

def recognized_extra_symptoms(user_input: str) -> list[str]:
    text = _expand_contractions(_translate_multilingual(str(user_input).lower()))
    text = re.sub(r"\s+", " ", text).strip()
    found = []
    for phrase, label in sorted(EXTRA_LOCATION_SYMPTOMS.items(), key=lambda x: len(x[0]), reverse=True):
        if phrase in text and label not in found:
            found.append(label)
    return found

# Contractions are expanded BEFORE punctuation is stripped so that negation
# cue words ("not") survive as standalone tokens.
CONTRACTIONS = {
    "don't": "do not", "doesn't": "does not", "didn't": "did not",
    "can't": "can not", "cannot": "can not", "won't": "will not",
    "isn't": "is not", "wasn't": "was not", "haven't": "have not",
    "hasn't": "has not", "hadn't": "had not", "aren't": "are not",
    "shouldn't": "should not", "wouldn't": "would not", "couldn't": "could not",
}

NEGATION_CUES = {
    "no", "not", "denies", "denying", "without", "never", "negative",
    "absence", "ruled", "rule",
}

# How many tokens before a matched symptom phrase we scan for a negation cue.
NEGATION_WINDOW = 4


def _expand_contractions(text: str) -> str:
    for source, target in CONTRACTIONS.items():
        text = text.replace(source, target)
    return text


def _expand_synonyms(text: str) -> str:
    aliases = {}
    aliases.update(SYNONYMS)
    aliases.update(ENGLISH_SYMPTOM_ALIASES)

    # Longest aliases first to avoid partial replacement.
    for source, target in sorted(aliases.items(), key=lambda item: len(item[0]), reverse=True):
        if source in text:
            text = text.replace(source, f" {target} ")
    return text


def normalize_text(user_input: str) -> str:
    """Lowercase and expand contractions/synonyms (punctuation preserved).

    Punctuation is intentionally kept here (unlike v1) because
    `text_to_vector_verbose` needs clause boundaries (commas/periods/etc.)
    to scope negation correctly -- see that function's docstring. Callers
    that only want a flat, punctuation-free string (e.g. existing external
    callers) can still rely on this function; `_strip_punctuation` is used
    internally after clause splitting.
    """
    text = user_input.lower()
    text = _translate_multilingual(text)
    text = _expand_contractions(text)
    # In Hindi/Kannada constructions such as “headache is not and fever is”,
    # keep the negation scoped to the first symptom instead of spilling over.
    text = re.sub(r"\bnot\s+([a-z_ ]+?)\s+is\s+and\b", r"not \1 is but ", text)
    text = re.sub(r"\bnot\s+([a-z_ ]+?)\s+and\b", r"not \1 but ", text)
    text = _expand_synonyms(text)
    text = _expand_dataset_aliases(text)
    return text


def _strip_punctuation(text: str) -> str:
    text = re.sub(r"[^a-z ]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


_CLAUSE_SPLIT_RE = re.compile(r"[,.;!?]|\bbut\b|\bhowever\b|\bऔर\b|\bलेकिन\b|\bमगर\b|\bಆದರೆ\b")


def text_to_vector(user_input: str) -> list[int]:
    """Convert free text into a binary symptom vector, with negation checks.

    Limitation (documented, not hidden): negation detection is a fixed-size
    lookbehind window over a small cue-word list, scoped to a single clause
    (text is split on `, . ; ! ? but however` before the window is applied,
    so a negation in one clause cannot bleed into the next -- e.g. "no
    fever, just a cough" no longer misreads "cough" as negated). It
    correctly handles simple, common phrasings ("no fever", "I do not have
    a cough", "denies nausea") but is not a full NLP negation/scope parser.
    Nested clauses, negation placed *after* the symptom ("fever: absent"),
    and negation scope spanning a conjunction within the same clause
    ("no fever or chills") for the second item are not reliably handled.
    "no fever or chills" IS handled correctly (no clause break, same
    negation scope covers both); this is called out because it is the kind
    of edge case that looks like it should fail but does not -- see
    test_model.py for the cases that are and are not covered.
    """
    vector, _matched, _negated = text_to_vector_verbose(user_input)
    return vector


def text_to_vector_verbose(user_input: str) -> tuple[list[int], list[str], list[str]]:
    """Same intent as text_to_vector but also returns matched and negated symptoms.

    See text_to_vector's docstring for the negation-handling limitations.
    """
    expanded = normalize_text(user_input)
    clauses = _CLAUSE_SPLIT_RE.split(expanded)

    vector = [0] * len(symptom_list)
    positive_found = [False] * len(symptom_list)
    negated_found = [False] * len(symptom_list)

    for clause in clauses:
        tokens = _strip_punctuation(clause).split()
        for i, symptom in enumerate(symptom_list):
            phrase_tokens = symptom.replace("_", " ").split()
            n = len(phrase_tokens)
            for start in range(len(tokens) - n + 1):
                if tokens[start:start + n] == phrase_tokens:
                    window_start = max(0, start - NEGATION_WINDOW)
                    preceding = tokens[window_start:start]
                    if any(cue in preceding for cue in NEGATION_CUES):
                        negated_found[i] = True
                    else:
                        positive_found[i] = True

    negated_symptoms = []
    for i, symptom in enumerate(symptom_list):
        if positive_found[i]:
            vector[i] = 1
        elif negated_found[i]:
            negated_symptoms.append(symptom)

    matched = [s for s, v in zip(symptom_list, vector) if v]
    return vector, matched, negated_symptoms


# ── Prediction ────────────────────────────────────────────────────────────────
def predict_disease_details(user_input: str) -> dict:
    """Return a prototype condition prediction.

    Primary decision mechanism: Random Forest `predict_proba` over the
    trained-split model. A secondary Jaccard symptom-overlap score against
    the labeled training rows is also computed and reported for explanatory
    purposes only -- it does NOT influence which condition is returned.
    """
    vector, matched, negated = text_to_vector_verbose(user_input)

    extra_matched = recognized_extra_symptoms(user_input)
    if not any(vector):
        return {
            "condition": None,
            "matched_symptoms": [],
            "recognized_symptoms": extra_matched,
            "negated_symptoms": negated,
            "vector": vector,
            "score": 0.0,
            "top_predictions": [],
        }

    input_df = pd.DataFrame([vector], columns=symptom_list)
    probabilities = model.predict_proba(input_df)[0]
    classes = model.classes_

    ranked = sorted(zip(classes, probabilities), key=lambda t: t[1], reverse=True)
    best_condition, best_prob = ranked[0]

    # The RF probability is the authoritative model signal.  With the full
    # 773-condition dataset, a separate Jaccard calculation over all training
    # rows would be unnecessarily expensive and is not used for the decision.
    symptom_overlap_score = 0.0

    top_predictions = []
    top_n = ranked[:3]
    total = sum(p for _, p in top_n) or 1.0
    for condition, prob in top_n:
        top_predictions.append({
            "condition": display_name(condition),
            "raw_label": condition,
            "probability": round(float(prob) * 100, 1),
            "relative_probability": int(round(prob / total * 100)),
        })
    if top_predictions:
        correction = 100 - sum(p["relative_probability"] for p in top_predictions)
        top_predictions[0]["relative_probability"] += correction

    return {
        "condition": display_name(best_condition),
        "raw_label": best_condition,
        "matched_symptoms": matched,
        "recognized_symptoms": matched + [x for x in extra_matched if x not in matched],
        "negated_symptoms": negated,
        "vector": vector,
        "score": round(float(best_prob) * 100, 1),
        "symptom_overlap_score": symptom_overlap_score,
        "top_predictions": top_predictions,
    }


def predict_disease(user_input: str) -> str | None:
    return predict_disease_details(user_input)["condition"]
