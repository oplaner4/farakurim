# Správa farnosti: the pořad bohoslužeb editor

Date: 2026-10-12

## Goal

The parish writes the weekly pořad bohoslužeb (the schedule of services and the ohlášky) into one Word file per year.
Getting a week onto the website means extracting it from that DOCX or its PDF (`pnpm stage porad`, the
`farnost-create-porad-bohosluzeb` skill): the parser has needed 13 commits so far, and the skill still guesses the mass
and service flags, the feast's case, the announcement categories, the bold and the `newsId`.

The parish gets its own editor at **sprava.farakurim.cz** ("Správa farnosti"): one person fills in a week in a form,
pre-filled with the days, feasts, regular masses and last week's announcements, and exports a printable PDF and the
website's JSON. Every judgment the skill makes today becomes a field, a default or a check in the editor, so the import
on the website side guesses nothing.

The editor is the first **module** of an administration that will grow (aktuality, Petrklíč, výjimky are likely
next): the shell, the login, the database, the PDF wrapper and the export format are shared, and a module never
changes another.

Success means:

- the parish's editor writes a normal week in a few minutes without help, and never needs to know a website field
  (`mass`, `service`, `public`) by name;
- the export is a ZIP that `pnpm import-porad` adds to `ohlasky.json` and `uploads/` without edits, and the site
  renders it as it renders a week staged today;
- the PDF prints well in black and white on one A4 page for a normal week, and the priest can read the announcements
  aloud from it;
- the parish can download the whole year as one PDF (the archive the yearly DOCX is kept for).

Decided with the user, not up for change in the plan:

- One editor at the parish, writing one week at a time; plus the maintainer's account. No roles, no search across
  weeks, no planning weeks far ahead.
- Neither the PDF nor the editor imitates the DOCX: the PDF is redesigned (design A below), the editor is a form with a
  live preview.
- Publishing stays manual: export → `pnpm import-porad` → `farnost-publish-content` → `pnpm release` with the
  maintainer's yes. No GitHub automation.
- Feasts are learned from the parish's own DOCX files of 2018–2025 (the user provides them), not from a liturgical
  library.
- The code lives in this repo (a `sprava/` folder, no monorepo or Turborepo); the server side is a thin PHP API.

Out of scope: other modules (only the structure that lets them be added); importing past weeks into the editor
(the DOCX history only feeds the feasts); changing `ServiceSheetRecord` or how the website renders the ohlášky;
retiring `pnpm stage porad` (it stays as the fallback until the parish has switched).

## Architecture

```
sprava.farakurim.cz (its own web root on the hosting, a sibling of /farakurim.cz/)
├── index.html + assets/     the React app, built by Vite from sprava/app
├── robots.txt               Disallow: /
└── api/                     PHP 8.4
    ├── index.php            the one entry point: /api/<module>/<action>
    ├── core/ modules/ migrations/ vendor/
    └── data/                sprava.sqlite, backups/, logs/ (denied to the web, never deployed over)
```

- **Front end:** React 19 + TypeScript, built with Vite into a static SPA. It imports the website's code through the
  `@/` alias: the services types, the zod schema of a sheet, the regular schedule (`masses.ts`) and
  `schedule-exceptions.json`, the Czech and Prague date helpers, `markChanges`, and the new type-to-flag rules. Both
  bundled at build time, so a change to the regular schedule needs an editor redeploy (it changes rarely).
- **API:** plain PHP 8.4 (no framework), PDO SQLite, mPDF (Composer, `vendor/` deployed with the API since the
  hosting has no Composer). Composer's `config.platform.php` is `8.4` because the maintainer's machine runs 8.5.
- **Accounts:** two, created by a CLI script (`php sprava/api/bin/user.php add <login>`); passwords with
  `password_hash`. No admin UI.
- **Hosting requirements** (to confirm with cesky-hosting.cz before the plan's deploy task): a subdomain with its own
  web root and HTTPS, PHP 8.4 with `pdo_sqlite`, `mbstring` and `gd`, `.htaccess` honoured, and a cron job (the nightly
  backup).

### Repository layout

```
sprava/
├── app/
│   ├── shell/            login, layout, navigation, save status and toasts
│   ├── lib/              API client, form controls, shared UI
│   └── modules/porad/    the pořad pages, components and hooks; module.ts registers it
├── api/
│   ├── index.php
│   ├── core/             Db, Auth, Csrf, Json, Migrations, Pdf (mPDF wrapper), Log
│   ├── migrations/       001_core.sql, 010_porad.sql, …
│   ├── modules/porad/    Weeks.php, ServiceTypes.php, Feasts.php, News.php, Export.php, feasts.json, templates/
│   ├── bin/              user.php, backup.php, migrate.php
│   └── tests/            PHPUnit
├── vite.config.ts
└── .env.local            local login and paths (git-ignored)
```

Website side: `scripts/import-porad.ts` (with its lib under `scripts/lib/services/`), the build step that writes
`out/sprava/aktuality.json`, the `sprava` target in `scripts/deploy.sh`, and a `farnost-import-porad` skill.

### Module conventions

- A front-end module exports `module.ts`: `{ id, title, routes, nav }`; the shell builds the navigation and routes from
  the list of modules and knows nothing else about them.
- An API module owns a folder in `api/modules/<id>/`, its actions (`/api/<id>/<action>`), its tables (prefixed:
  `porad_…`) and its migrations. Core never imports a module.
- An export is a ZIP with `manifest.json` (`{ module, schemaVersion, exportedAt, … }`) and the module's files; the
  website imports it with `pnpm import-<module>`.

## Data

SQLite, migrated by `bin/migrate.php` (also run on deploy).

| Table                 | Columns                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `users`               | `id`, `login`, `password_hash`, `failed_logins`, `locked_until`                                                      |
| `porad_weeks`         | `id`, `valid_from`, `valid_to`, `record` (JSON), `status` (`draft` / `exported`), `rev`, `exported_at`, `updated_at` |
| `porad_service_types` | `id`, `title`, `kind` (`mass` / `service` / `other`), `sort`                                                         |
| `porad_feasts`        | `key` (`MM-DD` or `easter±N` or `ot-N` for the Nth Sunday in ordinary time), `name`, `solemnity`                     |

- **A week's `record`** is the website's `ServiceSheetRecord` (`days`, `announcements`) with editor-only fields: per
  row `typeId` and its overrides, per day `confirmedCancellations` (the regular masses the editor confirmed as
  cancelled). `mass` and `service` are not stored but computed on export (see Rules), and the export drops the
  editor-only fields.
  Storing the whole record keeps the export a near copy and lets the website's schema check it as is.
- **Revisions:** editing an `exported` week sets it back to `draft` and its next export gets `rev + 1`; `rev` ≥ 2 is a
  correction (`pnpm import-porad` takes the `--corrected` path).
- **Conflicts:** every save sends the `updated_at` it loaded; a stale one is refused (HTTP 409).
- **Service types** are seeded from the ~45 distinct titles of the 2025 and 2026 DOCX (scripted once, reviewed by the
  maintainer) and grow when the editor adds a new title.
- **Feasts** are seeded from `feasts.json` (below).
- **Backups:** `bin/backup.php` copies the database nightly (SQLite `VACUUM INTO`) to `data/backups/`, keeping 30.

## Rules (shared TypeScript, `src/lib/services/`)

One module turns an editor row into a website row, used by the editor's preview and checks, its export, and
`pnpm import-porad`:

- the row's type sets the kind: `mass` → `mass: true`, `service` → `service: true`, `other` → neither;
- a mass or service outside the parish churches (`place` not a `PlaceId`) sets neither flag (Vranov, Brno BVV);
- the row menu's override ("Na webu počítat jako bohoslužbu") forces `service: true` for that row;
- "Nezveřejňovat úmysl na webu" is `public: false`;
- `changed` is never set by hand: `markChanges` computes it, as today.

## The editor

Approved mockup: `2026-10-12-sprava-porad/editor-mockup.html` (layout B: form + live preview). Czech UI, the
website's font (Oxygen) and colours.

### Week list

The module's home: the year's weeks newest first, each with its status (`rozpracováno` with the last save,
`exportováno` with the date, `oprava N`). "Roční archiv PDF" downloads the year. "+ Nový týden" proposes the Sunday
after the last week's `valid_to` until the next Sunday; both dates can be changed (two-week sheets around Christmas
and Easter). A new week is pre-filled with:

- every date, each with its feast and `solemnity` from `porad_feasts` (Sundays always solemn);
- the regular masses and services of each date from `masses.ts`, with `schedule-exceptions.json` applied;
- last week's announcements, each with a "ponechat / smazat" choice (keep / delete).

### Editing a week

- **Day card:** the date and weekday, the feast (the day's "⋯" menu edits it and toggles "Slavnost"), its rows, and
  "+ přidat".
- **Row:** time, place (a dropdown of the parish churches, or free text for anywhere else), type (a combobox over the
  catalogue showing the kind as a tag: `mše`, `bohoslužba`, `mimo farnost`), and the intention or addition in italics.
  Typing a title the catalogue lacks offers "+ nový typ", which asks once: **Co to je?** Mše svatá / Jiná bohoslužba
  (adorace, modlitba) / Ostatní (pohřeb, křest, svatba, zpověď…), and saves the type.
- **Row menu "⋯":** move up/down, duplicate, "Nezveřejňovat úmysl na webu" (shows 🔒 on the row), "Na webu počítat
  jako bohoslužbu", delete.
- **Keyboard:** Tab goes time → place → type → intention; Enter adds a row to the same day with the same place.
- **Ohlášky:** a list in print order; each has a category picker (Změna, Smíření, Pozvánka, Poděkování, Info, coloured
  as on the website, preselected by keywords), a rich text with only bold, italic and links, and "Související
  aktualita" (suggestions from the aktuality list within ±30 days of dates in the text; none is the default).
- **Side panel:** _Kontrola_ (checks), _Jak to uvidí web_ (the next mass and service as the website computes them, the
  rows tagged `změna`, the hidden intentions), and the live PDF preview (HTML in the PDF's layout; "Náhled PDF" opens
  the real PDF).
- **Autosave** 1 s after the last change, with "✓ uloženo" in the bar.

### Checks

Blocking (export is refused until they are resolved):

- a regular mass of a date missing from the week: "Út 13. 10.: chybí pravidelná mše v Kuřimi (8:00). Je zrušená?"
  with "Ano" (stored in the day's `confirmedCancellations`) and "Doplnit" (adds the row);
- placeholder dots ("…", "....") in any text;
- a row without time, place or type; a time out of order is sorted, not flagged;
- an announcement without a category or text;
- the website's zod schema failing (a bug: the message is shown for the maintainer).

### Export

"Exportovat" runs the checks, builds the record (Rules), renders the PDF, and downloads `porad-<validFrom>.zip`:

```
manifest.json   { "module": "porad", "schemaVersion": 1, "validFrom", "validTo", "rev", "exportedAt" }
week.json       the ServiceSheetRecord
week.pdf        the week's PDF
```

The week becomes `exported`. If the PDF fails, nothing is downloaded and the week stays `draft`.

## The PDF (design A, "day blocks")

Approved mockup: `2026-10-12-sprava-porad/pdf-mockup.html`, option A. Rendered by mPDF from a PHP template.

- A4 portrait, Oxygen embedded; black on white, no colour that carries meaning (it prints in black and white).
- Header: "POŘAD BOHOSLUŽEB", the period in words ("11.–18. října 2026"), and "Římskokatolická farnost Kuřim ·
  farakurim.cz" on the right, over a heavy rule.
- One band per day: on the left the date (bold), the weekday (small capitals) and the feast (italic); on the right
  its rows as time (bold, right-aligned) · place (small capitals) · "title – _intention_". No merged cells.
- Sundays and solemnities: a light grey band with heavy rules above and below, the feast in bold capitals.
- Rows hidden from the website are printed like any other.
- "Ohlášky" below, about 10.5 pt, bold kept, links printed as text.
- Fitting: the schedule's spacing tightens first; if the week still does not fit, the announcements continue on page 2. The announcements never go below 10 pt.
- The yearly archive is every week with `valid_from` in that year, newest first, each starting on a new page.

## The website side

- **`pnpm import-porad <zip> [--check]`** reads the manifest, checks `schemaVersion`, the record with the website's
  schema, that `validFrom` and `validTo` agree with the manifest, that every `newsId` exists, and that the
  announcement HTML holds only `p`, `strong`, `em` and `a` (http, https, mailto). It then does what
  `pnpm stage porad --record` does (add the sheet, remove the outdated ones, stage the PDF, `--corrected` for `rev` ≥
  2, run the ohlášky tests), reusing that code, and prints the Google Calendar reminder.
- **`farnost-import-porad` skill:** import, show the week, then `farnost-publish-content`. The create and correct
  skills stay for a DOCX or PDF.
- **Aktuality list:** the build writes `out/sprava/aktuality.json` (`id`, `title`, `start`, `end` of every
  aktualita). `api/porad/news` fetches it from farakurim.cz and caches it for an hour.
- **Deploy:** `scripts/deploy.sh sprava` builds the app and uploads it with `api/` (with `vendor/`) to the subdomain's
  web root, excluding `api/data/`, then runs the migrations. A website release never touches sprava, nor the other
  way round. Like every deploy, it needs the maintainer's explicit yes.
- **Privacy page:** a paragraph on the administration: what it stores (the intentions with names), who has access,
  that it loads no third-party service.

## Feasts from the parish's DOCX

`pnpm sprava:learn-feasts <docx…>` reads the 2018–2025 DOCX files with the existing parser
(`scripts/lib/services/porad-docx.ts`):

- each feast is keyed by its date (`MM-DD`), by its distance from Easter (`easter±N`: Ash Wednesday, Holy Week,
  Pentecost, Corpus Christi, …), or as the Nth Sunday in ordinary time (`ot-N`); Advent, Christmas and Lent Sundays
  by their distance from Christmas or Easter;
- the most frequent wording wins, cased as the parser cases it today; conflicts (two wordings with similar counts, or
  a key that moves) are printed for the maintainer to settle once;
- the result is `sprava/api/modules/porad/feasts.json`, committed and seeded into `porad_feasts`.

The date of Easter: a maintained library if context7 finds a suitable one, otherwise the anonymous Gregorian
algorithm with tests over 2018–2035. A feast is only a suggestion: the editor can always overwrite it.

## Local development

- `pnpm sprava:dev` starts Vite (`localhost:5173`, proxying `/api` to PHP) and `php -S localhost:8080` on `sprava/api`.
- `pnpm sprava:build`, `pnpm sprava:test-api` (PHPUnit and the PHP 8.4 compatibility lint).
- `sprava/api/data/` locally holds a SQLite file that is never committed; `php sprava/api/bin/migrate.php` and a seed
  (service types, feasts, a sample week) set it up.
- The maintainer's machine needs `php8.5-sqlite3` and `php8.5-gd` (missing today).

## Errors

- Autosave failure: "Neuloženo, zkouším znovu", retried with backoff; the unsaved week is kept in `localStorage` and
  offered after a reload.
- Save conflict (409): "Týden byl mezitím změněn. Ponechat moji verzi / Načíst uloženou".
- API errors: JSON `{ "error": "<code>", "message": "<Czech text>" }`, logged to `data/logs/`; `display_errors` off.
- `pnpm import-porad`: refuses with a message naming the field or file, like the stage script.

## Security

- Session cookie `HttpOnly`, `Secure`, `SameSite=Strict`, on the subdomain only; a CSRF token on every request that
  changes data; five wrong passwords lock the account for 15 minutes.
- `api/data/` denied by `.htaccess` (`Require all denied`); `robots.txt` disallows everything and responses send
  `X-Robots-Tag: noindex`.
- The announcement HTML is limited in the editor, cleaned again by the API on save, and checked by
  `pnpm import-porad`: the website renders it as is.

## Testing

- **Vitest** (in the full check): the type-to-flag rules, pre-filling a week, the checks, building `week.json`,
  `pnpm import-porad` against fixture ZIPs, the feast learning against small fixture DOCX files, Easter dates.
- **PHPUnit** (`pnpm sprava:test-api`): login and lockout, CSRF, saving and the 409 conflict, migrations, the PDF
  (renders, one page for a normal week, text extractable), the HTML cleaning.
- **Browser:** Playwright on the editor at 390, 834 and 1440 px (create a week, edit it, export), and the PDF compared
  with mockup A.
- **Trial:** for 2–3 weeks the parish writes each week in both the DOCX and sprava; the import of the ZIP is compared
  with the extraction from the DOCX before the DOCX workflow is retired.

## Order of work

1. Shared rules in `src/lib/services/` and `pnpm import-porad` (testable with hand-made ZIPs).
2. The API core: `index.php`, Db, migrations, Auth, CSRF, users CLI, backups.
3. The pořad API: weeks, service types, feasts, news proxy.
4. The editor: shell, week list, week form, checks, web panel.
5. The PDF (week and year) and the export.
6. Learning the feasts from the 2018–2025 DOCX (needs the files from the user).
7. Deploy target, hosting setup, privacy page, `farnost-import-porad` skill, trial.

## Open points

- The hosting requirements above, confirmed with cesky-hosting.cz.
- The 2018–2025 DOCX files, from the user, for the feasts.
