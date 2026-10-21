# SymptomLens AI — Frontend

Vite + React frontend for the Phase 2 project.

## Run

```powershell
npm.cmd install --legacy-peer-deps
npm.cmd run dev
```

The frontend expects the backend at `http://localhost:8000` by default. Set `VITE_API_URL` in a local `.env` file when a different backend URL is required.

## 3D anatomy

The viewer supports separate female and male anatomy profiles, a fixed whole-body camera, drag rotation, transparent/subdued body layers, real mapped structures, and in-place organ highlighting. Wheel zoom is disabled.

Female uses the bundled `public/anatomy/female-atlas.glb`. Male uses the pinned Anatria/Z-Anatomy system GLBs fetched lazily by anatomy system.

Male internal structures receive organ-specific colors when the source material is near-white, and the selected real mesh receives a stronger pulse. No procedural or placeholder anatomy is generated.

## Model-confidence display

The UI preserves the raw Random Forest output. When the anatomy target is recognized but the 54-feature model has no matching positive feature, the report shows `0.0%` with the explicit label `No matching RF feature` instead of leaving the value unexplained.

See `ANATOMY_ATTRIBUTION.txt` for upstream anatomy sources and licensing notes.
