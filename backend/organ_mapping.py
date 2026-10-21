"""Deterministic lookup table from supported Phase 1 conditions to a
visualization target (organ) and body system.

This is a static Python dict, not a medical knowledge base and not a
clinical anatomical-localization model. It exists solely to pick which
pre-built organ mesh the 3D viewer highlights for a given predicted
condition. Several conditions here (e.g. "Sprain or Strain", which in the
underlying dataset covers limb/back musculoskeletal symptoms broadly) are
mapped to the closest available visualization target ("Spine") because the
Phase 1 3D scene does not model individual limbs -- this is a known,
disclosed simplification, not a claim of precise localization.
"""
import logging

logger = logging.getLogger("symptomlens")

# Keys must exactly match the Title Case display names produced by
# model.display_name(). Kept as its own table (not derived from model.py)
# so it stays reviewable independent of the classifier.
DISEASE_TO_ORGAN = {
    "Flu": "Lungs",
    "Migraine": "Brain",
    "Tension Headache": "Brain",
    "Chronic Back Pain": "Spine",
    "Pneumonia": "Lungs",
    "Gastritis": "Stomach",
    "Sprain or Strain": "Spine",
    "Common Cold": "Lungs",
    "Primary Insomnia": "Brain",
}

ORGAN_TO_SYSTEM = {
    "Brain": "Neurological",
    "Heart": "Cardiovascular",
    "Lungs": "Respiratory",
    "Liver": "Digestive",
    "Stomach": "Digestive",
    "Kidneys": "Renal",
    "SmallInt": "Digestive",
    "LargeInt": "Digestive",
    "Gallbladder": "Digestive",
    "Spleen": "Immune",
    "Bladder": "Renal",
    "Spine": "Skeletal",
    "Pancreas": "Endocrine",
    "Skin": "Integumentary",
    "Joints": "Musculoskeletal",
    "Pelvic": "Reproductive / Pelvic",
    "Uterus": "Reproductive",
    "Ovaries": "Reproductive",
    "Testes": "Reproductive",
    "Prostate": "Reproductive",
}

DEFAULT_ORGAN = "Brain"


def organ_for_condition(condition: str) -> str:
    """Look up the visualization target for a condition.

    Falls back to DEFAULT_ORGAN and logs a warning if the condition isn't
    one of the 9 currently supported labels -- this should never happen in
    practice since the classifier's classes_ are exactly this set, but the
    fallback avoids a hard crash and the warning makes any mismatch visible
    in logs/tests rather than silently mislabeling the visualization.
    """
    if condition not in DISEASE_TO_ORGAN:
        logger.warning(
            "organ_for_condition: unmapped condition %r, defaulting to %s",
            condition, DEFAULT_ORGAN,
        )
    return DISEASE_TO_ORGAN.get(condition, DEFAULT_ORGAN)


def system_for_organ(organ: str) -> str:
    return ORGAN_TO_SYSTEM.get(organ, "Neurological")
