---
paths:
  - "src/components/**"
  - "src/app/**"
---

# Accessibility

`<html lang="cs">`; one visually hidden `<h1>` (the parish name), then an `<h2>` per section. Real `<a>`/`<button>`
elements; icon-only buttons need a Czech `aria-label`, never a `title`. The theme toggle and the lightbox's icon
buttons show it as a tooltip (`Tooltip` in `src/components/ui/`, DESIGN.md §5 Tooltips: CSS, no library, as a
positioning library would add ~29 kB gzipped to every page). The menu toggle uses `aria-expanded` + `aria-controls`.
Touch targets ≥ 44 px. Decorative elements are `aria-hidden`. Respect `prefers-reduced-motion`
(the carousel autoplay is off under it and stops for good once the visitor uses the controls).
