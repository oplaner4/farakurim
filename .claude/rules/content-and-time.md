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
news are current) is rendered with the build timestamp (`src/lib/shared/build-time.ts`) and re-computed in the
browser through `useNow()` / `useToday()` (`src/hooks/use-now.ts`, `useSyncExternalStore`, no hydration
mismatch). Client components get `renderedAt={BUILD_TIME}` as a prop; never call `Date.now()` during render.
Accepted trade-off: content only changes on rebuild and redeploy, and visitors without JS see the
build-time next mass.

## Content and data

- All content lives in `src/content/`, typed by `src/content/types/` (one file per domain, `structure.md`). Components and `src/lib`
  only depend on those types, so a real API or CMS can replace the files later without touching the UI.
  `src/content/content.test.ts` checks the data itself (valid dates and times, unique IDs, order, `/uploads/` links);
  extend it when a content type gains a rule a typo could break.
  Aktuality, ohlášky and albums are added with the `farnost-create-*` skills (CLAUDE.md "Managing content");
  their uploaded files are linked root-relative (`/uploads/…`, absolute only where a URL leaves the page, e.g.
  JSON-LD), never committed.
- Dates are ISO `YYYY-MM-DD`, times `H:MM`, both **Europe/Prague wall-clock**. Use `pragueDateTime()` /
  `pragueDate()` from `src/lib/shared/prague.ts` and pass `{ in: inPrague }` to date-fns functions;
  never use the browser's local time zone for schedule maths.
- Schedule (`content/masses.ts`): `regularServices` is the weekly schedule, one data source for the homepage
  next mass and Pořad bohoslužeb. Rows without a `title` are masses; titled rows ("Adorace") are mass-like services.
  Both count for the homepage countdown, which says "Nejbližší mše svatá" for a mass and "Nejbližší bohoslužba" with
  the title otherwise. First-Friday/Saturday variants use `rule: "first-in-month"` (and `"not-first-in-month"` for
  what they replace). Exceptions (`scheduleExceptions`) **replace the whole day's services**, titled ones included;
  never hard-code those variants in logic.
- Ohlášky (`content/ohlasky.ts`, design §14.5–14.7): one `ServiceSheet` per week (or two weeks around holidays; `isOneWeek()` switches the labels) with `days[].rows[]` and
  `announcements[]`. For every day from `validFrom` to `validTo` the sheet's `mass` and `service` rows (adoration,
  "Velikonoční obřady"; never funerals, baptisms, weddings) are the day's only services (`sheetExceptions()`), never
  combined with `regularServices`; after the week the regular schedule applies. `changed` only adds the "změna" tag; `markChanges()` sets it on masses that are not in the regular schedule. Intentions are published word for word, names included (the parish's decision: the PDF
  is public too). A row the user asks to hide gets `public: false`, which keeps its `detail` off the web: the module
  is `server-only`, pages pass `publicDays()` and client components get only props, never the module.
- Petrklíč (`content/petrklic.ts`): one record per issue, newest first, added with `farnost-create-petrklic`; the
  volume is computed (`volumeOf()`). Each issue is one folder uploaded to `/uploads/petrklic/<id>/`: the PDF
  `petrklic-<id>.pdf`, `cover.webp` and the current issue's viewer `pages/<n>.webp` (rendered by `pnpm petrklic`).
- Calendars (Kalendář, homepage "Tento týden"): the parish's two Google Calendars ("Bohoslužby" = `services`,
  "Události" = `events`, `parishCalendars` in `content/site.ts`) are the source, because visitors subscribe to
  them. `loadCalendarEntries()` (`content/calendar.ts`) reads them at build time with `singleEvents=true` (Google
  expands recurrences and exceptions) for the prerendered range (Kalendář: the previous month and the next six;
  homepage: the build's week, the one before and the next four; "Tento týden" always runs Monday to Sunday). `useCalendarEntries()` re-reads every shown range in the browser (TanStack Query, one query per range) and merges it over the
  build's entries (`mergeEntries()`); a range outside the prerendered one is dimmed with a loading or error message
  until Google answers. Without `NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY` the entries are mock data generated from
  `regularServices` and the Aktuality records, nothing is fetched, and paging stops at the prerendered months. An Aktuality record links to its calendar event through `calendarEventId`. The weekly table and the
  next-mass countdown still use `regularServices` / `scheduleExceptions`.
- Fotogalerie (`content/gallery.ts`): Zonerama albums, newest first, with `photoCount` and optional `photos`
  (`small`/`large` URLs). The mock data has no photos, so the strips and the homepage carousel show `photoCount`
  designed placeholders; alt texts are computed (`photoAlt()` in `src/lib/gallery/albums.ts`). A photo opens the
  lightbox (DESIGN.md §21) at `#album-<id>-foto-N`; an event poster that is an image opens it at `#plakat` (detail page)
  or `#plakat-<event id>` (Aktuality), a PDF poster opens in the browser.
- Finanční podpora (`content/support.ts`, design §22): the projects of the year with budget, grants, gifts and
  the optional work done (whole Kč, valid on `asOf`), the regular gifts (VS 1111) and the Fond PULS years (`null` =
  not known yet). Progress, the IBAN and the QR Platba string are computed in `src/lib/support/payment.ts`; the QR
  is drawn at build time by `PaymentQr` (a Server Component), so `qrcode` never reaches the browser.
- Starší projekty (`content/support-archive.ts`, design §28): the yearly accounts of the finished projects, newest
  year first, `null` where a value was not recorded ("—"); the totals and the "Dokončeno · 2019–2025" span are
  computed (`src/lib/support/past-projects.ts`).
- Kronika (`content/chronicle.ts`, design §26): eras of entries with a `year` and, for a span, `until` (1766–1772
  is `year: 1766, until: 1772`) and the old chronicle's wording; `milestone` highlights an entry. The timeline sorts
  them (`byYear()`) and writes the years (`formatYears()`).
- Seznam aktivit (`content/activities.ts`, §25): groups of activities with names-only contacts (GDPR); "hledáme" in
  `contacts` marks an activity looking for help (`seeksHelp()`), `href` links its own page. Výuka náboženství
  (`content/religious-education.ts`, §24): the school year, one timetable per school, the form and rules under
  `/uploads/vyuka-nabozenstvi/` and the contact; update it each September.
- Group pages (`content/groups.ts`, §27, §27.1): one `GroupPage` per group (Schola, Chrámový sbor, Společenství
  mládeže, Katecheze pro děti), served at `/aktivity/<id>/` by `src/app/aktivity/[skupina]/` like its breadcrumb
  (`public/.htaccess` redirects the old URLs), every block optional; texts the old pages lacked are drafts from the
  design that each group should confirm; photos and video thumbnails are uploaded to `/uploads/skupiny/<group>/` (WebP, `small` 480 px
  square, `large` ≤ 1600 px). The hero and the photos share one lightbox at `#foto-N` (the hero is
  `#foto-1`, `groupPhotoSet()`). Videos play from youtube-nocookie.com only after a click. "Další skupiny" lists the other
  group pages in `groupPages` order. "Příští setkání" (`nextMeeting.calendarTitle`) is the next entry of the parish
  calendars whose title contains that text (`src/lib/activities/meetings.ts`): read at build time for eight weeks
  and re-read in the browser like the other calendars; hidden when there is none.
- Pages not rebuilt yet (`content/planned-pages.ts`): every old-site URL from farakurim.cz/sitemap has a page with
  its breadcrumb and "Stránku připravujeme" (noindex, not in the sitemap), built by `src/app/[...stranka]/` and,
  under Seznam aktivit, `src/app/aktivity/[skupina]/(…)`. The groups and the extra catechesis live under
  `/aktivity/`; `public/.htaccess` redirects their old URLs. Remove a page from the list when it is rebuilt.
- Odkazy (`content/web-links.ts`, design §23): link groups with a colour; "Obce farnosti" reuses `parish.villages`
  (also the footer), and the card's domain is computed (`displayDomain()`).
- Office hours (`content/site.ts`): weekly slots with an optional yearly `closed` break; the live status is
  `officeStatus()` in `src/lib/contacts/office-hours.ts`.
- Czech output: `plural()` (built on `Intl.PluralRules("cs")`), date-fns `cs` locale (genitive month names
  after a day number), `"4. 10."` short dates, `"Dnes"`/`"Zítra"` labels; see `src/lib/shared/czech.ts`.
- **No i18n library** (next-intl and the like) while the site is Czech-only. UI copy stays inline in the components
  and Czech grammar stays in `src/lib/shared/czech.ts`. **Why:** `czech.ts` is Czech grammar on date-fns, not translatable
  strings. `plural()` is mostly called from pure `src/lib` functions, where next-intl would only wrap the same
  `Intl.PluralRules`. Under `output: "export"` next-intl also needs explicit `locale`/`timeZone`/`now` on its provider
  to stay static. Revisit only when a second language is planned. The real decision then is URLs: static export
  forces a `/cs/…` prefix on every page (no locale negotiation, no localized pathnames).
- The site's routes sit in `content/site.ts` (`links` and the "Více" menu / footer groups `navGroups`); a page not
  rebuilt yet is linked to its placeholder (`planned-pages.ts`), never to the old site. "Tábor <year>" and the footer © follow `BUILD_YEAR`.
