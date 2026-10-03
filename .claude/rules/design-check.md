---
paths:
  - "src/components/**"
  - "src/app/**"
  - "design/**"
---

# Checking against the design

Check every visual change in a browser (Playwright or Claude in Chrome) at **390, 834 and 1440 px**,
in both themes (emulate `prefers-color-scheme: dark` for the dark mockups).

The mockups are design-tool templates (`<x-dc>`, `<sc-if>`, `{{holes}}`) and cannot be opened directly.
`pnpm mockups` renders them to `.design-preview/` and serves them at http://localhost:4174/mockups/
(`<page>/light/mobile-390.html`, `tablet-834.html`, `desktop-1440.html`, and `<page>/dark/*-dark.html`; pages: `home`, `aktuality`, `archiv`, `detail`, `porad-bohosluzeb`, `kontakty`, `kalendar`, `petrklic`, `petrklic-archiv`). Serve the build with `pnpm preview` and compare
screenshots plus block positions (`getBoundingClientRect()` of each `section[aria-labelledby]`).

- The mockup frames are fixed-width, so give the browser a viewport ~15 px wider for the scrollbar.
- The frames also have a fixed height: the gap above the mockup footer is not part of the design.
- Known, intentional differences: real photos instead of tinted placeholders, the countdown values,
  designed placeholders instead of the `[foto alba]` / `[plakát akce]` labels, real Petrklíč covers and pages instead of
  `[obálka]` / `[strana]`, the ohlášky intentions left out (or shown) instead of `[úmysl]` / `[jméno]`, and calendar entries: the build
  links every Aktuality event and keeps a mass in the services calendar when an event shares its time.
