# Bohoslužby calendar sync: design

Status: draft. The release generates the services in the "Bohoslužby" Google Calendar from the content (the regular
schedule, the service sheets and the schedule exceptions), so no skill asks a person to mirror a week's changes in the
calendar by hand. No plan yet. Date: 2026-10-24. Builds on the Události sync
(`docs/superpowers/specs/2026-10-23-udalosti-calendar-sync-design.md`, `pnpm calendar-sync`).

## Intent

The Kalendář page and the homepage week calendar read the parish's "Bohoslužby" Google Calendar, and visitors
subscribe to it (design/DESIGN.md §16). Today it is kept by hand: about 28 repeating events stand for the regular
schedule ("Mše svatá v Kuřimi" every Sunday at 8:00, …), and each week someone compares the new service sheet with
the calendar and fixes the differences: moves an occurrence, deletes one, adds an extra service as a single event.
The service sheet PRs only print a checklist for that (`## Mirror in the calendar`, `pnpm sheet-mirror`).

**Why:** the calendar is a second copy of what the site already knows, and it drifts. On 2026-10-24 it lacked the
9:30 mass of 18 Oct and the 13:00 adoration of 12 Oct that the sheets list, and it shows the Friday masses twice on
27 Nov and 25 Dec (its "4th Friday" and "last Friday" repeating events both fire in a month with four Fridays). The
goal, in the maintainer's words: present the current services schedule also in the calendar. The maintainer's
decisions:

- **The content is the source of truth** for every service in the calendar: `regularServices` (`content/masses.ts`),
  the service sheets (`content/service-sheets.json`) and the schedule exceptions
  (`content/schedule-exceptions.json`), combined exactly as the site combines them for the Pořad bohoslužeb and the
  next-mass countdown.
- **The calendar is regenerated, not patched:** the sync writes one event per service, each carrying a marker, and
  touches only events with that marker. The maintainer ends the hand-made repeating events for the regular services
  once, by hand; what else people add by hand (Modlitba chval, the Lenten Křížová cesta, a one-off) stays theirs.
- It does not have to behave like today's calendar; this is a chance to make it better.

## Goals

- The services of the next six months are in Bohoslužby exactly as the site shows them: regular services, the
  sheets' changes and extra services, the announced later changes, cancellations.
- A change of the regular schedule in `masses.ts`, a new or corrected sheet, an added or removed exception reaches the
  calendar with the next release, after the maintainer's yes, never before.
- The service sheet and schedule exception skills, and the service sheet e-mail pipeline, lose their "mirror it in
  the calendar by hand" steps.
- Regular services can pause for the summer holidays (the Sunday 9:30 mass, the Modlitební večer), on the whole site.

## Non-goals

- **Events without the marker** are never changed or deleted, whatever they are, except a single event the sync
  claims (below).
- **Past events** are not rewritten.
- **Movable seasons** (Lent, Advent: the Křížová cesta) get no rule in `regularServices`: they stay hand-made events or
  come through the sheets and exceptions.
- **Intentions** never go into the calendar.
- **No change to the regular schedule's content** in this project: the Tuesday, Wednesday and non-first Saturday
  masses the calendar repeats today are not confirmed by the parish, so they stay out of `regularServices` and reach
  the calendar week by week through the sheets.
- **No change for visitors' privacy:** no new third-party service in the browser.
- **The Události sync** keeps its rules; only the plumbing (command, credentials, workflow job) is shared.

## Anti-goals (a failure even if it works)

- A hand-made event without the marker changed or deleted (other than a claimed one).
- A service shown twice in the subscribers' phones (a generated event beside a hand-made one for the same service).
- The calendar disagreeing with the Pořad bohoslužeb page for a day inside the window.
- The calendar changed before the maintainer's yes, or a failed sync blocking the deploy.

## How it works

### What the calendar should hold

For every date from today (Prague) to six months ahead (the **window**; the maintainer first chose two months, then
returned to six so the Kalendář, which prerenders six months, never shows months without services), the desired
services are
`servicesOnDate(date, { regular: regularServices, exceptions: currentExceptions })` (`src/lib/services/masses.ts`,
`server/services.ts`): on a day a sheet or an exception covers, exactly its services (the sheet's `mass` and `service`
rows in a parish church; never Tišnov, funerals or baptisms); on any other day the regular services whose rule (and,
new, season) applies. The sync must reuse that logic, not re-implement it, so the calendar and the page cannot
disagree.

Each desired service is one calendar event. On top of them, a **cancelled** event for every regular service of that
date that a sheet or an exception drops (the regular services of the date without the exceptions, minus the desired
ones, matched by time and place).

### The marker and the identity

A generated event is identified by its date, start time and place (and the title for a titled service, so an
"Adorace" and a mass at the same time and church stay apart; the builder's call whether the title is needed).

- Its Google id is derived deterministically from that key (Google allows 5–1024 characters of `a–v` and `0–9`; the
  Události sync's derivation in `scripts/lib/calendar/desired.ts` is the model), with a prefix of its own so it can
  never collide with an Události-style id.
- It carries a marker: the Pořad bohoslužeb URL on the description's last line (my call). The preview reads the
  calendar with the public browser key, and it is not certain that such a read returns `extendedProperties`; the
  description it surely returns, and the Události sync marks its events the same way (the page URL). Ownership is
  decided by the marker, not the id. The id lets a rerun find the event again, and a duplicate insert fails on it.
  Ownership of a claimed event, which keeps its hand-made id, is told apart by the marker alone; its key is its
  date, start time and church, read from the event itself.

A moved service is therefore two events: the regular one at the old time becomes "Zrušeno: …", and the new time is a
new "Změna: …" event. Subscribers see both, which the maintainer accepted as the clearest.

### What an event looks like

```
Mše svatá v Kuřimi
Ne 18. 10., 8:00–9:00
Kostel sv. Maří Magdalény, Křížkovského, 664 34 Kuřim

Slavnost posvěcení farního kostela – 29. neděle v mezidobí

Pořad bohoslužeb: https://www.farakurim.cz/porad_bohosluzeb/
```

- **Title:** "Mše svatá" for a mass, the sheet's or schedule's title for a titled service ("Adorace", "Adorace
  (adorační den farnosti)", "Modlitební večer"), then " v <place>" in the locative ("v Kuřimi", "v Moravských
  Knínicích", "v Jinačovicích"), the style subscribers know.
  - **"Změna: "** in front exactly when the Pořad bohoslužeb page shows the "změna" tag for that service (the
    maintainer's decision: the calendar follows the page). So the rule is `markChanges()`
    (`src/lib/services/service-sheet.ts`), shared, not copied: a mass whose time and place are not a regular mass of
    that date, on a weekday that has a regular mass, plus a row the editor marked `changed: true` by hand. The
    Tuesday and Wednesday masses (no regular mass on those weekdays) and titled services (an extra adoration) get no
    prefix, as they get no tag on the page. A mass of a schedule exception (`schedule-exceptions.json`) gets the
    same rule.
  - **"Zrušeno: "** in front for the cancelled regular services (above). The site already reads this prefix as
    cancelled, for both calendars (`parseTitle()` in `src/lib/calendar/google-calendar.ts`).
  - Special titles the calendar has today ("Hubertská mše svatá", "Dětská mše svatá", "… s Komunitou Emmanuel") are
    not in the content and are lost; accepted.
- **Location:** the church's postal address, as today's events have it ("Kostel sv. Maří Magdalény, Křížkovského,
  664 34 Kuřim"), so phones open a map. The locative and the address are new fields of the places in
  `content/masses.ts` (the builder takes the addresses from today's calendar events; Jinačovice has none, so its
  village name or chapel is the builder's call).
- **Time:** the service's start; the end is one hour later, or the next service's start in the same church when that
  is sooner (the 17:30 adoration ends at the 18:00 mass). The sheets have no end times.
- **Description:** the day's feast from the sheet (`feast`) when there is one; the regular service's `note` ("s
  katechezí pro děti (ve školním roce)"); for a "Zrušeno:" event "Tato bohoslužba se nekoná."; for a "Změna:" event a
  line saying it differs from the regular schedule; then a blank line and the absolute URL of the Pořad bohoslužeb
  (`SITE_URL` + `links.services`). The builder words the Czech lines.
- **No all-day feast events:** feasts are only known for the sheets' weeks, and an all-day entry would count as a
  service in the Kalendář's day labels ("3 bohoslužby").

### Summer break of a regular service

`RegularService` gains an optional yearly break, the shape the office hours already use on Kontakty:
`closed: { from: MonthDay; to: MonthDay }` (`content/types/contacts.ts`; `MonthDay` is in `types/shared.ts`). The
calendar of 2025 and 2026 shows two rows pausing in July and August, and they get
`closed: { from: "07-01", to: "08-31" }`:

- the Sunday 9:30 mass in Kuřim;
- the first-Friday Modlitební večer at 19:00.

`servicesOnDate()` leaves a service out on the days of its break, so the whole site follows: the calendar, the
next-mass countdown, the Kalendář's fallback without a key, `markChanges()`. The Pořad bohoslužeb table shows the
break on the row, the way Kontakty does ("mimo letní prázdniny"; the builder's call how the text is derived and
shown). A week that does not fit the dates (the school year ending before 1 July, an extra 9:30 on 31 August) is
corrected by that week's sheet, as any other day.

### Matching against the calendar

The sync reads Bohoslužby for the window (with `showDeleted`, as the Události sync does, and the masters of
repeating events) and plans per desired event:

1. **Owned:** an event with the marker and the desired id exists: bring it in line (below).
2. **Claimable:** no owned event, and exactly one unmarked **single** (non-repeating) event starts at the same date
   and time and names the same church (its location or its title holds the place's name): the sync adds the marker
   and brings it in line, instead of adding a second event. This covers the extra services people added by hand
   before the switch-over (the 12 Oct "Modlitba růžence a požehnání") and a service someone adds by hand before its
   sheet arrives. Its Google id cannot change, so a claimed event keeps its id. It is found again by the marker and
   its date, start time and church.
3. **New:** neither: the sync inserts the event with its deterministic id.
4. **Deleted by hand:** an owned event someone deleted (Google keeps it with `status: cancelled`): the sync restores
   it (my call: the content is the source of truth, as for hand edits).

And for owned events that are no longer desired (a sheet corrected, a row removed from `regularServices`): the sync
**deletes** them (my call: the sync owns them, and a "Zrušeno:" left for a typo or a schedule rewrite would mislead;
"Zrušeno:" is kept for the announced cancellations of regular services). Only inside the window and not in the past.

**In line** means the title, start, end, location and description are what the content says; only fields that
differ are written (as `differingFields()` in `scripts/lib/calendar/in-line.ts` does), so an event already in line
costs no write and the preview says "nothing to do". Hand edits to owned events are overwritten.

**Reports that change nothing:** an unmarked event on a day in the window, in a parish church, that looks like a
service (its title starts with "Mše" or matches a service title) but could not be claimed (several candidates, or a
different time): a possible duplicate for a person to remove.

### The switch-over (once, by hand)

The hand-made repeating events for the regular services must stop, or every service shows twice. It is a one-time
job, so the maintainer does it by hand in Google Calendar, and the sync has no code for it (the maintainer's
decision):

- The first apply goes through a hand-run `pnpm release`, never a merged content PR, as for the Události sync (a
  repository variable the maintainer sets after it, as `CALENDAR_SYNC`; the builder's call how). Its preview shows the
  about 350 events it adds.
- Right after that release, the maintainer ends each hand-made repeating event the content now generates (sets its
  end in Google Calendar to the day before the release, so its past occurrences stay in the Kalendář's previous month
  and in the subscribers' history): the mass series, "Adorace v Kuřimi" and "Modlitební večer s Komunitou Emmanuel v
  Kuřimi", in Kuřim and Moravské Knínice, the Tuesday, Wednesday and every-Saturday series included. Modlitba chval,
  the Křížová cesta series and anything else stay. Until then, the services show twice for a few minutes.
- The possible-duplicate report (above) lists what is left: the release preview after the switch-over says which
  hand-made events still double a generated service. `docs/deployment.md` describes the step once, for the
  maintainer.
- The duplicated Friday occurrences of 27 Nov and 25 Dec disappear with the series.

### Running it

The same path as the Události sync (`docs/deployment.md` § "Události calendar sync"):

- **Preview** (no write access): reads with the public browser key and prints one line per change and per report, in
  English, quoting the Czech titles. The first run inserts about 350 events; the builder may group the lines by
  day so the preview stays readable.
- **Apply:** rereads the calendar with the service account, then writes; a failed write is reported and the rest goes
  on; a rerun is safe.
- **Plan as data:** the desired events, the matching and the "in line" comparison are pure functions from the content
  and the calendar events to a list of changes and reports, tested without network; reading and writing are the thin
  layers `scripts/lib/calendar/read.ts` and `write.ts` already are.
- **Command:** one `pnpm calendar-sync` previews and applies both calendars (one preview for the release, one job), or
  a sibling command; the builder's call, as long as `pnpm release` and the deploy job show and apply both.

### Where it runs

As the Události sync: `pnpm release` prints the preview with the commits, so the yes covers it; the `calendar` job of
`deploy.yml` applies it after a release tag's deploy and verify; a refresh only previews; `pnpm release --local`
applies it itself; a failure is a warning and never fails the release. A merged service sheet PR releases unattended,
and the merge is the yes for its calendar changes.

The window moves forward only with a release. The sheets come weekly, so the calendar always reaches about six months
ahead, the same range the Kalendář prerenders, so its months are never empty of services; a longer pause without releases shortens it, and the next release catches up.

### Credentials

The service account of the Události sync. One step only the maintainer can do: share Bohoslužby with the service
account's address with "Make changes to events", as was done for Události. Nothing else changes (workload
identity federation, the `calendar-sync` environment).

### Site changes

- **"Změna: " in the Kalendář and the homepage week calendar:** `parseTitle()` also strips a "Změna: " prefix and
  sets a new `changed` flag on `CalendarEntry`; the day detail and the week cards show the orange "změna" tag of the
  Pořad bohoslužeb (§14.6 style) for it. The builder places it in the Kalendář; design/DESIGN.md is not edited (the
  design handoff stays as delivered).
- **The summer break** in `RegularService`, `servicesOnDate()` and the Pořad bohoslužeb table (above).
- **The places'** locative and address (above).

### Skill, pipeline and docs changes

- **`parish-create-service-sheet`, `parish-correct-service-sheet`, `parish-create-exception`,
  `parish-remove-exception`:** the steps asking the user to make the change in the "Bohoslužby" Google Calendar go;
  where the Události preview is shown, the services preview is shown the same way.
- **Service sheet e-mail pipeline** (`.github/workflows/service-sheet.yml`): the PR body's `## Mirror in the
calendar` goes; `pnpm sheet-mirror` and `scripts/lib/services/sheet-mirror.ts` are removed (or replaced by the
  services preview for the PR's days; the builder's call).
- **`parish-release`, `parish-publish-content`:** the release preview lists the changes to both calendars.
- **Docs:** README (commands), `docs/deployment.md` (the sync now covers Bohoslužby, the one-time sharing and
  switch-over), `.claude/rules/content-and-time.md` (the Calendars bullet: Bohoslužby is generated from the content;
  the summer break), the earlier specs' non-goals that point to this project.

## Constraints

- Static export only: the sync is a script and a workflow step; `src/lib` may gain pure helpers it shares with the
  site (`servicesOnDate()` already is one), as `scripts/` imports `src/lib`.
- Where code goes (`.claude/rules/structure.md`): the entry point in `scripts/`, the logic with its tests in
  `scripts/lib/` (beside the Události sync in `scripts/lib/calendar/`, split by topic; helpers both syncs use move to a
  shared module there).
- Prague time throughout (`@date-fns/tz`, `src/lib/shared/prague.ts`); Google takes RFC 3339 with the offset.
- An agent never runs the apply itself outside `pnpm release` after the user's yes.

## Left to the builder

- The preview wording and grouping, the module split, the command shape.
- The id derivation and the marker's property names.
- The Czech description lines and the summer break's text in the Pořad bohoslužeb table.
- Jinačovice's location text.
