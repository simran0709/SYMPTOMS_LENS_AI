# Dataset: SymptomLens Phase 1 (v2)

## Source
"Disease and symptoms dataset 2023" (user-provided), raw file: 246,945 rows x 378
columns (377 binary symptom columns + `diseases` label), 773 unique disease labels.

## Why the raw dataset was not used as-is
Phase 1's organ/3D-visualization layer only supports a small, hand-curated set of
conditions (Brain / Lungs / Stomach / Spine). Training on all 773 classes would
require building out organ mappings and visualization targets for hundreds of
diseases unrelated to the existing 3D scene -- that is explicitly Phase 2 scope,
not a Phase 1 change. Instead we selected the subset of the raw data that maps
onto the *existing* Phase 1 concept.

## Selection method (fully mechanical, documented, reproducible: see `build_dataset.py`)
1. Take the 9 condition names the Phase 1 prototype already claimed to support.
2. For each, find the closest **exact, real** label in the raw dataset's 773
   disease names (case-insensitive substring/exact match). No label was invented.
3. Two of the old prototype's labels had no real counterpart:
   - `"Back Pain"` -> mapped to `"chronic back pain"` (closest real label).
   - `"Muscle Strain"` -> mapped to `"sprain or strain"` (closest real label).
   - `"Severe Migraine"` -> **dropped**. It is not a distinct label in the raw
     dataset. The v1 prototype invented this class; it has been removed rather
     than kept or faked.
4. Filtered the raw dataset to only rows whose `diseases` value is one of the
   9 confirmed labels.
5. Filtered symptom columns to those that (a) vary among the selected rows
   (`nunique() > 1`) and (b) are non-zero for at least one selected row. This
   drops ~320 symptom columns from unrelated diseases (e.g. pregnancy,
   ophthalmology, dermatology symptoms with zero relevance to these 9
   conditions) without touching any row's values.
6. No rows were duplicated. No values were edited. No symptom or disease
   label was invented.

## Result
| | Old prototype (v1) | New dataset (v2) |
|---|---|---|
| Rows | 10 | 6,276 |
| Classes | 10 | 9 |
| Samples / class | 1 | 190 - 1,212 |
| Symptom features | 9 | 54 |

Samples per class (v2):

| Condition (raw label) | Samples |
|---|---|
| pneumonia | 1212 |
| sprain or strain | 1212 |
| common cold | 905 |
| chronic back pain | 899 |
| flu | 679 |
| gastritis | 679 |
| tension headache | 279 |
| migraine | 221 |
| primary insomnia | 190 |

The smallest class (190 samples) still yields ~38 held-out test rows at an
80/20 split -- enough for a legitimate, if modest, evaluation. This is a
dataset-quality improvement, not a promise of clinical-grade accuracy.

## Known data-quality note carried over from the source file
The raw CSV contains two columns literally named `regurgitation` (a header
duplication in the source file, not something we introduced). Pandas
auto-suffixes the second occurrence as `regurgitation.1`; we kept this column
(the one that actually varies across our 9 classes) and renamed it
`regurgitation_secondary` for clarity. This is disclosed here rather than
silently renamed away.

## Label values
`prognosis` values are kept exactly as they appear in the source dataset
(lowercase, e.g. `"flu"`, `"chronic back pain"`) so the mapping back to the
source file is traceable. A separate `DISPLAY_NAMES` dict in `model.py`
provides Title Case labels for the UI/API only; it does not change the
underlying data.
