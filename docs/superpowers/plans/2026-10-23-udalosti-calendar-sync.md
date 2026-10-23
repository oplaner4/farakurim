# Události calendar sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pnpm calendar-sync` previews, and with `--apply` makes, the changes that bring the Události Google Calendar
in line with the event records; the release shows the preview and the deploy workflow applies it.

**Architecture:** a pure planner (`planSync`) turns the records and a snapshot of the calendar into changes and
reports; thin layers read the calendar (public key or service account token), write the changes (service account)
and print lines. `pnpm event-calendar <id>` becomes the same preview for one event. The deploy workflow applies the
plan in its own job after the deploy; `pnpm release` prints the preview.

**Tech Stack:** TypeScript, Node 22 (`fetch`), vitest, zod/mini, date-fns v4 + `@date-fns/tz`,
`google-auth-library` (new), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-23-udalosti-calendar-sync-design.md`. Read it before any task.

## Global Constraints

- Code, comments, output lines and commits in English; Czech only in quoted titles and published fields
  (`docs/conventions.md`).
- Where code goes: entry points in `scripts/<command>.ts` are one `runCommand()` call whose header documents the
  command; logic and tests in `scripts/lib/calendar/` (`.claude/rules/structure.md`). Imports `@/…` or `./x`.
- Prague time throughout (`src/lib/shared/prague.ts`); timed Google events carry `timeZone: "Europe/Prague"`.
- The calendar is `parishCalendars.events.googleId` (`src/content/site.ts`); never touch Bohoslužby.
- Never delete a Google event. Never write before the maintainer's yes: only `--apply` writes, and only the deploy
  workflow and `pnpm release --local` run it.
- The service account key (`GOOGLE_CALENDAR_SERVICE_ACCOUNT`) is never printed, never `NEXT_PUBLIC_`, never in the
  build.
- Dependencies with caret ranges; check `google-auth-library` with context7 before use (done in planning: `new JWT({
email, key, scopes })`, `await client.getAccessToken()` → `{ token }`).
- Each task ends with `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit` passing (Task 3 also
  touches `src/lib`, so it runs the full `pnpm test`), then a commit through the `commit` skill.

## Review Focus

- **A weekly event that crosses New Year** (Obnova v Duchu svatém, 1. 10. 2026 – 29. 4. 2027): the snapshot must reach
  the last meeting's year, not only today's. Test in Task 5 (`snapshotRange`).
- **Two records whose titles match the same January event**: the second must not claim it again. Test in Task 4.
- **A description Google returns as HTML after an edit in its UI**: comparing must not rewrite it on every run once
  the sync wrote it; the owned match uses `eventPaths`, which reads HTML. Test in Task 4 (owned by an HTML link).
- **Daylight saving time**: a timed meeting in winter and in summer gets the right offset, and the weekly event keeps
  its wall-clock time. Test in Task 2.
- **A cancelled Google occurrence** (`status: "cancelled"`, a deleted occurrence of a repeating event) is never owned
  or a candidate; only the sync's own deterministic id is reported as deleted. Test in Task 4.

---

### Task 1: Title matching

**Files:**

- Create: `scripts/lib/calendar/titles.ts`
- Test: `scripts/lib/calendar/titles.test.ts`

**Interfaces:**

- Produces: `matchingTitles(a: string, b: string): boolean`

- [ ] **Step 1: Write the failing tests** (`describe("matchingTitles")`), each `expect(matchingTitles(x, y)).toBe(…)`:
  - true: `"Farní den"`/`"Farní den 2026"`; `"Hody v České"`/`"Hody Česká"`; `"Obnova pro manžele"`/`"Manželská obnova
“Láska a Pravda”"`; `"Paray-le-Monial s komunitou Emmanuel"`/`"Pouť do Francie (Paray-le-Monial)"`;
    `"Adorační den kuřimské farnosti"`/`"Adorační den farnosti"`; `"Zrušeno: Farní ples"`/`"FARNI PLES"`.
  - false: `"Tříkrálový koncert"`/`"3králový koncert ZUŠ"`; `"Farní den"`/`"Farní kavárna"`; `""`/`"Farní den"`;
    `"800"`/`"800 let"` (numbers only leave no words).
- [ ] **Step 2: Run** `pnpm exec vitest run scripts/lib/calendar/titles.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `matchingTitles`.** Strip a "Zrušeno: " prefix with `parseTitle()`
      (`src/lib/calendar/google-calendar.ts`), `fold()` (`src/lib/shared/czech.ts`), replace non-letters/digits by
      spaces, split; drop numbers and the filler words `a v ve na do s se z ze k ke o u pro za po od i`; cut each word
      to its first 4 letters. True when the shorter word set is a subset of the longer, or the sets share ≥ 2 words;
      false when either set is empty. Module header: what it matches and why (the spec's rule), not who calls it.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `feat(scripts): match Události titles by shared words`.

### Task 2: What the calendar should hold

**Files:**

- Create: `scripts/lib/calendar/desired.ts`
- Test: `scripts/lib/calendar/desired.test.ts`

**Interfaces:**

- Consumes: `meetingsOf`, `eventEnd` (`src/lib/news/timing.ts`), `eventHref` (`src/lib/news/events.ts`), `SITE_URL`.
- Produces:

  ```ts
  type GoogleTime = { date?: string; dateTime?: string; timeZone?: string };
  type GoogleEventBody = {
    summary: string;
    location?: string;
    description: string;
    start: GoogleTime;
    end: GoogleTime;
    recurrence?: string[];
  };
  type DesiredEvent = {
    newsId: string;
    key: IsoDate | "weekly"; // the meeting's start, or "weekly" for a weekly long-term event
    googleId: string; // calendarEventId(...)
    meeting: Meeting; // from meetingsOf (cancelled set when cancelled)
    weeklyUntil?: IsoDate; // the event's end, weekly only
    summary: string; // title, "Zrušeno: " + title when meeting.cancelled
    location?: string; // the record's place
    description: string; // `${lead ?? text}\n\n${SITE_URL}${eventHref(event)}` (as src/lib/news/ics.ts)
  };
  function calendarEventId(newsId: string, key: IsoDate | "weekly"): string;
  function desiredEvents(event: NewsEvent, today: IsoDate): DesiredEvent[];
  function eventBody(desired: DesiredEvent, current?: GoogleEvent): GoogleEventBody;
  ```

- [ ] **Step 1: Write the failing tests.**
  - `calendarEventId("farni-den-2026", "2026-06-13")` matches `/^[0-9a-v]{5,1024}$/`, is stable across calls,
    differs from `calendarEventId("farni-den-2026", "weekly")`.
  - `desiredEvents`: a one-day timed event → one item, `key` = start; a `sessions` series with one meeting before
    `today` → only the meetings ending on or after `today`; `longTerm: true` → `[]`; `longTerm: { weeklyAt:
"18:30" }` from 2026-10-01 to 2027-04-29 → one item with `key: "weekly"`, `weeklyUntil: "2027-04-29"`; an event
    with `change.status: "cancelled"` → `summary` starts with `"Zrušeno: "`; a series with `cancelledMeetings` → only
    that meeting's summary is prefixed; `description` ends with `https://farakurim.cz/aktuality/<id>/`.
  - `eventBody`: a timed meeting 2026-01-13 18:00–19:30 → `start.dateTime` `"2026-01-13T18:00:00+01:00"`, `timeZone`
    `"Europe/Prague"`, end 19:30; the same in July → `+02:00`; a multi-day or time-less meeting → `start.date`,
    `end.date` the day after the last day; weekly → `recurrence: ["RRULE:FREQ=WEEKLY;UNTIL=20270429T215900Z"]` and
    `start.dateTime` on 2026-10-01 18:30 `+02:00`; a meeting with `startTime` but no `endTime`: without `current`, end
    = start; with a `current` timed 13:00–15:00 and the meeting at 14:00, end = 16:00 (kept duration).
- [ ] **Step 2: Run** `pnpm exec vitest run scripts/lib/calendar/desired.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `calendarEventId`: lowercase hex of the UTF-8 bytes of `${newsId}/${key}` (hex digits
      are valid Google id characters). Timed only when the meeting is one day with a `startTime`, as `timing()` in
      `src/lib/news/ics.ts`; `dateTime` formatted in Prague with its offset (`format(…, "yyyy-MM-dd'T'HH:mm:ssxxx", { in:
inPrague })`); the `UNTIL` stamp as `ics.ts` builds it (`eventEnd` at 23:59 Prague, in UTC).
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `feat(scripts): describe the Události event each record should have`.

### Task 3: Reading the calendar

**Files:**

- Modify: `src/lib/calendar/google-calendar.ts` (the `googleEvent` schema; `eventsUrl` options)
- Create: `scripts/lib/calendar/read.ts`
- Test: `src/lib/calendar/google-calendar.test.ts` (extend), `scripts/lib/calendar/read.test.ts`

**Interfaces:**

- Produces:

  ```ts
  // google-calendar.ts
  googleEvent gains recurrence?: string[] (GoogleEvent too)
  function eventsUrl(calendarId: string, apiKey: string | undefined, range: DateRange, pageToken?: string,
    options?: { singleEvents?: boolean; showDeleted?: boolean }): string   // defaults: singleEvents true, showDeleted false;
                                                                           // no key param when apiKey is undefined;
                                                                           // no orderBy when singleEvents is false
  // read.ts
  type CalendarSnapshot = { instances: GoogleEvent[]; masters: GoogleEvent[] };
  type CalendarAccess = { apiKey: string } | { token: string };
  function snapshotRange(events: NewsEvent[], today: IsoDate): DateRange;   // 1 Jan of today's year → 31 Dec of the
                                                                            // year of the latest in-scope meeting end
  async function readSnapshot(access: CalendarAccess, range: DateRange): Promise<CalendarSnapshot>;
  ```

  `instances`: `singleEvents=true&showDeleted=true`. `masters`: `singleEvents=false`, only items with `recurrence`.
  An `{ apiKey }` read sends the site's Referer (`refererInit(SITE_URL)`); a `{ token }` read sends
  `Authorization: Bearer <token>` and no key.

- [ ] **Step 1: Write the failing tests.** `eventsUrl` with `{ singleEvents: false }` has `singleEvents=false` and
      no `orderBy`; with `undefined` key has no `key=`. `readSnapshot` with a stubbed `fetch` (`vi.stubGlobal`,
      `googlePage` from `src/test/fetch.ts`): two calls, the token in the header, masters filtered to items with
      `recurrence`, pages followed. `snapshotRange([weekly event to 2027-04-29], "2026-10-23")` → `{ from: "2026-01-01",
to: "2027-12-31" }`; with no records in scope → today's year.
- [ ] **Step 2: Run** `pnpm exec vitest run src/lib/calendar scripts/lib/calendar/read.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both; keep `fetchGoogleCalendar` and the browser behaviour unchanged (its tests stay
      green).
- [ ] **Step 4: Run** `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(scripts): read the Události calendar for the sync`.

### Task 4: The plan

**Files:**

- Create: `scripts/lib/calendar/plan.ts`
- Test: `scripts/lib/calendar/plan.test.ts`

**Interfaces:**

- Consumes: Tasks 1–3.
- Produces:
  ```ts
  type BodyField = keyof GoogleEventBody;
  type Change =
    | { kind: "add"; desired: DesiredEvent; body: GoogleEventBody }
    | {
        kind: "update";
        desired: DesiredEvent;
        target: GoogleEvent;
        claim: boolean;
        fields: BodyField[];
        body: Partial<GoogleEventBody>;
      };
  type Report =
    | { kind: "ask"; desired: DesiredEvent; candidates: GoogleEvent[] }
    | { kind: "unpaired"; newsId: string; meetings: IsoDate[]; events: GoogleEvent[] }
    | { kind: "orphan"; path: string; event: GoogleEvent }
    | { kind: "deleted"; desired: DesiredEvent };
  type SyncPlan = { changes: Change[]; reports: Report[] };
  function planSync(events: NewsEvent[], snapshot: CalendarSnapshot, today: IsoDate): SyncPlan;
  ```

The algorithm (the spec's "Matching" and "What in line means"), per record, per `desiredEvents()` item; `live` =
not `status: "cancelled"`; "linking" = `eventPaths(description)` contains the record's `eventHref`; "free" = no
`eventPaths` at all and not claimed earlier in this run:

1. Weekly items look in `snapshot.masters`, others in `snapshot.instances`.
2. **Deleted:** an instance with `id === googleId` and `status: "cancelled"` → `deleted` report, nothing else.
3. **Owned:** live events linking the record. A series pairs owned events with items by start date, then leftovers
   in date order only when both sides have the same count; leftover owned events with no items left →
   `orphan` reports; any other mismatch → one `unpaired` report and no change for those items.
4. **Claim:** no owned event: the live free events overlapping the meeting's days whose title `matchingTitles` the
   record's; weekly: free masters whose first start date is the record's `start`. Exactly one → `update` with
   `claim: true`; several → `ask`.
5. **Moved:** none on the day and `change.status === "moved"` → step 4 on `change.previousStart` (exactly one →
   claim).
6. **Elsewhere:** a live free event with a matching title on another day of the snapshot → `ask` with those
   candidates.
7. **New:** otherwise `add`, unless the meeting is cancelled (nothing).
8. **In line:** for an owned or claimed target, compare `eventBody(desired, target)` with the target field by field
   (times as instants or dates, `recurrence` only for weekly, `end` left out when the meeting has no `endTime`); the
   differing fields go in `fields`/`body` (a claim always includes `description`); no difference → no change.
9. Orphans: live events dated today or later whose `eventPaths` name a path no record has.

- [ ] **Step 1: Write the failing tests**, one `it` each, with records like `testEvent()` in
      `scripts/lib/news/event-calendar.test.ts` and Google events built by a local `google(id, date, summary,
description?)` helper:
  - in line → `{ changes: [], reports: [] }`;
  - owned with a different time → `update`, `fields: ["start", "end"]`, `claim: false`;
  - owned by an HTML description (`<a href="https://farakurim.cz/aktuality/x/">…</a>`) → found, no claim;
  - cancelled record, owned → `update` with `summary` `"Zrušeno: …"`; cancelled with nothing → no change;
  - one free title match that day → `update`, `claim: true`, `fields` includes `description`;
  - two free title matches → `ask` with both;
  - a free event that day with another title → `add` (the maintainer accepts the duplicate);
  - a matching free event on another day → `ask`;
  - moved record, nothing linking, a match on `previousStart` → `update` claim moving `start`;
  - moved record, owned on the old day → `update` (found by URL, no `previousStart` needed);
  - two records matching the same free event → the first claims it, the second `ask`s;
  - a cancelled Google occurrence with the record's title that day → ignored (`add`);
  - the sync's own `googleId` with `status: "cancelled"` → `deleted`, no `add`;
  - series of 3 with owned events on 2 dates → 2 in line, 1 `add`; owned events on 2 unknown dates and 1 leftover
    meeting → `unpaired`;
  - weekly with a free master starting on `start` → claim; changed `end` → `update` with `recurrence`;
  - a linking event for a path with no record, dated after today → `orphan`; dated before today → nothing;
  - a record whose meetings all ended before today → nothing.
- [ ] **Step 2: Run** `pnpm exec vitest run scripts/lib/calendar/plan.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `planSync`.**
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `feat(scripts): plan the Události calendar sync`.

### Task 5: `pnpm calendar-sync`

**Files:**

- Create: `scripts/lib/calendar/lines.ts`, `scripts/lib/calendar/write.ts`, `scripts/lib/calendar/calendar-sync.ts`,
  `scripts/calendar-sync.ts`
- Modify: `scripts/lib/command.ts` (`DONE` gains `update: "Updated"`), `package.json` (script `"calendar-sync": "tsx
scripts/calendar-sync.ts"`, dependency `google-auth-library`), `README.md` (commands table, `.env.local`)
- Test: `scripts/lib/calendar/lines.test.ts`, `scripts/lib/calendar/write.test.ts`,
  `scripts/lib/calendar/calendar-sync.test.ts`

**Interfaces:**

- Consumes: Tasks 2–4, `actionVerb`, `parseCommandLine`, `errorMessage`, `runCommand`.
- Produces:
  ```ts
  // lines.ts
  function planLines(plan: SyncPlan, apply: boolean, failures?: Map<Change, string>): string[];
  // write.ts
  async function accessToken(serviceAccount: string): Promise<string>; // JSON text, or a path to the JSON file
  async function applyChange(change: Change, token: string): Promise<void>; // throws with Google's status
  // calendar-sync.ts
  function parseCommand(args: string[]): { apply: boolean };
  async function execute(command: { apply: boolean }): Promise<void>;
  async function previewLines(events: NewsEvent[]): Promise<string[]>; // for one or all records; never throws
  ```
- Lines, one per change or report, prefixed `Události, <date>: ` (`<date>` the meeting's start, or `weekly from
<start>`), with `actionVerb(!apply, …)`:
  - add: `Would add "<summary>"` / `Added …`;
  - claim: `Would link "<target summary>" to /aktuality/<id>/ and update its <fields>`;
  - update: `Would update "<target summary>": <fields>` (fields named `title, time, place, description, repeat`);
  - ask: `ask: "<title>" on <date>[, "<title>" on <date>]: paste https://farakurim.cz/aktuality/<id>/ into its
description if it is this event; until then nothing changes`;
  - unpaired: `cannot pair the meetings <dates> with "<title>" on <dates>: nothing changes`;
  - orphan: `"<title>" on <date> links /aktuality/<x>/, which no record has: left alone`;
  - deleted: `"<summary>" was added by the site and deleted by hand: left alone`;
  - a failed write: the line followed by ` — failed: <message>`;
  - empty plan: `Události: nothing to do.`

- [ ] **Step 1: Write the failing tests.** `planLines` for each kind above (exact strings). `write.test.ts`: with a
      stubbed `fetch`, `add` POSTs `…/events` with the body (and `id`), `update` PATCHes `…/events/<target id>` with only
      `body`; a 409 throws `"HTTP 409"`. `calendar-sync.test.ts`: `parseCommand(["--apply"])` → `{ apply: true }`, an
      unknown option throws with the usage; `execute({ apply: true })` without `GOOGLE_CALENDAR_SERVICE_ACCOUNT` throws
      `"no GOOGLE_CALENDAR_SERVICE_ACCOUNT"`; `previewLines` without `NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY` returns
      `["Události: not checked (no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local)."]`.
- [ ] **Step 2: Run** `pnpm exec vitest run scripts/lib/calendar`. Expected: FAIL.
- [ ] **Step 3: Install** `pnpm add google-auth-library` (caret range in `package.json`).
- [ ] **Step 4: Implement.** `accessToken`: `new JWT({ email, key, scopes:
["https://www.googleapis.com/auth/calendar.events"] })`, `getAccessToken()`; a missing `token` throws. `execute`
      loads `.env.local` when it exists (as `reportCalendar` does), reads all records (`@/content/news`), takes `today =
pragueDate(Date.now())`; preview reads with `{ apiKey }`, apply with `{ token }`, prints `planLines`, applies the
      changes one by one, collecting failures, prints the lines with them, and throws `"<n> calendar changes failed"`
      when any failed (exit 1). Entry point `scripts/calendar-sync.ts`: header with what it does, the skills and
      workflow that use it, `Usage: pnpm calendar-sync [--apply]`, the two env variables.
- [ ] **Step 5: Run** the tests, then a real preview: `pnpm calendar-sync`. Expected: tests PASS; the preview prints
      lines (read with the public key; nothing is written). Read the lines: they are the first-run list the maintainer
      will see. **Never run `--apply`.**
- [ ] **Step 6: Commit** `feat(scripts): add pnpm calendar-sync`.

### Task 6: `pnpm event-calendar` becomes the one-event preview

**Files:**

- Modify: `scripts/lib/news/event-calendar.ts`, `scripts/event-calendar.ts` (header, usage), `README.md` (its row)
- Test: `scripts/lib/news/event-calendar.test.ts`

**Interfaces:**

- Consumes: `previewLines` (Task 5).
- Produces: `reportCalendar(event: NewsEvent): Promise<void>` (same name, no `outDir`), still never throws;
  `parseCommand(args): Promise<{ event: NewsEvent }>` (no `--out`).

- [ ] **Step 1: Rewrite the tests**: drop `matchMeetings`, `checkCalendar` and `writeIcs` tests; `reportCalendar`
      prints `previewLines([event])` (stubbed fetch); `parseCommand(["x", "--out", "d"])` throws with the usage.
- [ ] **Step 2: Run** `pnpm exec vitest run scripts/lib/news`. Expected: FAIL.
- [ ] **Step 3: Implement**: remove `findEvent`, `sameTitle`, `matchMeetings`, `checkCalendar`, `writeIcs` and the
      `.ics` texts; `reportCalendar` prints `previewLines([event])` filtered to that record's lines. Callers
      (`add-event.ts`, `replace-event.ts`, `stage/command.ts`) keep calling `reportCalendar(record)`; fix their tests
      where they asserted the old lines.
- [ ] **Step 4: Run** `pnpm test:scripts`. Expected: PASS.
- [ ] **Step 5: Commit** `refactor(scripts): show the calendar sync preview for one event`.

### Task 7: Release and deploy

**Files:**

- Modify: `scripts/release.sh`, `.github/workflows/deploy.yml`, `docs/deployment.md`

- [ ] **Step 1: `release.sh` preview.** After the cron section: `echo "Události calendar (applied after the
deploy):"`, then `pnpm --silent calendar-sync 2>&1 | sed 's/^/  /' || true`. Header comment: the preview lists the
      calendar changes and the yes covers them.
- [ ] **Step 2: `release.sh --local`.** After `scripts/deploy.sh verify`, when `GOOGLE_CALENDAR_SERVICE_ACCOUNT` is
      in `.env.local`: `pnpm --silent calendar-sync --apply || echo "warning: the calendar sync failed; the next release
catches up." >&2`; without it, print that the calendar was not synced.
- [ ] **Step 3: `deploy.yml` job `calendar`**: `needs: [release, deploy]`, `runs-on: ubuntu-24.04`,
      `timeout-minutes: 10`, `continue-on-error: true`, `environment: calendar-sync` (never `Production`: the refresh
      counts Production deployments), checkout of `needs.release.outputs.ref` with `persist-credentials: false`, the
      pnpm/node/install steps pinned as in `check.yml`. Steps: on a tag push (`github.event_name == 'push'`) and
      `vars.CALENDAR_SYNC == 'true'`: `pnpm calendar-sync --apply` with `GOOGLE_CALENDAR_SERVICE_ACCOUNT: ${{
secrets.GOOGLE_CALENDAR_SERVICE_ACCOUNT }}`; otherwise `pnpm calendar-sync >> "$GITHUB_STEP_SUMMARY"` with
      `NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY: ${{ vars.GOOGLE_CALENDAR_API_KEY }}` (preview only). A failure ends as
      `::warning::`. Update the file's header comment.
- [ ] **Step 4: `docs/deployment.md`**: the sync step, the `calendar-sync` environment (deployment branches: tags
      `v*`; secret `GOOGLE_CALENDAR_SERVICE_ACCOUNT`), the variable `CALENDAR_SYNC`, and the one-time setup by the
      maintainer: create the service account in the project of the browser key, share Události (owned by the personal
      Gmail account) with its address, "Make changes to events", put the key in `.env.local` and the secret; **first
      apply by hand**: read `pnpm calendar-sync`, then `pnpm calendar-sync --apply` (or `pnpm release --local`), then set
      `CALENDAR_SYNC` to `true`.
- [ ] **Step 5: Check**: `bash -n scripts/release.sh`, `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec
tsc --noEmit`, `actionlint` if installed. Expected: no errors.
- [ ] **Step 6: Commit** `ci: apply the Události calendar sync after a release`.

### Task 8: Skills and docs

**Files:**

- Modify: `.claude/skills/parish-create-event/SKILL.md` (step 5, step 6, "Unattended run", report's
  `## Mirror in the calendar`), `.claude/skills/parish-correct-event/SKILL.md` (step 5, common mistakes),
  `.claude/skills/parish-cancel-event/SKILL.md` (step 5, common mistakes), `.claude/skills/parish-release/SKILL.md`,
  `.claude/skills/parish-publish-content/SKILL.md`, `design/DESIGN.md` §16.4,
  `docs/superpowers/specs/2026-10-22-events-email-pipeline-design.md` (the calendar non-goal)

- [ ] **Step 1: Event skills.** Step 5 shows the `Události` lines as printed; they say what the release will do. Only
      an `ask:` line needs the user (paste the URL into the right calendar event, or leave it); no `.ics` to import, no
      rename or move by hand, no re-run of `pnpm event-calendar`. Unattended: an `ask:` line is a blocking question;
      `## Mirror in the calendar` keeps the lines as printed. Common mistakes about deleting or importing stay, phrased
      for hand edits.
- [ ] **Step 2: `parish-release` / `parish-publish-content`**: the release preview lists the Události changes; the
      user's yes covers them; the agent never runs `pnpm calendar-sync --apply`.
- [ ] **Step 3: `DESIGN.md` §16.4**: the release keeps Události in line with the records (link by URL, "Zrušeno: ",
      moves), events without a page stay the parish's. Events pipeline spec: the non-goal now says the release applies
      the calendar changes.
- [ ] **Step 4: Check**: `pnpm format`, and `grep -rn "event-calendar\|\.ics" .claude/skills` shows no instruction
      to import an `.ics` or pass `--out`.
- [ ] **Step 5: Commit** `docs(skills): let the release keep the Události calendar in line`.
