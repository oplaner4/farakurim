---
paths:
  - "src/components/**"
  - "src/app/**"
---

# Accessibility

`<html lang="cs">`; one visually hidden `<h1>` (the parish name), then an `<h2>` per section. Real `<a>`/`<button>`
elements; icon-only buttons need a Czech `aria-label`. The menu toggle uses `aria-expanded` + `aria-controls`.
Touch targets ≥ 44 px. Decorative elements are `aria-hidden`. Respect `prefers-reduced-motion`
(the carousel autoplay is off under it and stops for good once the visitor uses the controls).
