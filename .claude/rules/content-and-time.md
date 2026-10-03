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
- Schedule (`content/masses.ts`): `regularServices` is the weekly schedule, one data source for the homepage
  next mass and Pořad bohoslužeb. Rows without a `title` are masses (only those count as the next mass);
  first-Friday/Saturday variants use `rule: "first-in-month"` (and `"not-first-in-month"` for what they replace).
  Changes from the ohlášky and cancellations are `scheduleExceptions` entries, which **replace the whole day**;
  their human-readable text goes to `serviceSheet.changes`. Never hard-code those variants in logic.
- Calendars (Kalendář, homepage "Tento týden"): the parish's two Google Calendars ("Mše, adorace" = `services`,
  "Události" = `events`, `parishCalendars` in `content/site.ts`) are the source, because visitors subscribe to
  them. `loadCalendarEntries()` (`content/calendar.ts`) reads them at build time with `singleEvents=true` (Google
  expands recurrences and exceptions); `useCalendarEntries()` re-reads the shown range in the browser. Without
  `NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY` it returns mock entries generated from `regularServices` and the Aktuality
  records. An Aktuality record links to its calendar event through `calendarEventId`. The weekly table and the
  next-mass countdown still use `regularServices` / `scheduleExceptions`.
- Office hours (`content/site.ts`): weekly slots with an optional yearly `closed` break; the live status is
  `officeStatus()` in `src/lib/office.ts`.
- Czech output: `plural()` (built on `Intl.PluralRules("cs")`), date-fns `cs` locale (genitive month names
  after a day number), `"4. 10."` short dates, `"Dnes"`/`"Zítra"` labels; see `src/lib/czech.ts`.
- External links to the live site sit in `content/site.ts` (`links`); swap them when the pages are rebuilt here.
