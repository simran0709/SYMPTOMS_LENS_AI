# Full Dataset + Female Anatomy Update

This build is based ONLY on `SymptomLens_Phase2_FINAL_MALE_COLOR_BLINK(4).zip`.

## Changes made
- Replaced the Phase 2 `Training.csv` with the supplied `Disease and symptoms dataset(2).csv`.
- Dataset: 246,945 rows, 377 symptom features, 773 disease labels.
- Trained a Random Forest offline and bundled `backend/dataset/rf_full_773.joblib` so FastAPI does not retrain on every startup.
- Model: RandomForestClassifier, 50 trees, max_depth=12, max_features=sqrt, class_weight=balanced, random_state=42, n_jobs=2.
- Added/retained Hindi and Kannada symptom normalization. Examples include headache, fever, cough, nausea, sore throat, dizziness, fatigue, breathing difficulty, chest pain, abdominal pain, back pain, urinary symptoms and others.
- Supported recognized symptoms now return the actual RF prediction instead of being rejected as insufficient evidence merely because fewer than two symptoms were entered.
- Anatomy-only wording with no matching RF feature reports `No dataset prediction` and `No matching RF feature` rather than fabricating a disease probability.
- Safety matching was normalized for the full dataset's space-separated symptom names.
- Female anatomy asset is the supplied local `female-atlas.glb` (SHA-256 matches the uploaded `female-atlas(1).glb`).

## Male anatomy protection
`frontend/simple-project/src/App.jsx` was NOT changed. Its SHA-256 is identical to the source ZIP's App.jsx. The male anatomy implementation was not modified.

## Validation
- Backend tests: 45 passed.
- Manual API smoke tests: English, Hindi and Kannada symptom normalization returned matched RF features and a model prediction; anatomy mapping remained separate from the RF condition.
- Full-dataset evaluation: accuracy 0.4407489879, macro precision 0.6200705647, macro recall 0.5600384905, macro F1 0.5119075756. These are dataset evaluation metrics, not clinical diagnostic accuracy.
- Frontend production build was not verified in this environment because the npm dependency installation did not complete within the available build environment timeout. The source/frontend files were not otherwise modified.
