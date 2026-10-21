# SymptomLens AI — Phase 2 Final Correct

This package preserves the Phase 2 application, prepared ML dataset, and existing working female anatomy while improving male anatomy visibility and selection behavior.

## ML dataset

The backend uses `backend/dataset/Training.csv` (6,276 rows, 54 symptom features, 9 supported condition classes). The raw source dataset is intentionally not used as the runtime model input.

## 3D anatomy

Female: bundled `frontend/simple-project/public/anatomy/female-atlas.glb` from the supplied working female anatomy asset.

Male: real Anatria/Z-Anatomy per-system assets are fetched lazily from a pinned source revision. The project does not generate or substitute fake anatomy.

Male rendering changes in this build:
- internal classified anatomy receives strong organ-specific colors instead of remaining white/grey;
- selected anatomy receives a stronger pulse/glow;
- semantic matching covers detailed Anatria/Z-Anatomy names such as cerebral gyri, atria/ventricles, liver segments, vertebrae, renal substructures, and reproductive structures;
- Spine maps to the real vertebral column rather than only the sacrum;
- Spleen loads from the male lymphatic asset;
- Pelvic Region uses the real pelvic-girdle structures in the skeletal asset;
- clicking a real mapped structure in the 3D model resolves its nearest mapped organ;
- transparent body/surface layers remain subdued so internal anatomy stays readable.

## Run

Backend:
```powershell
cd backend
python -m uvicorn main:app --reload --port 8000
```

Frontend:
```powershell
cd frontend\simple-project
npm.cmd install --legacy-peer-deps
npm.cmd run dev
```

## Tests

Backend unit/API logic:
```powershell
cd backend
python -m pytest -q
```

Packaging checks performed for this build:
- 45 backend tests passed.
- App.jsx TSX transpile/syntax check: 0 diagnostics.
- Male semantic-name coverage check: representative Brain, Heart, Lungs, Liver, Stomach, Kidneys, Small/Large Intestine, Gallbladder, Spleen, Bladder, Spine, Pancreas, Joints, Testes and Prostate names all matched.
- Supplied female GLB is present and valid.
- No procedural anatomy primitives are present in the viewer.
- ZIP integrity check passes.

A final browser/WebGL test of the remote male GLB network requests must still be performed on the Windows machine because the packaging environment has no outbound DNS access.

## Medical disclaimer

Educational/research prototype only. Model probabilities are not clinical certainty and the 3D anatomy visualization is educational.
