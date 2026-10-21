"""
Deterministic, documented subset selection from the raw
'Disease and symptoms dataset 2023' for SymptomLens Phase 1.

Selection method (no fabrication):
1. From the 773 diseases in the raw dataset, keep only diseases whose name
   is an exact (case-insensitive) match to one of the conditions already
   supported by the Phase 1 organ/3D-visualization concept, OR the closest
   real disease label available for that concept (documented below).
2. For the selected diseases, keep only symptom columns that actually vary
   (nunique > 1) and are non-zero at least once within that subset -- i.e.
   only symptoms that are ever reported for at least one of the selected
   diseases and are not a required always cough. This removes ~320
   irrelevant symptom columns without touching any row values.
3. No rows are duplicated, edited, or synthesized. No disease label is
   invented. No symptom is invented.

Mapping from the OLD prototype label to the disease label actually present
in the raw dataset:
    Flu               -> "flu"
    Migraine          -> "migraine"
    Tension Headache  -> "tension headache"
    Back Pain         -> "chronic back pain"   (closest real label; "back pain" alone is not a disease in the raw data)
    Pneumonia         -> "pneumonia"
    Gastritis         -> "gastritis"
    Muscle Strain     -> "sprain or strain"    (closest real label; "muscle strain" alone is not a disease in the raw data)
    Common Cold       -> "common cold"
    Severe Migraine   -> DROPPED. Not a distinct label in the raw dataset;
                          the old prototype invented this class. Removed
                          rather than fabricated.
    Insomnia          -> "primary insomnia"
"""
import sys
from pathlib import Path

import pandas as pd

# The raw 246,945-row source file is not bundled with this project (too
# large). To reproduce Training.csv from scratch, download "Disease and
# symptoms dataset 2023" and pass its path as the first CLI argument, e.g.:
#   python build_dataset.py "/path/to/Disease and symptoms dataset.csv"
RAW_PATH = sys.argv[1] if len(sys.argv) > 1 else "Disease and symptoms dataset.csv"
OUT_PATH = str(Path(__file__).resolve().parent / "Training_raw_subset.csv")

TARGET_DISEASES = [
    "flu", "migraine", "tension headache", "chronic back pain",
    "pneumonia", "gastritis", "sprain or strain", "common cold",
    "primary insomnia",
]

df = pd.read_csv(RAW_PATH)
print("Raw dataset:", df.shape, "diseases:", df["diseases"].nunique())

missing = [d for d in TARGET_DISEASES if d not in set(df["diseases"])]
assert not missing, f"Missing target diseases in raw data: {missing}"

sub = df[df["diseases"].isin(TARGET_DISEASES)].copy()
feat = sub.drop(columns=["diseases"])
nunique = feat.nunique()
varying_cols = nunique[nunique > 1].index.tolist()
nonzero = feat[varying_cols].sum(axis=0)
useful_cols = [c for c in varying_cols if nonzero[c] > 0]

final = sub[["diseases"] + useful_cols].reset_index(drop=True)
print("Selected subset:", final.shape)
print("Samples per class:")
print(final["diseases"].value_counts())


def clean(col: str) -> str:
    col = col.strip().lower()
    col = col.replace(".1", "_secondary")
    col = col.replace("-", " ").replace("/", " ").replace(",", "")
    col = col.replace("(", "").replace(")", "")
    return "_".join(col.split())


rename_map = {c: clean(c) for c in final.columns if c != "diseases"}
final = final.rename(columns=rename_map)
final = final.rename(columns={"diseases": "prognosis"})
ordered_cols = [c for c in final.columns if c != "prognosis"] + ["prognosis"]
final = final[ordered_cols]

final.to_csv(OUT_PATH, index=False)
print("Saved to", OUT_PATH)
print("Feature columns:", [c for c in ordered_cols if c != "prognosis"])
