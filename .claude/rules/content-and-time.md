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

## Dates and Czech output

- Dates are ISO `YYYY-MM-DD`, times `H:MM`, both **Europe/Prague wall-clock**. Use `pragueDateTime()` /
  `pragueDate()` from `src/lib/shared/prague.ts` and pass `{ in: inPrague }` to date-fns functions;
  never use the browser's local time zone for schedule maths.
- Czech output: `plural()` (built on `Intl.PluralRules("cs")`), date-fns `cs` locale (genitive month names
  after a day number), `"4. 10."` short dates, `"Dnes"`/`"Zítra"` labels; see `src/lib/shared/czech.ts`.
- **No i18n library** (next-intl and the like) while the site is Czech-only. UI copy stays inline in the components
  and Czech grammar stays in `src/lib/shared/czech.ts`. **Why:** `czech.ts` is Czech grammar on date-fns, not translatable
  strings. `plural()` is mostly called from pure `src/lib` functions, where next-intl would only wrap the same
  `Intl.PluralRules`. Under `output: "export"` next-intl also needs explicit `locale`/`timeZone`/`now` on its provider
  to stay static. Revisit only when a second language is planned. The real decision then is URLs: static export
  forces a `/cs/…` prefix on every page (no locale negotiation, no localized pathnames).

## Content and data

- All content lives in `src/content/` (hand-edited data only; build-time fetches and values derived from content live in `src/server/`, `structure.md`), typed by `src/content/types/` (one file per domain, `structure.md`). Components and `src/lib`
  only depend on those types, so a real API or CMS can replace the files later without touching the UI.
- A `<domain>.test.ts` beside each content file (`news/news.test.ts` for the events, shared checks in
  `src/test/content-checks.ts`) checks the data itself (valid dates and times, unique IDs, order, `UPLOADS_PATH` links); extend it when a content type gains a rule a typo could break.
- Content is added and changed with the content skills (CLAUDE.md "Managing content"); its uploaded files are linked root-relative (under `UPLOADS_PATH` in `src/lib/shared/uploads.ts`, absolute only where a URL leaves the page, e.g.
  JSON-LD), never committed.

## Routes and placeholder pages

- The site's routes sit in `content/site.ts` (`links` and the "Více" menu / footer groups `navGroups`); a page not
  rebuilt yet is linked to its placeholder (`planned-pages.ts`), never to the old site. The footer ©
  follows `BUILD_YEAR`; the menu has no "Tábor <year>" link until that year's page is designed (§20.1, §29).
- Pages not rebuilt yet (`content/planned-pages.ts`, which also says which old pages are redirected instead): each
  gets its breadcrumb and "Stránku připravujeme" (noindex, not in the sitemap), built by `src/app/[...path]/` (never
  under `/aktivity/`, where `src/app/aktivity/[group]/` builds only the group pages). Remove a page from the list when
  it is rebuilt.

## Events

- The events are JSON month files (`news/<year>/<MM>.json`) that `news/index.ts` reads and checks with
  `newsEventSchema` on import.
- A cancelled or postponed event keeps its record with a `change` (design §11.9, never a tag), a series' dropped
  meetings are `cancelledMeetings`; the cards, the detail page, the archive, the `.ics` (`STATUS:CANCELLED`) and the
  calendars show it (`isCancelled()`, `eventNote()`, `CalendarEntry.cancelled`, which a Události title starting with
  "Zrušeno: " also sets). A cancelled event is never in "Doporučujeme" or "Další akce".
- A poster that is an image opens the lightbox (DESIGN.md §21) at `#plakat` (detail page) or `#plakat-<event id>`
  (the Aktuality page); a PDF poster opens in the browser.

## Services and calendars

- Schedule (`content/masses.ts`): `regularServices` is the weekly schedule, one data source for the homepage
  next mass and Pořad bohoslužeb. Rows without a `title` are masses; titled rows ("Adorace") are mass-like services.
  Both count for the homepage countdown, which says "Nejbližší mše svatá" for a mass and "Nejbližší bohoslužba" with
  the title otherwise. First-Friday/Saturday variants use `rule: "first-in-month"` (and `"not-first-in-month"` for
  what they replace). Exceptions (`scheduleExceptions()`) **replace the whole day's services**, titled ones included;
  never hard-code those variants in logic.
- Service sheets (`content/service-sheets.json`, design §14.5–14.7): one `ServiceSheet` per week (a week, or two weeks around holidays; `isOneWeek()` switches the labels), loaded and checked by `server/service-sheets.ts` (`serviceSheetsFileSchema`), added in advance by `pnpm stage sheet`. The later changes (`content/schedule-exceptions.json`, loaded and checked by `content/schedule-exceptions.ts` as `laterExceptions`, added with `pnpm add-exception`) are the changes announced for days no sheet covers: after the last sheet, or in a week the parish published no service sheet for. A sheet has `days[].rows[]` and
  `announcements[]`. For every day of every sheet (the newer sheet wins the Sunday two sheets share) the `mass` and `service` rows (adoration,
  "Velikonoční obřady"; never "Pohřeb" or "Křest dětí") are the day's only services (`sheetExceptions()`), never
  combined with `regularServices`; on the days no sheet covers the regular schedule applies, except on
  the `laterExceptions` (changes announced for those days; `scheduleExceptions()` merges them with the sheets' days by
  date and drops the ones a sheet covers). The site shows the sheet whose week has started last (`currentSheet()`), chosen in the browser by `CurrentSheet` / `NextMass` from the build day's choice. Only the sheets and `laterExceptions` are content: the combined
  exceptions are `currentExceptions` in `server/services.ts` (homepage, `server/calendar.ts`). `changed` only adds the "změna" tag; `markChanges()` sets it on masses that are not in the regular schedule. Intentions are published word for word, names included (the parish's decision: the PDF
  is public too). `server/service-sheets.ts` is `server-only`: pages pass what they show and client components get only
  props, never the module.
- Calendars (Kalendář, homepage "Tento týden"): the parish's two Google Calendars ("Bohoslužby" = `services`,
  "Události" = `events`, `parishCalendars` in `content/site.ts`) are the source, because visitors subscribe to
  them. `loadCalendarEntries()` (`server/calendar.ts`) reads them at build time with `singleEvents=true` (Google
  expands recurrences and exceptions) for the prerendered range (Kalendář: the previous month and the next six;
  homepage: the build's week, the one before and the next four; "Tento týden" always runs Monday to Sunday). `useCalendarEntries()` re-reads every shown range in the browser (TanStack Query, one query per range) and merges it over the
  build's entries (`mergeEntries()`); a range outside the prerendered one is dimmed with a loading or error message
  until Google answers. "Bohoslužby" is generated from the content by `pnpm calendar-sync` (run by the release) through `servicesOnDate()`, so a change to how services combine changes that calendar too. A title "Změna: " (the Pořad bohoslužeb page's "změna" tag, `markChanges()`) sets `CalendarEntry.changed`, as "Zrušeno: " sets `cancelled`. A regular service can pause every year with `closed: { from, to }` (summer break), on the whole site. Without `NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY` the entries are a fallback generated from
  `regularServices` and the event records, nothing is fetched, and paging stops at the prerendered months; a release build (`RELEASE_BUILD=1`) fails without the key instead (`src/lib/shared/build-env.ts`). An Události event links to its event record when its description holds the detail page's URL (`eventPaths()`; only pages the build has, `linkablePages` in `server/calendar.ts`). The weekly table and the
  next-mass countdown still use `regularServices` / `scheduleExceptions()`.
- Office hours (`content/site.ts`): weekly slots with an optional yearly `closed` break; the live status is
  `officeStatus()` in `src/lib/contacts/office-hours.ts`.

## Petrklíč and Fotogalerie

- Petrklíč (`content/petrklic.json`, loaded and checked by `content/petrklic.ts` with `petrklicFileSchema` from
  `src/lib/petrklic/schema.ts`): one record per issue (`year`, `number`, `note`, `rev`, `pageCount`), newest
  first, added by `pnpm stage petrklic` (`parish-create-petrklic`); the id (`issueId()`), the URLs (`toIssue()`)
  and the volume are computed (`volumeOf()`), as is each issue's uploaded folder with its PDF, cover and viewer pages
  (`issueFolder()`, a new one per `rev`).
- Fotogalerie (`content/gallery.json`, loaded and checked by `content/gallery.ts` with `galleryFileSchema` from
  `src/lib/gallery/schema.ts`, added by `pnpm add-album`): Zonerama albums, newest first, at most `MAX_ALBUMS`,
  with `photoCount` and optional uploaded `photos` (`albumPhoto()`, `albumSrcSet()`). An album without `photos` shows `photoCount` designed placeholders in the strips and the homepage
  carousel; alt texts are computed (`photoAlt()` in `src/lib/gallery/albums.ts`). A photo opens the
  lightbox (DESIGN.md §21) at `#album-<id>-foto-N`.

## Activities, Tábor and Betlémy

- Seznam aktivit (`content/activities.ts`, §25): groups of activities with names-only contacts (GDPR); "hledáme" in
  `contacts` marks an activity looking for help (`seeksHelp()`), `href` links its own page. Výuka náboženství
  (`content/religious-education.ts`, §24): the school year, one timetable per school, the form and rules and the
  contact; update it each September.
- Group pages (`content/groups.ts`, §27, §27.1): one `GroupPage` per group (Schola, Chrámový sbor, Společenství
  mládeže, Katecheze pro děti), served at `/aktivity/<id>/` by `src/app/aktivity/[group]/` like its breadcrumb
  (`public/.htaccess` redirects the old URLs), every block optional; texts the old pages lacked are drafts from the
  design that each group should confirm. The hero and the photos share one lightbox at `#foto-N` (the hero is
  `#foto-1`, `groupPhotoSet()`). Videos play from youtube-nocookie.com only after a click. "Další skupiny" lists the other
  group pages in `groupPages` order. "Příští setkání" (`nextMeeting.calendarTitle`) is the next entry of the parish
  calendars whose title contains that text (`src/lib/activities/meetings.ts`): read at build time for eight weeks
  and re-read in the browser like the other calendars; hidden when there is none.
- Tábor (`content/camp.ts`, types in `types/camp.ts`, design §29): O táboru, Vedoucí, Kontakt and Ročníky under
  `/farni_tabor/`, with the shared header and sub-navigation (`CampPageHeading`). The texts, the team, the contacts
  and the years come from the old site's pages. `nextCamp` is the "Tábor <year> – připravujeme" panel: add `start`/`end`
  once the dates are known and `href` once the year has its page. The team (`campTeam`, first names only, many are
  minors) is grouped by `role` (`teamGroups()` in `src/lib/camp/team.ts`); a photo is published only with consent;
  the photos share one lightbox at `#foto-N`, in page order. Each year of `campYears` (newest first) links its
  Zonerama album, with a cover photo the parish chose; a year without an album yet shows a tent on its tint.
- Betlémy (`content/nativity.ts`, types in `types/nativity.ts`, design §30): one page at `/betlemy/` (the old
  Rozcestník, Výstava and Putování redirect to it). `nativitySeasons` (newest first) holds one record per exhibition;
  a season takes over on 1. 11. of its year (`currentSeason()`) and its opening days decide the state, before, during
  or after the exhibition (`exhibitionState()`), which orders the blocks, and the status panel (`statusPanel()` in
  `src/lib/nativity/`), all chosen in the browser by `NativityPage` from the build time's choice. `nativityAlbums` are
  the years' Zonerama albums, also the season's own album after it. The photos and the route poster are designed
  placeholders until the parish chooses some. Add the next season before 1. 11.
- The seasonal main-menu item (design §4.1a): Petrklíč's place shows Betlémy from 1. 11. to the exhibition's last day
  and Tábor from 1. 3. to `nextCamp.end` (none while the end is unset), computed from the content by
  `server/seasonal-nav.ts` (`seasonalPeriods()`) and picked in the browser by `SeasonalNavItem`.

## Parish pages

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
- Pastorační rada (`content/parish-council.ts`, no mockup): the term, the members (names only, as the council
  publishes them) and the meeting reports, newest first, as the council's HTML (`/pastoracni_rada/clenove/` and
  `/zapisy/`, each report at `#zasedani-<date>`). Kněží – rodáci (`content/native-priests.ts`): the old page's
  wording, in its order. Synoda and Dotazníky – GDPR are fixed texts in their pages.
- Odkazy (`content/web-links.ts`, design §23): link groups with a colour; "Obce farnosti" reuses `parish.villages`
  (also the footer), and the card's domain is computed (`displayDomain()`).

## Uploads no script stages

Most uploaded files are staged by the content scripts. These are placed by hand in the staging folder under
`UPLOADS_PATH`, and the release uploads them like the others:

- `synoda/`: the Synoda and Dotazníky – GDPR files;
- `knezi-rodaci/`: the Krpálek PDF;
- `vyuka-nabozenstvi/`: the Výuka náboženství form and rules;
- `skupiny/<group>/`: the group pages' photos and video thumbnails (WebP, `small` 480 px square, `large` ≤ 1600 px);
- `tabor/vedouci/`: the Tábor team photos (WebP 4:5, `small` 320 px, `large` 720 px);
- `tabor/rocniky/<year>.webp`: the Ročníky cover photos (800 px wide);
- `betlemy/`: the exhibition's plan (`orientacni-planek.pdf`).
