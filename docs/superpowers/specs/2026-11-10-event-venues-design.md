# Event venues: design

Status: draft. Events refer to a venue from the venue list, chosen by the agent and checked by scripts, so their
location is a real address everywhere it leaves the site. Date: 2026-11-10.

## Intent

An event's `place` ("Česká, sokolovna") is a label for people. Today it is also the location of the Události
calendar, the `.ics` and the structured data, and the site's map link searches it unless the record has a `mapQuery`.
A label is often not enough for a map: "Česká" finds Česká street in Brno, "u vodojemu na Pasekách" finds nothing.
The same place is spelled differently from event to event, and a fixed address is typed again (or not) each time.

Step 1 (`docs/superpowers/plans/2026-11-10-venues.md`, merged) wrote the parish's own buildings once, in
`src/content/venues.ts`, for the services, Kontakty and Betlémy. This step lets events use that list, grows it with
the places events are held at, and adds the tooling to choose or create a venue: scripts for what is exact (the list,
the Mapy.com API), the agent for what needs judgment (which venue a text means), the user for every new venue.

## Goals

- An event at one building refers to its venue (`venue: "ceska-sokolovna"`); its `place` stays the readable label.
- The site's map link, the `.ics` (`LOCATION`, `GEO`), the structured data (`location.address`, `geo`) and the
  Události calendar take the venue's address and position; an event without a venue keeps today's behaviour.
- `parish-create-event` and `parish-correct-event` choose a venue for every event at one building, or create one with
  the user's yes; a doubtful match is never guessed.
- The list learns: a confirmed spelling becomes an alias, so the next event there matches without a question.
- The existing records, past ones included, refer to their venue where one applies.

## Non-goals

- No venue for an event in several villages, a whole village, an alternative ("…, nebo …") or online: they keep
  `place` alone.
- No fuzzy text matching in scripts: a script matches exactly or lists candidates.
- No network in the build or the tests: the Mapy.com API is called only while content is added.
- No venue page on the site and no change to the design of the cards or the detail page.

## Decisions

### The venue list

- `src/content/venues.ts` becomes `src/content/venues.json`, checked on import by a zod schema (as the event months
  and `gallery.json`), so scripts can write it. `VenueId` becomes `string`; a content test checks every reference
  (services, Kontakty, nativity, events) against the list.
- A venue:

  | Field           | Meaning                                                                                           |
  | --------------- | ------------------------------------------------------------------------------------------------- |
  | `id`            | `<village>-<building>` slug (`lib/shared/slug.ts`), unique, never changed once used               |
  | `name`          | "Sokolovna", "Kostel sv. Maří Magdalény"                                                          |
  | `village`       | The **municipality** as Mapy.com names it ("Brno" for Brno-Husovice; the district goes in `name`) |
  | `address`       | Postal address, including the country; optional for a place without one                           |
  | `position`      | `{ lat, lon }` from Mapy.com; optional until looked up                                            |
  | `mapQuery`      | Only when searching `address` does not find the place (the map link's priority stays step 1's)    |
  | `aliases`       | Building texts already confirmed for this venue ("areál za farou", "farní zahrada")               |
  | `catalogueHref` | As in step 1                                                                                      |

- The map link stays `venueMapHref()`: `mapQuery`, else `address`, else `name village`.
- **Addresses are postal addresses only**, without the building's name: "Křížkovského 55/5, 664 34 Kuřim, Česko".
  The calendars' location is `venueLocation()`: "`name`, `address`" ("Kostel sv. Maří Magdalény, Pátera Peši, 664 34
  Kuřim, Česko"), or "`name`, `village`" without an address, because a church or chapel often has a street but no
  number, and its address alone finds the street. Done before this step (the churches' addresses corrected from
  Mapy.com, the Bohoslužby location built this way).

### Events

- `NewsEvent` gains `venue?: string`. `place` stays required and is what people read.
- With a venue: the map link is `venueMapHref(venue)`; the `.ics` `LOCATION` and the Události location are
  `venueLocation(venue)` (falling back to `place`), as the Bohoslužby location is; `GEO` and the structured data's `geo` come from `position`; the structured data's
  `location.name` is `place`, its `address` the venue's address.
- Without a venue: everything as today (`mapQuery ?? place`, `place` as the location). `mapQuery` on events is kept
  for them and is refused next to a `venue`.
- The schema refuses a `venue` that is not in the list, and one whose `village` does not start `place` (folded).

### Choosing a venue (hybrid)

**The village is stated, never parsed.** The agent reads the source and names the municipality; scripts check it.
Splitting `place` at a comma fails on "Brno-Husovice, fara", "Altötting, Německo" and lists of villages.

| Who        | Does                                                                                                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Script** | Matches exactly (folded: case, accents, dots, spaces) within the stated village; lists that village's venues; looks places up on Mapy.com inside the municipality; writes the list; refuses what breaks the rules |
| **Agent**  | Reads the source; decides whether the event has one building at all; names the village; picks a venue from the candidates by meaning, or none; builds a new venue from the lookup                                 |
| **User**   | Confirms every new venue and every new alias; chooses when the agent is not sure                                                                                                                                  |

The flow in the skill, for an event at one building:

1. `pnpm venue find --village "<village>" "<place>"`: an exact match of the building text with a venue's `name` or
   `aliases` in that village prints `state: known <id>`; otherwise `ask:` with the village's venues (none listed when
   the village has none).
2. Known → the event takes the venue. Otherwise the agent reads the candidates with the source: a venue that fits by
   meaning ("farní zahrada" → `kurim-fara`) is proposed as that venue plus a new alias; a doubtful one is asked; none
   fits → step 3. Never guess (as "Finding `newsId`" in `parish-create-service-sheet`).
3. `pnpm venue lookup --village "<village>" (--link <share link> | --address "<address>" | "<query>")`: Mapy.com
   results inside that municipality only, each with its name, address, position and Mapy link. The agent judges which
   one is the building, or asks the user for a share link when none is.
4. `pnpm venue add <venue.json> --check` prints the new venue (`Would add …`); `pnpm venue alias <id> "<text>"
--check` the new alias. The user confirms; the same commands without `--check` write.
5. `add-event` / `replace-event` write the event with its `venue`.

### Scripts

| Command                                     | Network | Rules                                                                                                                                     |
| ------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm venue find --village <v> "<place>"`   | no      | `place` must start with the village (folded); exact match only; output in the tags of `scripts/lib/output.ts`                             |
| `pnpm venue lookup --village <v> …`         | yes     | keeps only results whose municipality is `<v>`; resolves a share link's redirect first (no key needed for that part)                      |
| `pnpm venue add <file> [--check]`           | yes     | schema; unique id from village and name; `address` searched on Mapy.com must land within 100 m of `position`, else `mapQuery` is required |
| `pnpm venue alias <id> "<text>" [--check]`  | no      | refused when the text already matches another venue of the same village                                                                   |
| `add-event`, `replace-event`, `stage event` | no      | refuse an unknown venue, a venue from another village, and `mapQuery` next to `venue`                                                     |

- The key is `MAPY_API_KEY` in `.env.local` (README, `.env.example`), read only by `lookup` and `add`; it never reaches
  `out/` or the browser. The calls happen on the maintainer's machine or in CI, never in a visitor's browser, so the
  privacy page does not change.
- The exact request and response shapes are taken from the current Mapy.com REST API docs before the plan is written
  (geocode, reverse geocode, the place-type and municipality filters, the free tier's limits).

### Unattended runs

The events pipeline and comment runs cannot ask. They accept a `known` venue, or none; anything else (a candidate by
meaning, a new venue, a new alias) is a question in the report (`blocking: no`: the event is published without a
venue and corrected after the answer). CI gets `MAPY_API_KEY` as a secret of the pipelines' environment, so a run
can `lookup` and put a proposed venue (with its Mapy link) in the report's question, ready for the maintainer's yes.

### Moving the existing records

- Seed `venues.json` with step 1's nine venues and the recurring venues found in the records (the Kuřim castle, the ZŠ
  Komenského, the SKC, the kulturní dům, the Česká sokolovna, the Lelekovice vodojem, Mezihoří, the Tišnov fara,
  church and sál pod kinem, Porta Coeli, Petrov, Lidická 24, the Brno churches used twice, the Biskupské gymnázium,
  Výstaviště, the Husovice fara), each looked up and confirmed by the user, with the spellings already used as
  aliases. One-off places elsewhere get a venue only when an event there comes again.
- Every record whose `place` matches a venue exactly (with its village) gets `venue`, past events included; its
  `mapQuery` goes. A one-off migration script does it in one commit, printing each change; the user reviews the list.
- The next release brings the Události calendar in line: the location of every upcoming event with a venue changes.

## Risks

- **Calendar churn:** a venue's address change rewrites the Události location of its upcoming events (and, for a
  church, of Bohoslužby: step 1's pinned test guards it).
- **Wrong building:** Mapy.com can return a plausible address for the wrong building; only the user's yes guards it, so
  every new venue is shown with its Mapy link.
- **Google differs from Mapy:** the calendars geocode the location with Google, not Mapy; the building's name with a
  postal address including the country is what both find most reliably.
- **Alias collisions:** "kostel" means a different venue in each village; aliases are matched only within the stated
  village, and `alias` refuses a text another venue of that village already has.

## Plan

One plan: the data (JSON list, fields, postal addresses, event `venue`, its consumers), the scripts, the key, the
skills and the move of the records, in that order. It starts by checking the Mapy.com REST API docs.
