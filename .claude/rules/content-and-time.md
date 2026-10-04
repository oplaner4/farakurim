---
paths:
  - "src/content/**"
  - "src/lib/**"
  - "src/hooks/**"
  - "src/components/**"
---

# Content, dates and "now"

## Time-dependent rendering

Server Components run **at build time**. Anything that depends on "now" (next mass, countdown, which
news are current) is rendered with the build timestamp (`src/lib/build-time.ts`) and re-computed in the
browser through `useNow()` / `useToday()` (`src/hooks/use-now.ts`, `useSyncExternalStore`, no hydration
mismatch). Client components get `renderedAt={BUILD_TIME}` as a prop; never call `Date.now()` during render.
Accepted trade-off: content only changes on rebuild and redeploy, and visitors without JS see the
build-time next mass.

## Content and data

- All content lives in `src/content/`, typed by `src/content/types.ts`. Components and `src/lib`
  only depend on those types, so a real API or CMS can replace the files later without touching the UI.
  `src/content/content.test.ts` checks the data itself (valid dates and times, unique IDs, order, `/uploads/` links);
  extend it when a content type gains a rule a typo could break.
  Aktuality, ohlášky and albums are added with the `farnost-create-*` skills (CLAUDE.md "Managing content");
  their uploaded files are linked root-relative (`/uploads/…`, absolute only where a URL leaves the page, e.g.
  JSON-LD), never committed.
- Dates are ISO `YYYY-MM-DD`, times `H:MM`, both **Europe/Prague wall-clock**. Use `pragueDateTime()` /
  `pragueDate()` from `src/lib/prague.ts` and pass `{ in: inPrague }` to date-fns functions;
  never use the browser's local time zone for schedule maths.
- Schedule (`content/masses.ts`): `regularServices` is the weekly schedule, one data source for the homepage
  next mass and Pořad bohoslužeb. Rows without a `title` are masses; titled rows ("Adorace") are mass-like services.
  Both count for the homepage countdown, which says "Nejbližší mše svatá" for a mass and "Nejbližší bohoslužba" with
  the title otherwise. First-Friday/Saturday variants use `rule: "first-in-month"` (and `"not-first-in-month"` for
  what they replace). Exceptions (`scheduleExceptions`) **replace the whole day's services**, titled ones included;
  never hard-code those variants in logic.
- Ohlášky (`content/ohlasky.ts`, design §14.5–14.7): one `ServiceSheet` per week with `days[].rows[]` and
  `announcements[]`. For every day from `validFrom` to `validTo` the sheet's `mass` and `service` rows (adoration,
  "Velikonoční obřady"; never funerals, baptisms, weddings) are the day's only services (`sheetExceptions()`), never
  combined with `regularServices`; after the week the regular schedule applies. `changed` only adds the "změna" tag. Intentions are published word for word, names included (the parish's decision: the PDF
  is public too). A row the user asks to hide gets `public: false`, which keeps its `detail` off the web: the module
  is `server-only`, pages pass `publicDays()` and client components get only props, never the module.
- Petrklíč (`content/petrklic.ts`): one record per issue, newest first, added with `farnost-create-petrklic`; the
  volume is computed (`volumeOf()`). Each issue is one folder uploaded to `/uploads/petrklic/<id>/`: the PDF
  `petrklic-<id>.pdf`, `cover.webp` and the current issue's viewer `pages/<n>.webp` (rendered by `pnpm petrklic`).
- Calendars (Kalendář, homepage "Tento týden"): the parish's two Google Calendars ("Mše, adorace" = `services`,
  "Události" = `events`, `parishCalendars` in `content/site.ts`) are the source, because visitors subscribe to
  them. `loadCalendarEntries()` (`content/calendar.ts`) reads them at build time with `singleEvents=true` (Google
  expands recurrences and exceptions) for the prerendered range (Kalendář: the previous month and the next six;
  homepage: the build's week, the one before and the next four; "Tento týden" always runs Monday to Sunday). `useCalendarEntries()` re-reads every shown range in the browser and merges it over the
  build's entries (`mergeEntries()`); a range outside the prerendered one is dimmed with a loading or error message
  until Google answers. Without `NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY` the entries are mock data generated from
  `regularServices` and the Aktuality records, nothing is fetched, and paging stops at the prerendered months. An Aktuality record links to its calendar event through `calendarEventId`. The weekly table and the
  next-mass countdown still use `regularServices` / `scheduleExceptions`.
- Fotogalerie (`content/gallery.ts`): Zonerama albums, newest first, with `photoCount` and optional `photos`
  (`small`/`large` URLs). The mock data has no photos, so the strips and the homepage carousel show `photoCount`
  designed placeholders; alt texts are computed (`photoAlt()` in `src/lib/gallery.ts`).
- Office hours (`content/site.ts`): weekly slots with an optional yearly `closed` break; the live status is
  `officeStatus()` in `src/lib/office.ts`.
- Czech output: `plural()` (built on `Intl.PluralRules("cs")`), date-fns `cs` locale (genitive month names
  after a day number), `"4. 10."` short dates, `"Dnes"`/`"Zítra"` labels; see `src/lib/czech.ts`.
- **No i18n library** (next-intl and the like) while the site is Czech-only. UI copy stays inline in the components
  and Czech grammar stays in `src/lib/czech.ts`. **Why:** `czech.ts` is Czech grammar on date-fns, not translatable
  strings. `plural()` is mostly called from pure `src/lib` functions, where next-intl would only wrap the same
  `Intl.PluralRules`. Under `output: "export"` next-intl also needs explicit `locale`/`timeZone`/`now` on its provider
  to stay static. Revisit only when a second language is planned. The real decision then is URLs: static export
  forces a `/cs/…` prefix on every page (no locale negotiation, no localized pathnames).
- External links to the live site sit in `content/site.ts` (`links`); swap them when the pages are rebuilt here.
