# Události calendar sync: design

Status: draft. The release brings the "Události" Google Calendar in line with the event records in
`src/content/news/`, so no skill asks a person to add, link, rename or move a calendar event by hand. No plan yet.
Date: 2026-10-23.

## Intent

The Kalendář page and the homepage week calendar read the parish's "Události" Google Calendar (design/DESIGN.md
§16.4). Two people with write access keep it: the maintainer (webmaster) and one other person. At the start of the
year they add about 50 planned events whose dates are known early (Farní den and the like); during the year, some of
them get a news page on the site, and new ones appear that were never planned.

Today the event skills only check the calendar (`pnpm event-calendar`, read-only, with the public browser key) and
print what a person must do: import the event's `.ics`, paste the page URL into an existing calendar event's
description, add "Zrušeno: " to its title, or move it to a new date. The person edits Google Calendar and runs the
check again. The e-mail pipelines put the same to-dos in the PR body (`## Mirror in the calendar`).

**Why:** the news records already are what the site shows; the calendar is a second copy kept by hand, so it drifts
(a moved event still on its old day, a cancelled one without the prefix) and each change costs a manual round trip.
The maintainer's decision: **the records in `src/content/news/` are the source of truth**, and a calendar event the
site added, or one linked to an event's page, follows its record automatically.

## Goals

- `pnpm calendar-sync` compares the event records with Události and prints the changes (a preview); with `--apply`
  it makes them.
- The changes reach the calendar with the release, after the maintainer's yes (`pnpm release` shows the preview
  beside the commits and uploads), never before. The maintainer accepted that the calendar changes only when the site
  is released.
- A new event is linked to the calendar event planned in January when there is one, or added when there is none,
  without ever creating a second calendar event for the same thing.
- After that first link, corrections, cancellations, dropped meetings and moves reach the calendar event without any
  guessing.
- The event skills (`parish-create-event`, `parish-correct-event`, `parish-cancel-event`) and the events e-mail
  pipeline lose their "edit the calendar by hand, then check again" steps.

## Non-goals

- **The "Bohoslužby" calendar.** It stays managed by hand (the regular schedule as repeating events); a sync from the
  service sheets and schedule exceptions is a later project, built on this one.
- **Calendar events without a news page** are never touched: the January events that never get a page, and anything
  else added by hand.
- **Nothing is deleted** from the calendar: a cancelled event keeps its calendar event with "Zrušeno: " (§16.4); a
  record or a meeting that disappeared is reported, not deleted.
- **Past events** are not rewritten (see "Which records").
- **No sync on a scheduled refresh** of the deploy workflow (a rebuild of the last tag publishes nothing new).
- **No change for visitors:** no new third-party service in the browser, so the privacy page stays as it is.

## Anti-goals (a failure even if it works)

- A second calendar event for something the parish already planned in January under a matching title (a duplicate
  in the subscribers' phones). A January event under a quite different title is accepted as a possible duplicate.
- A calendar event someone added by hand changed or deleted although no record claims it.
- The calendar changed before the maintainer's yes (from a skill, a PR or a preview).
- A failed sync blocking the site's deploy.

## How it works

### Identity: the page URL in the description

A calendar event belongs to a news event when its description holds the page's URL (`/aktuality/<id>/`, read by
`eventPaths()` in `src/lib/calendar/google-calendar.ts`). This is already how the Kalendář links a calendar event to
its page and how `pnpm event-calendar` recognises a "linked" event, so **no new field goes into the records** (the
maintainer rejected storing Google ids in them).

A calendar event the sync adds also gets a deterministic Google id derived from the news id and the meeting (Google
lets the client choose the id on insert: 5–1024 characters of `a–v` and `0–9`, so the derivation encodes the id, e.g.
base32hex). A rerun after a partial failure then finds it again, or fails the insert as a duplicate instead of adding
a second one.

Google ids of existing events cannot be changed, so a January event is never replaced: it is claimed in place.

### Which records

Every record in `src/content/news/` with a meeting that ends today or later (Prague date), except long-term events
without a weekday (`longTerm: true`): the Kalendář leaves them out (`newsEntries` in `src/lib/calendar/agenda.ts`), and
an all-day block from March to November would only clutter the calendar. Past events stay as they are.

The calendar is read for the days the records need: from today to the last meeting, plus a moved event's day before
the move. Since an event's id holds its start year and an event never moves to another year, a URL search within the
event's year is enough to find a moved calendar event.

### The shapes of an event

The calendar follows the site's own Kalendář view of the record (`newsEntries`), and the `.ics` of "Přidat do
kalendáře" (`src/lib/news/ics.ts`) already does the same:

| Record                                              | Calendar                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| One event, one day or several                       | one calendar event: timed when it is one day with a start time, else all-day                |
| A series (`sessions`)                               | **one calendar event per meeting**, each with the page URL                                  |
| A weekly long-term event (`longTerm: { weeklyAt }`) | **one Google repeating event**, weekly on the weekday of `start` at `weeklyAt`, until `end` |
| A plain long-term event (`longTerm: true`)          | nothing (see "Which records")                                                               |

A series is never one repeating event: the record lists its dates, not a rule, and per-meeting events keep dropped
meetings, moved meetings and claiming simple.

### Matching: claim once, then follow the URL

For each meeting (or the weekly event as a whole):

1. **Linked:** a calendar event holds the page URL. A series pairs its URL-holding calendar events with its meetings
   by date first; what is left over pairs only when it is unambiguous (the same number left on both sides, paired in
   date order, or a single calendar event left over, which goes to the first meeting without one: a plan on a wrong
   day whose URL was pasted by hand; the other meetings are added), else it is reported. A leftover calendar event already over pairs only for a moved record (it may be
   the event of the old date); otherwise it is left alone, unreported. Then the calendar event is brought in line
   (below).
2. **Claimable:** none holds the URL, and exactly one calendar event on the meeting's day without any page URL has a
   matching title. The sync adds the URL to it and brings it in line. **Matching titles** (replaces the
   `event-calendar` rule "one title contains the other"): both titles without a "Zrušeno: " prefix, case, diacritics
   and punctuation, split into words; numbers and short filler words (a, v, ve, na, do, s, se, z, k, o, u, pro, za,
   po, od, i) dropped; each word cut to its first 4 letters, which absorbs most Czech endings ("Křtin"/"Křtinská",
   "České"/"Česká"). The titles match when every word of the shorter one is in the longer one, or when they share at
   least two words. The maintainer had the rules checked against the calendar for 2024–2026 (416 meetings): of the
   19 meetings linked by URL, the current rule finds 17, this one 18 and asks once, none wrong; among the unlinked
   meetings it finds 43 pairs where the current rule finds 21 ("Hody v České" ↔ "Hody Česká", "Obnova pro manžele" ↔
   "Manželská obnova „Láska a Pravda“", "Paray-le-Monial s komunitou Emmanuel" ↔ "Pouť do Francie (Paray-le-Monial)").
   It still misses titles that share at most one word ("Tříkrálový koncert" ↔ "3králový koncert ZUŠ"): those become
   new calendar events, as decided under case 3.
   - A meeting that is one occurrence of a Google repeating event (a series planned in January as "every Sunday"):
     only that occurrence is changed, as an exception of the repeating event; the repeating event itself is left
     alone.
   - A weekly long-term event claims a Google repeating event whose first occurrence is on `start` and whose title
     matches, and then owns the whole repeating event.
3. **New:** nothing holds the URL, no calendar event without a page URL that day has a matching title, and none with
   a matching title that is not over yet is anywhere else in the event's year (a plan made in January can sit on
   another day than the page says, without a `change`; such a hit is case 4, my call). A past one is not asked about:
   it is another, earlier event. Other calendar events that day with other titles do not stop it: several things
   happen on one day, and the maintainer decided that an unmatched title is a new event, even if it turns out to be a
   January event under another name (that duplicate is fixed by hand). The sync adds the calendar event (or the
   repeating event) with its deterministic id.
4. **Ask:** several calendar events that day match the title, or a matching one not over yet is on another day. The
   sync changes nothing for that meeting and reports the candidates. A person settles it either way: by pasting the
   page URL into the right calendar event, which turns it into case 1 on the next run, or, when none of them is the
   event, by adding it in Události by hand with the page URL in its description (the page's "Přidat do kalendáře"
   file can be imported after the release), which is case 1 as well.
5. **A moved event:** the calendar event is found by its URL wherever it is (case 1), so a move needs no rule of its
   own; without a URL, the day before the move (`change.previousStart`) is searched for a claimable one, as the check
   does today.

A dropped meeting (`cancelledMeetings`) or a cancelled event with no calendar event yet gets none (today's rule:
nothing to do), rather than a new calendar event that is cancelled from the start.

### What "in line" means

The record overwrites, on every calendar event it owns:

- **title:** the record's `title`, with "Zrušeno: " in front when the meeting is cancelled (the event's `change`
  status `cancelled`, or the date in `cancelledMeetings`); withdrawn, the prefix goes;
- **date and time:** the meeting's days and times, timed or all-day as in the `.ics` (`timing()` in
  `src/lib/news/ics.ts`); for the weekly event its start, `weeklyAt` and the weekly rule until `end`. A meeting with a
  start time but no end time keeps the end the calendar event has (moved by the same amount when the start moves),
  and the end is not compared; a calendar event the sync adds for it ends at its start (my call: Google needs an end,
  and inventing a duration would overwrite real ends on the first run);
- **place:** the record's `place` (as `location`);
- **description:** what the `.ics` writes: the lead (or text), a blank line, the page's absolute URL.

Only fields that differ are written, so an event already in line costs no write and the preview says "nothing to
do". The maintainer accepted that hand edits to an owned calendar event (a shorter title, a note in the description)
are overwritten: the record is the source of truth.

### Reports that change nothing

The preview and the apply both list, without acting:

- the "Ask" cases with their candidates;
- a calendar event holding the URL of a record that no longer exists, or of a meeting no longer in the record;
- a series whose URL-holding calendar events cannot be paired with its meetings;
- a calendar event the sync added that someone deleted by hand (Google keeps it with `status: cancelled` under its
  id, read with `showDeleted`): the deletion is respected and reported, never undone or re-added (my call). This
  holds for its event of the date before a move too (`change.previousStart`): the moved meeting is then reported as
  deleted instead of added. Any other deleted event of the record (a date it no longer has) stops nothing: its
  other meetings are still added.

### Running it

- **Preview** (`pnpm calendar-sync`, no write access needed): reads Události with the public browser key
  (`NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY` and the site's referrer, as `pnpm event-calendar` does) and prints one line
  per change and per report, in English, quoting Czech titles as they are. "Nothing to do" when the calendar is in
  line.
- **Apply** (`pnpm calendar-sync --apply`): the same plan, then the writes with the service account (below). It
  rereads the calendar first, so it acts on the calendar as it is, not as the preview saw it. It prints what it
  changed; a failed write is reported and the run goes on with the rest. A rerun is safe.
- **Plan as data:** the matching and the "in line" comparison are pure functions from the records and the calendar
  events to a list of changes and reports, tested without network access; reading and writing Google are thin layers
  around them.
- **One event:** `pnpm event-calendar <id>` becomes the preview for one event (the skills keep calling it after
  `add-event`, `replace-event` and `stage event`), and stops writing an `.ics` to import: an event that is new to the
  calendar is added by the release.

### Where it runs

- **`pnpm release`** prints the calendar preview with the commits, version and uploads, so the maintainer's yes covers
  it. Without a key, or when Google does not answer, it says the calendar was not checked; the release goes on.
- **A merged content PR** releases with `pnpm release --yes` unattended (`content-release.yml`): the merge is the yes
  for **every** calendar change of that release, also ones outside the PR (a reverted hand edit), as the maintainer
  decided. The PR body's preview covers only its own events.
- **The deploy workflow** applies it once the site is deployed and verified, on a release tag only (a scheduled
  refresh only previews, in the run summary). After the deploy, so every URL it writes into the calendar is already a
  live page. The prerendered Kalendář of that build is then one release behind for visitors without JavaScript; with
  JavaScript the calendar is read live in the browser (`use-calendar-entries`), so it is current at once (the builder's
  call: the alternative, applying before the build in its own job, is acceptable too if it keeps the deploy
  independent of it).
- **A failed sync** marks the step (or job) with a warning and the reason; the deploy is not affected, and the next
  release catches up.
- **`pnpm release --local`** applies it from this machine after its deploy and verify, with the key in `.env.local`.
- The service account key must stay out of the job that builds the site and out of the `Production` environment's
  deployment records if a separate job is used: the refresh logic counts `Production` deployments to find the last
  deploy, so a sync job must not create one (its own environment, e.g. `calendar-sync`, holds the secret).

### Credentials

- A **Google service account** in the Google Cloud project that already holds the browser key. Události is owned by
  the maintainer's personal Gmail account, which may share a calendar with any address: the maintainer shares it with
  the service account's address with "Make changes to events" (the one step only the maintainer can do).
- Its JSON key is a secret: `GOOGLE_CALENDAR_SERVICE_ACCOUNT` (the JSON, or a path to it, the builder's call) in
  `.env.local` locally and as a secret of the environment the sync step runs in. Never in the build (it is not
  `NEXT_PUBLIC_`), never committed, never printed.
- Authentication with an established library (`google-auth-library`'s JWT client, checked with context7 first), and
  the Calendar API through `fetch` as the reader does; `googleapis` as a whole is not needed.
- Without the key, `--apply` fails with a clear message (exit 1); the preview needs only the browser key.

### Skill and pipeline changes

- **`parish-create-event`:** step 5 shows the calendar preview for the event (linked, will claim "<title>", will add,
  or ask); no `.ics` to import and no URL to paste, except in the "Ask" case.
- **`parish-correct-event`** and **`parish-cancel-event`:** the "ask the user to rename or move the event, then run
  `pnpm event-calendar` again" steps go; the preview line is shown with the confirmation, and the release applies it.
  The "Common mistakes" about deleting or importing stay true for hand edits.
- **`parish-release`** and **`parish-publish-content`:** mention that the release preview lists the calendar changes,
  and that the yes covers them.
- **Events e-mail pipeline** (`events.yml`, `parish-create-event`'s "Unattended run"): the PR body's `## Mirror in
the calendar` becomes the calendar preview for the PR's events; an "Ask" case is a blocking question (the PR stays
  a draft until a person has pasted the URL into the right calendar event). The pipeline still never writes to the
  calendar: the merge releases, and the release applies.
- **Docs:** README (commands, `.env.local`), `docs/deployment.md` (the sync step, its secret and environment, the
  one-time sharing), `design/DESIGN.md` §16.4 (the site now keeps Události in line), the events e-mail pipeline spec's
  non-goal about the calendars.

### First run

Every future event that already links a calendar event is brought in line on the first apply: titles, times, places
and descriptions written by hand change to the records'. The first `pnpm release` after the sync is built shows the
whole list; the maintainer reads it before the yes. So the first apply goes through a hand-run `pnpm release`, never
through a merged content PR: until the maintainer has released once with the sync, the deploy workflow does not apply
it (how it knows is the builder's call, e.g. a repository variable the maintainer sets after that release).

## Constraints

- Static export only: the sync is a script and a workflow step, nothing in `src/` that runs on a server; `src/lib`
  may gain pure helpers the sync shares with the site (the `.ics` timing, the URL), as `scripts/` already imports it.
- Where code goes (`.claude/rules/structure.md`): `scripts/calendar-sync.ts` is the entry point (its header documents
  the command), the logic and its tests in `scripts/lib/calendar/` or `scripts/lib/news/`.
- Prague time throughout (`@date-fns/tz`, `src/lib/shared/prague.ts`); Google takes RFC 3339 with the offset, or
  `date` for all-day events, with `timeZone: "Europe/Prague"` on the repeating event so its weekly time survives the
  change of daylight saving time.
- The agent rules stay: an agent never runs `--apply` itself outside `pnpm release` after the user's yes.

## Left to the builder

- The exact preview wording and the module split.
- Whether the sync applies after the deploy (in the deploy job) or before the build (its own job), within the rules
  under "Where it runs".
- The id derivation, as long as it is deterministic and valid for Google.
- Reading a weekly repeating event's master (for its rule) beside the single occurrences the site reads
  (`singleEvents=true`).
