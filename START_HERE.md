# SymptomLens Phase 2 — Final Corrected Build

This is the complete Phase 2 project. The backend ML/data pipeline is preserved; the anatomy viewer is the corrected part.

## 3D anatomy

- **Female:** the real supplied `frontend\simple-project\public\anatomy\female-atlas.glb` is bundled locally. No female CDN is required for normal startup.
- **Male:** real Anatria / Z-Anatomy system GLBs are fetched lazily by the selected anatomy system.
- The body remains transparent/subdued so internal anatomy is readable.
- Clicking/selecting a real organ applies a strong organ-specific pulsing highlight.
- No procedural or placeholder anatomy is generated.
- Selecting an organ does not auto-zoom the camera.
- The duplicate `Explore <organ>` action in the report has been removed; use `See This in 3D Anatomy`.

## Windows PowerShell

### Backend
```powershell
cd ".\backend"
python -m uvicorn main:app --reload --port 8000
```

### Frontend
```powershell
cd ".\frontend\simple-project"
npm.cmd install --legacy-peer-deps
npm.cmd run dev
```

## Anatomy checks

1. On the symptom screen click **Select on 3D Body** with no selected organ. The whole selected-gender anatomy should load.
2. Click **Brain**, **Heart**, **Lungs**, **Kidneys**, **Bladder**, **Spine**, etc. in the organ list.
3. The selected real mesh should visibly pulse in its organ-specific colour.
4. Use **Female** and repeat.
5. For male reproductive anatomy, check **Testes** and **Prostate**.

The supplied female atlas is bundled locally and is the source used by the female viewer. The viewer never fabricates anatomy when a requested real structure cannot be mapped.

Do not run an old anatomy download script. Do not run `npm audit fix`.
