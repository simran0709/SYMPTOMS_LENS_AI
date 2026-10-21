# SymptomLens AI — Phase 2 Final Corrected

Educational/research prototype containing the existing SymptomLens Phase 2 application, its prepared Random Forest dataset, safety/follow-up logic, and corrected 3D anatomy integration.

## Data / ML

The runtime model uses `backend/dataset/Training.csv` (6,276 rows, 54 symptom features and 9 supported condition classes). The file is preserved exactly from the stable Phase 2 base. The original large raw dataset is intentionally not included in the final package.

Claude is optional enrichment only; it does not replace the RF prediction engine.

## Anatomy

**Female** — local `frontend/simple-project/public/anatomy/female-atlas.glb`, supplied from the Femora/HuBMAP female reference asset.

**Male** — real Anatria / Z-Anatomy → BodyParts3D system GLBs, pinned to revision `6320bd6`, fetched by anatomy system.

The viewer keeps the transparent body presentation, uses real anatomical meshes, applies a strong organ-specific pulse to the selected mesh, and never generates placeholder geometry.

## Run

Use `RUN_PROJECT.cmd` or the commands in `START_HERE.md`. Frontend installation uses `--legacy-peer-deps` because the existing dependency tree has a Three.js peer-version mismatch.

## Important

Model probabilities are not clinical certainty. This is not a medical diagnosis. Anatomy highlighting is an educational visualization target.
