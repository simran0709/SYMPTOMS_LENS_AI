# SymptomLens AI — Anatomy Requirements

## Required behavior implemented

1. Female and male viewers use real anatomical reference geometry only.
2. Female uses the bundled `female-atlas.glb` supplied with this final package.
3. Male uses the real Anatria / Z-Anatomy system assets already integrated by the Phase 2 viewer.
4. No procedural/cartoon anatomy fallback is used.
5. Symptom analysis passes the affected-organ target into the 3D viewer.
6. The transparent body allows internal structures to remain visible.
7. Selected real meshes receive a strong organ-specific pulsing/emissive highlight.
8. Viewport picking prefers a mapped internal organ over the transparent skin shell.
9. Selecting an organ does not auto-zoom.
10. The report no longer contains a redundant `Explore <organ>` button that opens the same viewer.

## Examples

- `I have a headache` -> Brain pulses.
- `I have chest pain` -> Heart pulses.
- `I have shortness of breath and cough` -> Lungs pulse.
- `I have kidney pain` -> Kidneys pulse.
- `I have back pain` -> Spine pulses.
- `I have burning when I urinate` -> Bladder pulses.
- Female `period cramps` -> Uterus pulses.
- Female `ovary pain` -> Ovaries pulse.
- Male `testicle pain` -> Testes pulse.
- Male `prostate pain` -> Prostate pulses.

The supplied female atlas does not provide a separately named stomach mesh. The application reports that limitation instead of fabricating a stomach.
