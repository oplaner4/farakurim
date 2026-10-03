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

- All content lives in `src/content/`, typed by `src/content/types.ts`. Components and `src/lib`
  only depend on those types, so a real API or CMS can replace the files later without touching the UI.
  Aktuality, ohlášky and albums are added with the `farnost-create-*` skills (CLAUDE.md "Managing content");
  their uploaded files are linked root-relative (`/uploads/…`, absolute only where a URL leaves the page, e.g.
  JSON-LD), never committed.
- Dates are ISO `YYYY-MM-DD`, times `H:MM`, both **Europe/Prague wall-clock**. Use `pragueDateTime()` /
  `pragueDate()` from `src/lib/prague.ts` and pass `{ in: inPrague }` to date-fns functions;
  never use the browser's local time zone for schedule maths.
- Schedule (`content/masses.ts`): `regularServices` is the weekly schedule, one data source for the homepage
  next mass and Pořad bohoslužeb. Rows without a `title` are masses (only those count as the next mass);
  first-Friday/Saturday variants use `rule: "first-in-month"` (and `"not-first-in-month"` for what they replace).
  Exceptions (`scheduleExceptions`) **replace the whole day's masses**; never hard-code those variants in logic.
- Ohlášky (`content/ohlasky.ts`, design §14.5–14.7): one `ServiceSheet` per week with `days[].rows[]` and
  `announcements[]`. A day with a `changed` mass row becomes a schedule exception (`sheetExceptions()`), so a change is
  entered once. Rows with `public: false` keep their `detail` (intentions, funeral names) off the web: the module is
  `server-only`, pages pass `publicDays()` and client components get only props, never the module.
- Petrklíč (`content/petrklic.ts`): one record per issue, newest first, added with `farnost-create-petrklic`; the
  volume is computed (`volumeOf()`). The PDF, the cover and the current issue's viewer pages (WebP files rendered from
  the PDF by `pnpm petrklic`) are uploaded to `/uploads/petrklic/` (`<id>.pdf`, `<id>.webp`, `<id>/<n>.webp`).
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
