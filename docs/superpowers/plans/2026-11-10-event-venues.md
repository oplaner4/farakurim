# Event Venues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Events refer to a venue from a JSON venue list, chosen by the agent with `pnpm venue` and the Mapy.com API,
so their map link, `.ics`, structured data and Události location name a real building and address.

**Architecture:** The list moves to `src/content/venues.json` (zod schema in `src/lib/venues/schema.ts`). Pure matching
and checks live in `src/lib/venues/match.ts`; the Mapy.com client and the `pnpm venue` subcommands in
`scripts/lib/venues/`. Events gain `venue?: string`; every consumer of `place` that leaves the site takes an optional
`Venue` argument, resolved by its caller.

**Tech Stack:** TypeScript, zod, Vitest, tsx scripts, the `ics` package, Mapy.com REST API v1.

**Spec:** `docs/superpowers/specs/2026-11-10-event-venues-design.md`. One correction against it: `place` is optional
on events (announcements have none), so a `venue` requires `place` instead of `place` being required.

## Global Constraints

- Code, comments, docs, commits in English; venue names, addresses, aliases and quoted Czech in Czech.
- `src/lib` imports content types only, never content data; imports `./x` or `@/…`; scripts: entry points in
  `scripts/<command>.ts` only, logic in `scripts/lib/` (`.claude/rules/structure.md`).
- Script output uses the tags of `scripts/lib/output.ts` (`tell:`, `ask:`, `next:`, `state:`); results stay untagged
  (`Would add …`, `Added …`, `Changed: …`).
- Mapy.com: base `https://api.mapy.com/v1`, key in the `X-Mapy-Api-Key` header, `lang=cs`; `geocode` (`query`, `limit`
  ≤ 15, `type` repeated, `locality`), `rgeocode` (`lon`, `lat`); items `{ name, label, position: {lon, lat}, type,
location, regionalStructure: [{ name, type }], zip? }`; 4 credits a call, 250 000 free a month. The key is
  `MAPY_API_KEY`, never in `src/`, `out/` or a commit.
- A venue's `address` is `{ streetAddress?, part?, postalCode?, municipality, country }` (street and number one text,
  never split); `formatAddress()` gives "Křížkovského 55/5, 664 34 Kuřim, Česko"; the calendars' location is
  `venueLocation()` ("name, formatted address"). `position` is required; the map link is a pin:
  `https://mapy.cz/zakladni?source=coor&id=<lon>%2C<lat>&x=<lon>&y=<lat>&z=17`. Venues have no `mapQuery` and no
  `village`.
- Never run `pnpm calendar-sync --apply`, `pnpm release --yes` or anything that publishes without the user's yes.
- Done means `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build` (the 4 `content-pr` tests
  that fail on Windows on `main` excepted) and, for Task 3, the browser check of an event detail page.

## Review Focus

- **A venue from another village** ("Kuřim, fara" pointed at a Česká venue) must be refused by every writer and the
  content test → `venueProblems()` tests in Task 2, used in Tasks 3 and 4.
- **"kostel" in two villages:** an alias matches only within its village, and `alias` refuses a text another venue of
  that village has → Task 2 `findVenue` test, Task 6 `alias` test.
- **No key:** `lookup` and `add` without `MAPY_API_KEY` stop with `next:` naming `.env.local`; `find`, `alias`,
  `assign` work offline → Task 6 test.
- **A share link** that is not Mapy.com is refused unfetched; one to a named place (map centre) is marked approximate,
  one to a point (`source=coor`) exact → Task 5 test.
- **Calendar churn:** the structured address must format to today's church strings exactly (Bohoslužby unchanged),
  and assigning venues changes only the Události location of upcoming events → Task 1 pinned test, Task 9 preview.

---

### Task 1: The venue list as JSON, with structured addresses and positions

**Files:**

- Create: `src/content/venues.json`, `src/lib/venues/schema.ts`, `src/lib/venues/schema.test.ts`
- Modify: `src/content/venues.ts` (loader), `src/content/types/venues.ts`, `src/content/venues.test.ts`,
  `src/lib/shared/venues.ts` (+ test), `src/lib/shared/links.ts` (+ test), `src/content/masses.test.ts` (pinned
  locations stay), `.claude/rules/structure.md` (`venues` group: content in `venues.json`, schema in `lib/venues/`),
  `.claude/rules/content-and-time.md` (`## Venues`: structured address, position, pin link)
- Delete: `VENUE_IDS` from `types/venues.ts`; `mapQuery` and `village` from venues

**Interfaces:**

- Produces: `type VenueId = string`; `type Position = { lat: number; lon: number }`; `type VenueAddress = {
streetAddress?: string; part?: string; postalCode?: string; municipality: string; country: string }`; `type Venue
= { id: string; name: string; address: VenueAddress; position: Position; aliases?: string[]; catalogueHref?: string
}`; `venueFileSchema` (`{ venues: Venue[] }`, strict); `venueList: Venue[]` and `venues: Record<string, Venue>` (by
  id) from `@/content/venues`; `formatAddress(address: VenueAddress): string` and `venueLocation(venue)` in
  `lib/shared/venues.ts`; `positionMapHref(position: Position): string` in `lib/shared/links.ts`, and
  `venueMapHref(venue) = positionMapHref(venue.position)`.

- [ ] **Step 1: Positions of the nine.** Known: `kurim-kostel` 49.2966286, 16.5257081; `kurim-fara` 49.2965974,
      16.5264040; `moravske-kninice-kostel` 49.2933365, 16.5012323; `jinacovice-kaple` 49.2679434, 16.5292303. Look up
      the Česká chapel (the building, not the address point 49.2803893, 16.5653142) and the four other chapels on
      Mapy.cz in the browser; check the Husovice-style order of `part` on one real address. Show the user a table (id,
      address parts, position, pin link); wait for the yes.
- [ ] **Step 2: Failing tests.**
  - `schema.test.ts`: refuses a duplicate `id`; an `id` that is not slug-shaped (`/^[a-z0-9]+(-[a-z0-9]+)*$/`; the nine
    existing ids are shorter than `slug(municipality name)`, so only `pnpm venue add` derives new ids from it); an alias
    equal (folded, `foldPlace`) to another venue's name or alias in the same municipality; a venue without `position`
    or `address.municipality`; a latitude outside −90…90.
  - `venues.test.ts` (shared): `formatAddress` of `{ streetAddress: "Křížkovského 55/5", postalCode: "664 34",
municipality: "Kuřim", country: "Česko" }` → "Křížkovského 55/5, 664 34 Kuřim, Česko"; of `{ municipality: "Kuřim",
country: "Česko" }` → "Kuřim, Česko"; with `part` in the order step 1 found.
  - `links.test.ts`: `positionMapHref({ lat: 49.2966286, lon: 16.5257081 })` →
    `https://mapy.cz/zakladni?source=coor&id=16.5257081%2C49.2966286&x=16.5257081&y=49.2966286&z=17`.
  - `content/venues.test.ts`: every `venue` referenced by `places`, `parishChurches`, the chapels, `contacts.venue`
    and `nativitySeasons` exists. `masses.test.ts`' pinned Bohoslužby locations stay as they are.
- [ ] **Step 3: Run** `pnpm exec vitest run src/lib/venues src/lib/shared src/content` → FAIL.
- [ ] **Step 4: Implement.** Move the nine venues into `venues.json` (addresses in parts, the confirmed positions,
      no `mapQuery`, keys in the schema's order), load it like `gallery.ts` (`safeParse`, throw with
      `z.prettifyError`). References typed `VenueId` stay. `foldPlace` is needed here: create `src/lib/venues/match.ts`
      with only `foldPlace` now (Task 2).
- [ ] **Step 5: Run** the full check → PASS (but the 4 known); `pnpm calendar-sync --calendar services` (preview) shows
      nothing new to do beyond the 231 location updates already pending. Browser: the map links on Pořad bohoslužeb,
      Kontakty and Betlémy open a pin on the building (390/834/1440 px, both themes).
- [ ] **Step 6: Commit** `refactor(content): keep the venues as JSON with their addresses in parts and positions`

### Task 2: Matching and checks

**Files:** Modify `src/lib/venues/match.ts`; Create `src/lib/venues/match.test.ts`

**Interfaces:**

- Produces:
  - `foldPlace(text: string): string`: `fold()` from `lib/shared/czech.ts`, dots removed, whitespace collapsed, trimmed.
  - `buildingText(place: string, village: string): string | null`: the text after `village` and a comma when `place`
    starts with `village` (folded); `""` when `place` is the village alone; `null` when it does not start with it.
  - `findVenue(list: Venue[], village: string, place: string): { kind: "known"; venue: Venue } | { kind: "candidates";
venues: Venue[] } | { kind: "wrong-village" }`.
  - `venueProblems(event: { place?: string; venue?: string; mapQuery?: string }, venues: Record<string, Venue>):
string[]` (a structural type, so it needs no `NewsEvent.venue` before Task 3).

- [ ] **Step 1: Failing tests** with the spec's examples (fixture: `kurim-fara` with aliases `["areál za farou"]`,
      `kurim-kaple-jana-nepomuckeho`, `moravske-kninice-kaple-jana-nepomuckeho`, `ceska-kaple`):
  - `findVenue(l, "Kuřim", "Kuřim, areál za farou")` → known `kurim-fara`; `"Kurim, ARÉAL ZA FAROU"` → the same;
  - `findVenue(l, "Kuřim", "Kuřim, kaple sv. Jana Nepomuckého")` → known `kurim-kaple-jana-nepomuckeho` (not Knínice);
  - `findVenue(l, "Kuřim", "Kuřim, farní zahrada")` → candidates = the Kuřim venues;
  - `findVenue(l, "Kuřim", "Česká, sokolovna")` → `wrong-village`;
  - `venueProblems`: `[]` for `{place: "Kuřim, fara", venue: "kurim-fara"}`; one problem each for an unknown venue, a
    venue without `place`, a venue whose `address.municipality` `place` does not start with, and `mapQuery` next to
    `venue`.
- [ ] **Step 2: Run** `pnpm exec vitest run src/lib/venues/match.test.ts` → FAIL.
- [ ] **Step 3: Implement** the four functions. Problems are English sentences naming the field
      (`venue: no venue with the id …`).
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(lib): match an event's place with a venue`

### Task 3: Events carry a venue

**Files:**

- Modify: `src/content/types/news.ts` (`venue?: string` after `mapQuery`, doc: "A venue of `venues.json`; requires
  `place`"), `src/lib/news/schema.ts` (`venue: text.optional()` after `mapQuery`), `src/content/news/news.test.ts`,
  `src/lib/news/ics.ts`, `src/lib/shared/structured-data.ts`, `scripts/lib/calendar/desired.ts` and its caller,
  `src/app/aktuality/[slug]/kalendar.ics/route.ts`, `src/components/news/EventDetail.tsx`,
  `src/components/news/EventWhenWhere.tsx`, `src/components/news/NewsPage.tsx:18` (strip `venue` for cards too),
  their tests.

**Interfaces:**

- Consumes: `venues`, `venueLocation`, `venueMapHref`, `venueProblems`.
- Produces: `eventCalendar(event, url, venue?: Venue)`, `eventJsonLd(event, url, venue?: Venue)`,
  `desiredEvents(event, today, venue?: Venue)`; callers pass `event.venue ? venues[event.venue] : undefined`.

- [ ] **Step 1: Failing tests:**
  - `ics.test.ts`: with a venue `{ name: "Sokolovna", address: { streetAddress: "Hlavní 1", postalCode: "664 31",
municipality: "Česká", country: "Česko" }, position: { lat: 49.28, lon: 16.56 } }` the calendar holds `LOCATION:Sokolovna\, Hlavní 1\, 664 31 Česká\, Česko` and `GEO:49.28;16.56`;
    without one, `LOCATION:` is `place` and there is no `GEO`.
  - `structured-data.test.ts`: with the venue, `location` is `{ "@type": "Place", name: place, address: { "@type":
"PostalAddress", streetAddress, postalCode, addressLocality: municipality, addressCountry: country }, geo: { "@type":
"GeoCoordinates", latitude, longitude } }` (absent parts left out); without, as today.
  - `desired.test.ts`: `location` is `venueLocation(venue)` with a venue, `place` without.
  - `news.test.ts`: every record's `venueProblems(e, venues)` is `[]`.
- [ ] **Step 2: Run** `pnpm exec vitest run src/lib/news src/lib/shared scripts/lib/calendar src/content/news` → FAIL.
- [ ] **Step 3: Implement.** The `ics` package's `geo: { lat, lon }` attribute writes `GEO` (check with context7
      before use). `EventWhenWhere` links `venueMapHref(venue)` when the event has one, else `mapHref(mapQuery ?? place)`;
      it shows `place` as now.
- [ ] **Step 4: Run** the full check → PASS (the 4 known). Browser: one event detail page renders unchanged (no event
      has a venue yet). **Step 5: Commit** `feat(news): take an event's location from its venue`

### Task 4: The event scripts refuse a wrong venue

**Files:** Modify `scripts/lib/news/add-event.ts`, `scripts/lib/news/replace-event.ts`, `scripts/lib/stage/event.ts`
and their tests.

- [ ] **Step 1: Failing tests** (one per script, the stage one through `--record`): a record with `venue` from
      another village throws a refusal whose reason starts `venue:`; `mapQuery` next to `venue` the same; a valid venue
      passes and `replace-event --check` prints `Changed: venue` (and `mapQuery` when it goes).
- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/news scripts/lib/stage` → FAIL.
- [ ] **Step 3: Implement:** after `parseOrThrow(newsEventSchema, …)`, `venueProblems(record, venues)` non-empty →
      `refusal(problems[0], ...problems.slice(1).map(tell))`.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(scripts): refuse an event venue that does not fit its place`

### Task 5: The Mapy.com client

**Files:** Create `scripts/lib/venues/mapy.ts`, `scripts/lib/venues/mapy.test.ts`

**Interfaces:**

- Produces: `type MapyItem` (the item shape of Global Constraints); `mapyKey(): string` (loads `.env.local` with
  `loadEnvLocal()` from `scripts/lib/calendar/apply.ts`, then `requiredEnv("MAPY_API_KEY")`);
  `geocode(query: string, opts: { village: string; types?: string[]; limit?: number }, key): Promise<MapyItem[]>` (keeps
  only items whose `regionalStructure` has `{ type: "regional.municipality", name: village }`);
  `rgeocode(position, key): Promise<MapyItem[]>`; `municipalityOf(item: MapyItem): string | undefined` (its
  `regional.municipality` entry); `addressOf(item: MapyItem): VenueAddress` (an address item: `streetAddress` = its
  `name`, `part` = its `regional.municipality_part` when that differs from the municipality, `postalCode` = `zip`,
  `municipality`, `country`); `shareLinkPosition(url: string): Promise<Position & { exact: boolean }>`;
  `distanceMetres(a, b): number` (haversine).

- [ ] **Step 1: Failing tests** with a stubbed `fetch` (as `src/test/fetch.ts`):
  - `geocode` sends `X-Mapy-Api-Key`, `query`, `lang=cs`, `locality=<village>`, each type as its own `type=` and
    drops an item whose municipality is "Brno" when the village is "Česká";
  - `shareLinkPosition("https://mapy.com/s/pajohadave")` reads the `301` `location`
    (`…&x=16.5826607&y=49.2935811…`) → `{ lat: 49.2935811, lon: 16.5826607 }`, with `redirect: "manual"`; `exact` is
    `true` for `source=coor` (position from its `id`), `false` for a named place (`source=base`, map centre);
    a URL not on `mapy.com`/`mapy.cz` is refused without a request;
  - `addressOf` of the docs' example item ("Týnská ulička 610/7", `zip` "110 00", part "Staré Město", municipality
    "Praha 1") → the matching `VenueAddress`;
  - `distanceMetres` of two points 0.001° of latitude apart ≈ 111 m (±1).
- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/venues/mapy.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Real calls with the key (`geocode("kostel sv. Markéty", { village: "Moravské
Knínice" })`, `rgeocode` of the fara and the Kuřim church) confirm the shapes, what `regionalStructure` holds for a
      POI and an address, and the `type`/`locality` encoding before the commit; adjust the code, not the
      spec, if they differ, and ledger it.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(scripts): look places up on Mapy.com`

### Task 6: `pnpm venue`

**Files:** Create `scripts/venue.ts` (header: what each subcommand does, `Usage:`, used by `parish-create-event` and
`parish-correct-event`), `scripts/lib/venues/command.ts`, `scripts/lib/venues/command.test.ts`; Modify `package.json`
(`"venue": "tsx scripts/venue.ts"`), `scripts/lib/content-files.ts` (`VENUES_FILE`).

**Interfaces:**

- Consumes: Task 2's `findVenue`, `foldPlace`; Task 5's client; `slug`; `writeContentFile`; `venueFileSchema`.
- Produces the subcommands and their output:

  | Subcommand                                                            | Output                                                                                                                                                                                                                                                                       |
  | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `find --village <v> "<place>"`                                        | `state: known <id>`; or `ask: "<place>" matches no venue of <v>.` then one line per candidate `<id>  <name> (<aliases>)`, or `tell: <v> has no venues yet.`; `wrong-village` → refusal                                                                                       |
  | `lookup --village <v> ("<query>" \| --link <url> \| --address "<a>")` | one block per item: `name`, `label`, `formatAddress(addressOf(item))`, `lat,lon`, `positionMapHref`; with `--link`, the one position marked `exact` or `approximate (the shared map's centre)`, its reverse-looked-up address and the nearest listed venue with its distance |
  | `add <venue.json> [--check]`                                          | `Would add the venue <id>` / `Added …`, then the fields and the pin link; a `tell:` when the formatted address lands > 150 m from the position                                                                                                                               |
  | `alias <id> "<text>" [--check]`                                       | `Would add the alias …` / `Added …`                                                                                                                                                                                                                                          |
  | `assign [--check]`                                                    | per record whose `place` gives `known` with the record's own village (`place` before the first comma): `Would set <event id> venue <id>` (and `, drop mapQuery`); records already with a venue are skipped                                                                   |

- [ ] **Step 1: Failing tests** (temp copies of `venues.json` and a news dir via `freshTempDir()`):
  - `add` refuses an id not equal to `slug(`${municipality} ${name}`)`, an existing id, a file without `position`,
    and (stubbed `rgeocode`) a position whose municipality differs from `address.municipality`; fills a missing
    `address.municipality` from it; (stubbed `geocode`) prints a `tell:` and still adds when the formatted address
    lands > 150 m from `position`;
  - `alias kurim-fara "kostel"` is refused when `kurim-kostel` has that name or alias folded; accepted for
    `"farní zahrada"`, writing it sorted into `aliases`;
  - `lookup` without `MAPY_API_KEY` throws a refusal with `next: add MAPY_API_KEY to .env.local`; `find` needs no key;
  - `assign --check` on a fixture month prints the `Would set` lines and writes nothing; without `--check` writes the
    month files through `writeMonth`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (`parseCommand`/`execute` per `scripts/lib/command.ts`).
- [ ] **Step 4: Run** `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit` → PASS (the 4 known).
- [ ] **Step 5: Commit** `feat(scripts): add pnpm venue to find, look up, add and assign venues`

### Task 7: The key, locally and in CI

**Files:** Modify `.env.local.example` (`MAPY_API_KEY=` with a comment: "Mapy.com REST API key (developer.mapy.com),
only for `pnpm venue lookup` and `add`"), `README.md` (the env table), `.github/workflows/events.yml` (agent step env
`MAPY_API_KEY: ${{ secrets.MAPY_API_KEY }}`, allowed commands add `pnpm venue:*`),
`.github/workflows/content-fix-run.yml` (the same), `docs/content-pipelines.md` (one line: the secret in the
`events-publish` and `content-fix` environments).

- [ ] **Step 1:** Make the edits; `pnpm exec prettier --check` on them passes.
- [ ] **Step 2: Ask the user** to add the secret `MAPY_API_KEY` to the `events-publish` and `content-fix`
      environments and the key to their `.env.local` (never paste it in chat). **Step 3: Commit**
      `ci: give the content agents the Mapy.com key`

### Task 8: The skills

**Files:** Modify `.claude/skills/parish-create-event/SKILL.md`, `.claude/skills/parish-correct-event/SKILL.md`,
`scripts/lib/skill-quotes.test.ts` if it checks quoted tags.

- [ ] **Step 1:** `parish-create-event`: field table gains `venue` ("for an event at one building: see 'Finding
      `venue`'"); `mapQuery` only without a venue. New section **Finding `venue`** after step 2, written like "Finding
      `newsId`" in `parish-create-service-sheet`: decide one building or none; name the village (the municipality); `pnpm
venue find`; known → take it; candidates → pick by meaning or none, never guess, propose an alias; nothing fits →
      `lookup`, judge the building, `add --check`, show the proposal with its pin link (the user opens it); the confirmation (step 4) lists
      the venue and any new venue or alias; write them before the record. **Unattended run:** only `known` or no venue; a
      candidate, a new venue or an alias becomes a question (`blocking: no`) with the `lookup` proposal and its link.
- [ ] **Step 2:** `parish-correct-event`: a changed place runs the same section; **Comment run** may set a `known`
      venue or one the comment names; never `add` or `alias`.
- [ ] **Step 3: Run** `pnpm test:scripts` (skill quotes) → PASS. **Step 4: Commit**
      `docs(skills): choose an event's venue with pnpm venue`

### Task 9: Seed the list and move the records

- [ ] **Step 1:** For each venue of the spec's "Moving the existing records" list: `pnpm venue lookup`, fill a
      `venue.json`, `pnpm venue add … --check`. Show the user one table (id, name, formatted address, position, pin link, aliases =
      the `place` spellings the records use); after the yes, `add` without `--check` and commit
      `feat(content): add the venues events are held at`.
- [ ] **Step 2:** `pnpm venue assign --check`; show the user the list (count by venue, and every record losing a
      `mapQuery`); after the yes, `pnpm venue assign`, `pnpm test`, commit `feat(content): give the events their venues`.
- [ ] **Step 3:** `pnpm calendar-sync --calendar events` (preview): only `place` updates of upcoming events. Report
      the count; the release applies it.
- [ ] **Step 4:** Full check and the browser check of one event detail page with a venue (map link, location text)
      at 390/834/1440 px, both themes.
