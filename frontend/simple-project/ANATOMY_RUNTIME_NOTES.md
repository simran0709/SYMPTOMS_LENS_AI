# SymptomLens AI — 3D Anatomy Runtime Notes

## Final anatomy behavior

- Female anatomy is loaded from the bundled `public/anatomy/female-atlas.glb`.
- Male anatomy remains the real Anatria/Z-Anatomy system sources already used by the project and is loaded lazily by system.
- The body surface is translucent so internal anatomy remains visible.
- Mapped anatomy structures receive subtle organ-specific tinting even when inactive.
- The selected real mesh receives a strong organ-specific color plus a continuous pulse/emissive blink.
- Clicking the anatomy viewport prefers a real mapped organ over the transparent skin shell.
- Clicking the organ list uses the same real mesh target.
- Selecting an organ never auto-zooms the camera.
- The redundant `Explore <organ>` action was removed from the report because it opened the same anatomy viewer.

## Female GLB inspection

The supplied `female-atlas.glb` is glTF 2.0, 31,548,720 bytes, with 1,095 nodes and 888 meshes. The inspected scene graph contains real meshes for Brain, Heart, Lungs, Liver, Kidneys, Gallbladder, Spleen, Bladder, Pancreas, Large Intestine, Uterus, Ovaries, Pelvis and vertebral structures. The source file did not expose a node/mesh whose name classified as `Stomach`, so the viewer does not fabricate one.
