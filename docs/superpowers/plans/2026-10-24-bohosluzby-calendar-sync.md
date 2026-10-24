# Bohoslužby calendar sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pnpm services-calendar-sync` previews, and with `--apply` makes, the changes that make the Bohoslužby Google
Calendar hold the services of the next six months as the content says (regular schedule, service sheets, schedule
exceptions); the release shows the preview and the deploy workflow applies it.

**Architecture:** a pure function turns the content into the desired service events (`desiredServices`), a pure
planner compares them with a snapshot of the calendar (`planServices`), and the Události sync's read and write layers,
generalised to take a calendar id, read and write. Ownership is the Pořad bohoslužeb URL in the description. The site
learns a summer break for regular services and shows a "změna" tag for a "Změna: " title.

**Tech Stack:** TypeScript, Node 22 (`fetch`), vitest, date-fns v4 + `@date-fns/tz`, `google-auth-library` (already a
dependency), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-24-bohosluzby-calendar-sync-design.md`. Read it, and the Události sync it
builds on (`scripts/lib/calendar/`, `docs/deployment.md` § "Události calendar sync"), before any task.

## Global Constraints

- `src/content/` is the source of truth; the calendar is generated from it, never read back into it.
- Code, comments, output lines and commits in English; Czech only in published fields (titles, descriptions, notes)
  (`docs/conventions.md`).
- Entry points in `scripts/<command>.ts` are one `runCommand()` call whose header documents the command; logic and
  tests in `scripts/lib/calendar/` (`.claude/rules/structure.md`). Imports `@/…` or `./x`.
- Prague time throughout (`src/lib/shared/prague.ts`); timed Google events carry `timeZone: "Europe/Prague"`.
- The calendar is `parishCalendars.services.googleId`; the Události code paths keep `parishCalendars.events.googleId`
  and their behaviour unchanged (their tests stay green untouched, except imports moved in Task 4 and 6).
- The sync changes only events whose description holds the marker (the Pořad bohoslužeb URL), plus the claim of
  Task 5; it never deletes an unmarked event.
- Never write before the maintainer's yes: only `--apply` writes, and only the deploy workflow and
  `pnpm release --local` run it. An agent never runs `--apply`.
- `GOOGLE_CALENDAR_SERVICE_ACCOUNT` is never printed, never `NEXT_PUBLIC_`, never in the build.
- design/DESIGN.md is not edited.
- A task touching `src/` ends with `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`; one
  touching only `scripts/` with `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit`. Then a
  commit through the `commit` skill. Task 3 (UI) also takes the browser check of `.claude/rules/design-check.md`.

## Review Focus

- **The Sunday two sheets share:** the newer sheet's services and feast win (as `scheduleExceptions()` does). Test in
  Task 4 (`desiredServices` uses the later sheet's `feast`).
- **The DST change (Sunday 25 Oct 2026):** an 8:00 mass that day is `2026-10-25T08:00:00+01:00`, the day before
  `+02:00`. Test in Task 4.
- **A sheet's 9:30 Sunday mass in July:** the regular 9:30 is on its break, so it is a "Změna:" and nothing is
  cancelled. Test in Task 4.
- **A hand-edited description Google returns as HTML** (`<a href="…">`): an owned event is still recognised. Test in
  Task 5 (`isOwned`).
- **An occurrence of a hand-made repeating event at a generated service's time:** never claimed, only reported as a
  possible duplicate (this is how the maintainer checks the hand switch-over). Test in Task 5.

---

### Task 1: Summer break for regular services

**Files:**

- Create: `src/lib/shared/yearly-break.ts`, `src/lib/shared/yearly-break.test.ts`
- Modify: `src/content/types/shared.ts` (add `YearlyBreak`), `src/content/types/contacts.ts:38` (use it),
  `src/lib/contacts/office-hours.ts:7-14` (use `inYearlyBreak`), `src/content/types/services.ts` (`RegularService`),
  `src/lib/services/masses.ts:37-46` (`servicesOnDate`), `src/content/masses.ts:78-91`, `src/content/masses.test.ts`
- Test: `src/lib/services/masses.test.ts`

**Interfaces:**

- Produces: `type YearlyBreak = { from: MonthDay; to: MonthDay }` (`types/shared.ts`);
  `inYearlyBreak(date: IsoDate, closed: YearlyBreak): boolean` (wraps over New Year when `from > to`);
  `RegularService.closed?: YearlyBreak`; `servicesOnDate()` leaves out a regular service on the days of its break.

- [ ] **Step 1: Write the failing tests**

```ts
// yearly-break.test.ts
expect(inYearlyBreak("2026-07-01", { from: "07-01", to: "08-31" })).toBe(true);
expect(inYearlyBreak("2026-08-31", { from: "07-01", to: "08-31" })).toBe(true);
expect(inYearlyBreak("2026-09-01", { from: "07-01", to: "08-31" })).toBe(false);
expect(inYearlyBreak("2027-01-02", { from: "12-24", to: "01-06" })).toBe(true);
// masses.test.ts: servicesOnDate
const regular = [{ weekday: 0, time: "9:30", place: "kurim", closed: { from: "07-01", to: "08-31" } }];
expect(servicesOnDate("2026-07-05", { regular, exceptions: [] })).toEqual([]);
expect(servicesOnDate("2026-09-06", { regular, exceptions: [] })).toEqual([{ time: "9:30", place: "kurim" }]);
```

- [ ] **Step 2: Run them** — `pnpm exec vitest run src/lib/shared/yearly-break.test.ts src/lib/services/masses.test.ts`;
      expected FAIL (`inYearlyBreak` missing, the July Sunday still has the 9:30).

- [ ] **Step 3: Implement** `inYearlyBreak` (the body of today's `officeHoursApply` break check, moved),
      `officeHoursApply` calling it, `RegularService.closed`, and the filter in `servicesOnDate`. `weeklySchedule()` is
      unchanged: the row's `note` carries the text.

- [ ] **Step 4: Content.** In `regularServices`: the Sunday 9:30 Kuřim row gets
      `closed: { from: "07-01", to: "08-31" }` (its note "s katechezí pro děti (ve školním roce)" already says it); the
      first-Friday 19:00 "Modlitební večer" gets the same `closed` and `note: "mimo letní prázdniny"`. In
      `masses.test.ts`, check every `closed` is a valid month-day (reuse the check `site.test.ts` applies to the office
      hours' `closed`, moved to `src/test/content-checks.ts` if it is inline there).

- [ ] **Step 5: Run the full check** (src) — all green; `markChanges` and the next-mass countdown follow the break with
      no change of their own.

- [ ] **Step 6: Commit** — `feat(mass): pause a regular service for the summer holidays`

### Task 2: Places' locative and address, and the shared "změna" rule

**Files:**

- Modify: `src/content/types/services.ts` (`Place`), `src/content/masses.ts:8-24`,
  `src/lib/services/service-sheet.ts:112-134` (`markChanges`)
- Test: `src/lib/services/service-sheet.test.ts`, `src/content/masses.test.ts`

**Interfaces:**

- Produces: `Place.locative: string` and `Place.address: string` (required);
  `isChangedMass(date: IsoDate, time: ClockTime, place: PlaceId, regular: RegularService[]): boolean` exported from
  `service-sheet.ts`: true when `date`'s weekday has a regular mass and no regular mass of that date (rule and break
  applied) is at `time` in `place`. `markChanges` uses it (behaviour unchanged).

- [ ] **Step 1: Write the failing test** — `isChangedMass` with the real `regularServices`:

```ts
expect(isChangedMass("2026-10-18", "8:00", "kurim", regularServices)).toBe(false);
expect(isChangedMass("2026-10-18", "10:00", "kurim", regularServices)).toBe(true);
expect(isChangedMass("2026-10-20", "8:00", "kurim", regularServices)).toBe(false); // Tuesday: no regular mass
expect(isChangedMass("2026-07-05", "9:30", "kurim", regularServices)).toBe(true); // 9:30 on its break
```

- [ ] **Step 2: Run it** — `pnpm exec vitest run src/lib/services/service-sheet.test.ts`; expected FAIL.

- [ ] **Step 3: Implement** `isChangedMass` and make `markChanges` call it; the existing `markChanges` tests must pass
      unchanged.

- [ ] **Step 4: Content.** Give each place its `locative` and `address` from the table below (the addresses as
      today's calendar events have them). In `masses.test.ts`, check that every place has a non-empty `locative`
      starting with "v " or "ve " and a non-empty `address`.

| place              | `locative`               | `address`                                                      |
| ------------------ | ------------------------ | -------------------------------------------------------------- |
| `kurim`            | `v Kuřimi`               | `Kostel sv. Maří Magdalény, Křížkovského, 664 34 Kuřim, Česko` |
| `moravske-kninice` | `v Moravských Knínicích` | `Kostel svaté Markéty, 386, 664 34 Moravské Knínice, Česko`    |
| `jinacovice`       | `v Jinačovicích`         | `Jinačovice, 664 34 Jinačovice-Kuřim, Česko`                   |

- [ ] **Step 5: Run the full check** (src) — green.

- [ ] **Step 6: Commit** — `refactor(lib): share the "změna" rule and give the churches an address`

### Task 3: "Změna: " in the Kalendář

**Files:**

- Modify: `src/lib/calendar/google-calendar.ts:120-150` (`parseTitle`, `toEntries`), `src/content/types/calendar.ts`
  (`CalendarEntry.changed`), `src/lib/calendar/agenda.ts` (`AgendaItem.changed`, `agendaByDate`),
  `src/components/calendar/CalendarItemTitle.tsx`
- Test: `src/lib/calendar/google-calendar.test.ts`, `src/lib/calendar/agenda.test.ts`

**Interfaces:**

- Produces: `parseTitle(summary): { title: string; cancelled: boolean; changed: boolean }` strips a leading
  "Změna: " (any case, as "Zrušeno: "); `CalendarEntry.changed?: true` and `AgendaItem.changed?: true`, passed
  through by `toEntries` and `agendaByDate`.

- [ ] **Step 1: Write the failing tests**

```ts
expect(parseTitle("Změna: Mše svatá v Kuřimi")).toEqual({
  title: "Mše svatá v Kuřimi",
  cancelled: false,
  changed: true,
});
expect(parseTitle("změna:Adorace v Kuřimi").changed).toBe(true);
expect(parseTitle("Zrušeno: Mše svatá v Kuřimi")).toEqual({
  title: "Mše svatá v Kuřimi",
  cancelled: true,
  changed: false,
});
// agenda.test.ts: an entry with changed: true gives an item with changed: true
```

- [ ] **Step 2: Run them** — `pnpm exec vitest run src/lib/calendar`; expected FAIL.

- [ ] **Step 3: Implement** the parsing and the pass-through, and in `CalendarItemTitle` a "změna" pill before the
      title when `item.changed` (the Pořad bohoslužeb tag's classes: `rounded-full bg-orange-tint px-2 py-px text-12
font-bold text-orange-ink-deep`, from `ChurchCard.tsx`); the week cards list services by time only and stay as
      they are.

- [ ] **Step 4: Run the full check** (src), then the browser check at 390/834/1440 px in both themes on `/kalendar/`
      with a day holding a "Změna: " entry (the dev server reads the live calendar, so stub one with a fixture entry in
      a test page or check after the first sync; note in the commit which).

- [ ] **Step 5: Commit** — `feat(calendar): show a "změna" tag for a changed service`

### Task 4: The desired service events

**Files:**

- Create: `scripts/lib/calendar/google-body.ts` (moved from `desired.ts`: `GoogleEventBody`, `GoogleTime`,
  `pragueTime`, `TIME_ZONE`), `scripts/lib/calendar/services-desired.ts`, `scripts/lib/calendar/services-desired.test.ts`
- Modify: `scripts/lib/calendar/desired.ts`, `scripts/lib/calendar/in-line.ts` (imports only)

**Interfaces:**

- Consumes: `servicesOnDate`, `scheduleExceptions`, `sheetCovering` (latest covering sheet), `isChangedMass` (Task 2),
  `Place.locative`/`address` (Task 2), `RegularService.closed` (Task 1).
- Produces:

```ts
export type ServicesContent = {
  regular: RegularService[];
  sheets: ServiceSheetRecord[]; // sorted by validFrom
  later: ScheduleException[];
  places: Record<PlaceId, Place>;
};
export type DesiredService = {
  googleId: string;
  date: IsoDate;
  time: ClockTime;
  place: PlaceId;
  status: "regular" | "changed" | "cancelled";
  body: GoogleEventBody; // summary, location, description, start, end
};
export const SERVICES_URL: string; // `${SITE_URL}${links.services}`
export const serviceEventId: (date: IsoDate, time: ClockTime, place: PlaceId, title?: string) => string;
export const servicesWindow: (today: IsoDate) => DateRange; // today .. addMonths(today, 6) in Prague
export function desiredServices(content: ServicesContent, range: DateRange): DesiredService[];
```

- [ ] **Step 1: Write the failing tests** (fixtures: a small `regular` list, one or two sheet records, the real
      `places`)

```ts
// id: lowercase hex of `services/<date>/<time>/<place>/<title or "">`, distinct from any news id
expect(serviceEventId("2026-10-18", "8:00", "kurim")).toBe(
  Buffer.from("services/2026-10-18/8:00/kurim/").toString("hex"),
);
expect(servicesWindow("2026-10-24")).toEqual({ from: "2026-10-24", to: "2027-04-24" });

// a regular Sunday: three events, titles and location
const [first] = desiredServices(content, { from: "2026-11-01", to: "2026-11-01" });
expect(first.body.summary).toBe("Mše svatá v Kuřimi");
expect(first.body.location).toBe("Kostel sv. Maří Magdalény, Křížkovského, 664 34 Kuřim, Česko");
expect(first.body.description.endsWith(`Pořad bohoslužeb: ${SERVICES_URL}`)).toBe(true);
expect(first.body.start).toEqual({ dateTime: "2026-11-01T08:00:00+01:00", timeZone: "Europe/Prague" });
expect(first.body.end.dateTime).toBe("2026-11-01T09:00:00+01:00");

// the 17:30 adoration ends at the 18:00 mass in the same church
expect(adoration.body.end.dateTime).toBe("2026-10-22T18:00:00+02:00");

// a sheet day that moves the 9:30 to 10:00: "Zrušeno: " 9:30 and "Změna: " 10:00
expect(summaries).toEqual([
  "Mše svatá v Kuřimi",
  "Zrušeno: Mše svatá v Kuřimi",
  "Změna: Mše svatá v Kuřimi",
  "Mše svatá v Moravských Knínicích",
]);
expect(cancelled.body.description).toContain("Tato bohoslužba se nekoná.");
expect(changed.body.description).toContain("Změna oproti pravidelnému pořadu bohoslužeb.");

// a Tuesday 8:00 mass of a sheet: no prefix (no regular mass on Tuesday); an extra "Adorace" in a sheet: no prefix
// a sheet row with changed: true: "Změna: "
// the feast of the sheet day opens the description; on a Sunday two sheets share, the later sheet's feast
// a regular row's note is a description line ("s katechezí pro děti (ve školním roce)")
// DST: 2026-10-24 8:00 → "+02:00", 2026-10-25 8:00 → "+01:00"
// July: a sheet Sunday with 9:30 → "Změna: Mše svatá v Kuřimi", and no "Zrušeno: " event that day
// Tišnov rows and funerals give no event
```

- [ ] **Step 2: Run them** — `pnpm exec vitest run scripts/lib/calendar/services-desired.test.ts`; expected FAIL.

- [ ] **Step 3: Implement.** Per date of `range`: `exceptions = scheduleExceptions(sheets, later, placeIds)`;
      the day's services `servicesOnDate(date, { regular, exceptions })`; the regular ones
      `servicesOnDate(date, { regular, exceptions: [] })`; cancelled = regular ones whose time, place and title no
      day's service has. Status: `changed` when `isChangedMass` (a service without a title) or the covering sheet's
      row at that time and place has `changed: true`; `cancelled` for the cancelled; else `regular`. Title:
      `(title ?? "Mše svatá") + " " + locative`, with `"Změna: "` / `"Zrušeno: "` in front. End: the start + 60
      minutes, or the next start that day in the same place (cancelled ones included) when sooner. Description
      lines, empty ones left out, in this order: the feast of the covering sheet's day; the regular row's `note`; the
      status line (`"Tato bohoslužba se nekoná."` / `"Změna oproti pravidelnému pořadu bohoslužeb."`); a blank line;
      `"Pořad bohoslužeb: " + SERVICES_URL`. Move the Google body helpers to `google-body.ts` first and re-import them
      in `desired.ts` and `in-line.ts`.

- [ ] **Step 4: Run** `pnpm exec vitest run scripts/lib/calendar` — all green, the Události tests untouched.

- [ ] **Step 5: Commit** — `feat(scripts): plan the services the Bohoslužby calendar should hold`

### Task 5: The services sync plan

**Files:**

- Create: `scripts/lib/calendar/services-plan.ts`, `scripts/lib/calendar/services-plan.test.ts`

**Interfaces:**

- Consumes: `DesiredService`, `SERVICES_URL` (Task 4); `differingFields`, `bodyOf` (`in-line.ts`); `eventDays`
  (`src/lib/calendar/google-calendar.ts`).
- Produces:

```ts
export type ServicesChange =
  | { kind: "add"; desired: DesiredService }
  | {
      kind: "update";
      desired: DesiredService;
      target: GoogleEvent;
      claim: boolean;
      fields: BodyField[];
      body: Partial<GoogleEventBody>;
    }
  | { kind: "restore"; desired: DesiredService; target: GoogleEvent }
  | { kind: "delete"; target: GoogleEvent };
export type ServicesReport = { kind: "duplicate"; desired: DesiredService; events: GoogleEvent[] };
export type ServicesPlan = { changes: ServicesChange[]; reports: ServicesReport[] };
export const isOwned: (event: GoogleEvent) => boolean; // description includes SERVICES_URL
export function planServices(desired: DesiredService[], instances: GoogleEvent[], now: Date): ServicesPlan;
```

- [ ] **Step 1: Write the failing tests** (Google events built with a small helper in the test file)

```ts
// owned, in line → no change; owned with another start → update ["start", "end"]
// owned by HTML description → isOwned(true)
expect(isOwned({ ...e, description: `<a href="${SERVICES_URL}">Pořad bohoslužeb</a>` })).toBe(true);
// no event → add
// the desired id exists with status "cancelled" (deleted by hand) → restore
// an owned event no desired event matches, starting after `now` → delete; one before `now` → untouched
// an unmarked single event, same date and start, location holding "Kuřim" → update with claim: true, fields include "description"
// an unmarked single event matching by title "… v Moravských Knínicích" (no location) → claim
// two unmarked single candidates → no claim, add, and a "duplicate" report listing both
// an occurrence of an unmarked repeating event (recurringEventId set) at the same time → add + "duplicate" report, never claimed
// an unmarked event at another time that day → untouched, no report
// a cancelled (status "cancelled") unmarked event → ignored
```

- [ ] **Step 2: Run them** — `pnpm exec vitest run scripts/lib/calendar/services-plan.test.ts`; expected FAIL.

- [ ] **Step 3: Implement.** Match each desired event: by `googleId` among the instances (owned and live → update if
      fields differ; `status: "cancelled"` → restore); else an owned live event at the same date, start and place
      (location equals the place's address; the claimed events) → update; else unmarked live single events (no
      `recurringEventId`, no `recurrence`) at the same date and start whose location or summary holds the place's
      `name` or its `locative` without the leading "v "/"ve " → exactly one: claim (update with all differing fields,
      `claim: true`); several: report; else add. Every unmarked live event at a desired event's date, start and place
      that was not claimed (repeating occurrences included) goes into that event's `duplicate` report. Owned live
      events left unmatched and starting after `now` → delete. A claimed or matched event is used once.

- [ ] **Step 4: Run** `pnpm exec vitest run scripts/lib/calendar` — green.

- [ ] **Step 5: Commit** — `feat(scripts): plan the Bohoslužby calendar sync`

### Task 6: Read, write and the command

**Files:**

- Modify: `scripts/lib/calendar/read.ts` (`readAll` and `readSnapshot` take the calendar id; Události passes
  `parishCalendars.events.googleId`), `scripts/lib/calendar/write.ts` (the events URL per calendar; a generic send),
  `scripts/lib/calendar/calendar-sync.ts` (calls with the Události id), `package.json` (`"services-calendar-sync":
"tsx scripts/services-calendar-sync.ts"`)
- Create: `scripts/services-calendar-sync.ts`, `scripts/lib/calendar/services-sync.ts`,
  `scripts/lib/calendar/services-lines.ts`, their `.test.ts` files
- Test: `scripts/lib/calendar/read.test.ts`, `scripts/lib/calendar/write.test.ts` (extend)

**Interfaces:**

- Consumes: `desiredServices`, `servicesWindow` (Task 4); `planServices` (Task 5); content readers
  (`readServiceSheets` from `scripts/lib/services/add-service-sheet.ts`, the later exceptions' reader used by
  `pnpm add-exception`, `regularServices` and `places` from `@/content/masses`).
- Produces: `readInstances(access: CalendarAccess, calendarId: string, range: DateRange): Promise<GoogleEvent[]>`
  (`singleEvents`, `showDeleted`); `applyServicesChange(change: ServicesChange, token: string): Promise<void>` (add:
  `POST` with `{ ...body, id }`; update: `PATCH` fields; restore: `PATCH { ...body, status: "confirmed" }`; delete:
  `DELETE`, 204 or 410 is success); `servicesLines(plan, apply, failures?): string[]`; `pnpm services-calendar-sync
[--apply]` with the same `parseCommand`/`execute` contract and env handling as `calendar-sync.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
// services-lines.test.ts
expect(servicesLines(plan, false)).toEqual([
  'Bohoslužby, 2026-10-18: add 8:00 "Mše svatá v Kuřimi", 9:30 "Mše svatá v Kuřimi"',
  'Bohoslužby, 2026-10-20: update 8:00 "Mše svatá v Kuřimi": time',
  'Bohoslužby, 2026-10-12: claim 17:30 "Modlitba růžence a požehnání" and update its title, description',
  'Bohoslužby, 2026-10-13: delete 18:00 "Mše svatá v Kuřimi"',
  'Bohoslužby, 2026-10-14: restore 8:00 "Mše svatá v Kuřimi" (deleted by hand)',
  'Bohoslužby, 2026-10-25: 9:00 "Mše svatá v Kuřimi" doubles "Mše svatá v Kuřimi" (repeating): remove it by hand',
]);
expect(servicesLines({ changes: [], reports: [] }, false)).toEqual(["Bohoslužby: nothing to do."]);
// apply: "added", "updated", "claimed", "deleted", "restored" (actionVerb in ../command); a failure appends " — failed: <reason>"
// write.test.ts: each kind sends the method, URL (services calendar) and body above; delete treats 410 as done
// read.test.ts: readInstances asks the given calendar id
```

      Adds of one date share a line, in time order; the other changes one line each; dates in order; reports last.

- [ ] **Step 2: Run them** — `pnpm exec vitest run scripts/lib/calendar`; expected FAIL.

- [ ] **Step 3: Implement** the generalisation (the Události behaviour and its tests unchanged), the lines, and
      `services-sync.ts`: the preview reads with the browser key (`"Bohoslužby: not checked (<reason>)."` and exit 1
      without it or on a failure, as the Události preview), `--apply` rereads with the service account token, applies
      every change, prints the lines, exits 1 when a write failed. The entry point's header documents the command, its
      flags and environment, as `scripts/calendar-sync.ts` does.

- [ ] **Step 4: Run the scripts check** — green. Then `pnpm services-calendar-sync` against the live calendar (read
      only, browser key from `.env.local`): it lists about 350 adds and the duplicate reports of today's hand-made
      series; paste a short excerpt in the task report. Never run `--apply`.

- [ ] **Step 5: Commit** — `feat(scripts): add pnpm services-calendar-sync`

### Task 7: Release, workflows and the end of the mirror checklist

**Files:**

- Modify: `scripts/release.sh:4-8,65-68,127-134`, `.github/workflows/deploy.yml` (job `calendar`),
  `.github/workflows/service-sheet.yml:255-315`, `package.json` (drop `sheet-mirror`)
- Delete: `scripts/sheet-mirror.ts`, `scripts/lib/services/sheet-mirror.ts`, `scripts/lib/services/sheet-mirror.test.ts`

- [ ] **Step 1: `release.sh`.** After the Události preview, the same block for
      `pnpm --silent services-calendar-sync` under the heading
      `Bohoslužby calendar (applied after the deploy when SERVICES_CALENDAR_SYNC is on, or by --local):`; with
      `--local`, after the Události apply, `pnpm --silent services-calendar-sync --apply` under the same
      credentials check and warning. Update the header comment.

- [ ] **Step 2: `deploy.yml`.** In the `calendar` job, an apply step and a preview step for the services sync, copies
      of the Události ones with `services-calendar-sync`, their own output files and the gate
      `vars.SERVICES_CALENDAR_SYNC == 'true'` (the sign-in step runs when either variable is on). A `duplicate` line
      warns (`::warning::`), as an `ask:` does.

- [ ] **Step 3: `service-sheet.yml`.** Drop the mirror block (the `git fetch`, `sheet-mirror` call and the `## Mirror
in the calendar` handling); the PR body is the report and the footer. Delete the `sheet-mirror` files and script.

- [ ] **Step 4: Run** the scripts check and `actionlint` if installed (else `pnpm exec prettier --check .github`) —
      green.

- [ ] **Step 5: Commit** — `ci: apply the Bohoslužby calendar sync after a release`

### Task 8: Skills and docs

**Files:**

- Modify: `.claude/skills/parish-create-service-sheet/SKILL.md` (lines ~173, ~227),
  `.claude/skills/parish-correct-service-sheet/SKILL.md`, `.claude/skills/parish-create-exception/SKILL.md` (~58),
  `.claude/skills/parish-remove-exception/SKILL.md`, `.claude/skills/parish-release/SKILL.md`,
  `.claude/skills/parish-publish-content/SKILL.md`, `README.md`, `docs/deployment.md`,
  `.claude/rules/content-and-time.md` (Calendars bullet, Schedule bullet), the non-goal about Bohoslužby in
  `docs/superpowers/specs/2026-10-23-udalosti-calendar-sync-design.md` and
  `docs/superpowers/specs/2026-10-16-service-sheet-email-pipeline-design.md` (a pointer to the new spec)

- [ ] **Step 1: Skills.** Remove every step asking the user to change the "Bohoslužby" Google Calendar by hand and the
      `## Mirror in the calendar` instructions; where a skill shows the Události preview, show
      `pnpm services-calendar-sync` the same way; `parish-release` and `parish-publish-content` say the release
      preview lists both calendars and the yes covers both.

- [ ] **Step 2: `docs/deployment.md`.** Rename the section to cover both calendars; add: the services sync, its gate
      `SERVICES_CALENDAR_SYNC`, the one-time sharing of Bohoslužby with the service account ("Make changes to
      events"), and the one-time switch-over by hand, in order: set `SERVICES_CALENDAR_SYNC` to `true`, run
      `pnpm release` by hand and check the preview, then in Google Calendar end (not delete) each hand-made repeating
      event of the masses in Kuřim and Moravské Knínice, "Adorace v Kuřimi" and "Modlitební večer s Komunitou Emmanuel
      v Kuřimi" on the day before the release, keeping Modlitba chval and Křížová cesta; the next preview's duplicate
      lines show what is left.

- [ ] **Step 3: README and rules.** README: the command and its env. `content-and-time.md`: Bohoslužby is generated
      from `regularServices`, the sheets and the exceptions six months ahead by `pnpm services-calendar-sync`, marked
      by the Pořad bohoslužeb URL; "Změna: " sets `CalendarEntry.changed`; a regular service's `closed` break.

- [ ] **Step 4: Run** `pnpm format` and `pnpm exec prettier --check .` — green.

- [ ] **Step 5: Commit** — `docs(skills): let the release keep the Bohoslužby calendar in line`
