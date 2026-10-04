---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Links

- **A link to another site opens in a new tab** (`target="_blank" rel="noopener noreferrer"`). External means an
  absolute `http(s)` URL outside farakurim.cz (Zonerama, Mapy.cz, Google Calendar, social networks, partners).
  Relative links, `/uploads/…` files, `mailto:`, `tel:` and links to the parish's own domain stay in the same tab.
- Use the helpers in `src/lib/shared/links.ts`, never hand-written attributes:
  - `{...NEW_TAB}` on an `<a>` that always leads elsewhere (`mapHref()`);
  - `{...externalLinkAttrs(href)}` on an `<a>` whose href may be either (content links, generic components);
  - `ButtonLink` applies it by itself;
  - content HTML (Aktuality `body`, ohlášky `html`) goes through `withExternalLinkTargets()` where it is rendered,
    so the `farnost-create-*` skills write plain `<a href="…">`.
