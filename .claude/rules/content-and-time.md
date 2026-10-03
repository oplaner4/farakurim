---
paths:
  - "src/content/**"
  - "src/lib/**"
  - "src/components/**"
---

# Content, dates and "now"

## Time-dependent rendering

Server Components run **at build time**. Anything that depends on "now" (next mass, countdown, which
news are current) is rendered with the build timestamp (`src/lib/build-time.ts`) and re-computed in the
browser through `useNow()` / `useToday()` (`src/lib/use-now.ts`, `useSyncExternalStore`, no hydration
mismatch). Client components get `renderedAt={BUILD_TIME}` as a prop; never call `Date.now()` during render.
Accepted trade-off: content only changes on rebuild and redeploy, and visitors without JS see the
build-time next mass.

## Content and data

- All content is **mock data** in `src/content/`, typed by `src/content/types.ts`. Components and `src/lib`
  only depend on those types, so a real API or CMS can replace the files later without touching the UI.
- Dates are ISO `YYYY-MM-DD`, times `H:MM`, both **Europe/Prague wall-clock**. Use `pragueDateTime()` /
  `pragueDate()` from `src/lib/prague.ts` and pass `{ in: inPrague }` to date-fns functions;
  never use the browser's local time zone for schedule maths.
- Mass schedule (`content/masses.ts`): `regularMasses` is the weekly schedule. Everything else (first Friday and
  first Saturday variants, changes from the ohlášky, cancellations) is a `scheduleExceptions` entry, which
  **replaces the whole day**. Never hard-code those variants in logic.
- Czech output: `plural()` (built on `Intl.PluralRules("cs")`), date-fns `cs` locale (genitive month names
  after a day number), `"4. 10."` short dates, `"Dnes"`/`"Zítra"` labels; see `src/lib/czech.ts`.
- External links to the live site sit in `content/site.ts` (`links`); swap them when the pages are rebuilt here.
