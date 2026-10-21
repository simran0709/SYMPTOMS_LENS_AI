# SymptomLens AI — Anatomy test plan and expected behavior

## Visual standard
- Keep the working transparent-body presentation.
- Female anatomy uses the bundled real `public/anatomy/female-atlas.glb` and preserves its source colors.
- Male anatomy uses the real Anatria/Z-Anatomy system GLBs and applies organ-specific colors when the source material is near-white.
- Selecting an actual mapped structure causes the real mesh to pulse strongly.
- No fake spheres, boxes, cylinders or procedural replacement anatomy.

## Main flows
- Home `Select on 3D Body` opens the anatomy viewer directly.
- Analysis `See This in 3D Anatomy` opens the viewer with the returned anatomy target.
- Clicking Brain, Heart, Lungs, Liver, Stomach, Kidneys, Bladder, Pancreas, Spleen, Spine, Uterus, Ovaries, Testes or Prostate selects the corresponding real mapped structure when that structure exists in the active atlas.
- Female excludes Testes/Prostate; Male excludes Uterus/Ovaries.

## Confidence behavior
- A real RF-supported symptom with low probability remains a model result and is labeled honestly as insufficient/limited evidence according to the existing evidence policy.
- A symptom that maps to anatomy but has no matching positive feature in the 54-feature RF input is shown as `0.0%` with the explicit label `No matching RF feature` and an explanation that the anatomy mapping is still available.
- Raw model values are never altered to look better and are never described as clinical certainty.

## Verified in this packaging environment
- Backend pytest: **45 passed**.
- Frontend JSX syntax check: **0 diagnostics**.
- Female GLB binary integrity: **PASS**.
- Static source checks: **PASS**.
