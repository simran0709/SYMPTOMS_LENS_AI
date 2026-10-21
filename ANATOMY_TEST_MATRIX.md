# Anatomy Test Matrix

| Input / action | Expected anatomy target |
|---|---|
| Headache / Brain | Brain visibly pulses |
| Chest pain / Heart | Heart visibly pulses |
| Breathing difficulty / Lungs | Lungs visibly pulse |
| Stomach pain | Stomach only when the loaded source has a real stomach mesh; otherwise honest unavailable message |
| Kidney pain / Kidneys | Kidneys visibly pulse |
| Burning urination / Bladder | Bladder visibly pulses |
| Back pain / Spine | Vertebral/spine structures visibly pulse |
| Joint pain / Joints | Real joint structures visibly pulse |
| Female period cramps / Uterus | Uterus visibly pulses |
| Female ovary pain / Ovaries | Ovaries visibly pulse |
| Male testicular pain / Testes | Testes visibly pulse |
| Male prostate pain / Prostate | Prostate visibly pulses |
| Open 3D Body with no selected organ | Full anatomy loads; no organ is falsely highlighted |
| Click real organ in viewport | That real organ becomes selected and pulses; transparent shell must not steal the click when an internal organ is hit |
