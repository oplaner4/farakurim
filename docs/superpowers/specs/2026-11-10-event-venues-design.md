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

  | Field           | Meaning                                                                                  |
  | --------------- | ---------------------------------------------------------------------------------------- |
  | `id`            | `<municipality>-<building>` slug (`lib/shared/slug.ts`), unique, never changed once used |
  | `name`          | "Sokolovna", "Kostel sv. Maří Magdalény"                                                 |
  | `address`       | Where it is, in parts (below); required, with only `municipality` and `country` in it    |
  | `position`      | `{ lat, lon }`: the building itself, confirmed by the user on a pin; required            |
  | `aliases`       | Building texts already confirmed for this venue ("areál za farou", "farní zahrada")      |
  | `catalogueHref` | As in step 1                                                                             |

- **The address is structured**, with schema.org's names where they fit:

  | Field           | Example             | Meaning                                                                                                    |
  | --------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
  | `streetAddress` | "Křížkovského 55/5" | Street and number as one text, as Mapy.com names an address ("Jinačovice 46" without streets); never split |
  | `part`          | "Husovice"          | The part of the municipality, when the address names it                                                    |
  | `postalCode`    | "664 34"            | The delivering post office's code; the town after it is always the municipality                            |
  | `municipality`  | "Kuřim"             | Required. The municipality as Mapy.com names it ("Brno" for Brno-Husovice); replaces `village`             |
  | `country`       | "Česko"             | Required                                                                                                   |

  `formatAddress()` joins the parts present: "Křížkovského 55/5, 664 34 Kuřim, Česko" ("`streetAddress`, `part`,
  `postalCode` `municipality`, `country`"; the place of `part` is checked on a real address, the Husovice fara, before
  it is coded). It must give exactly today's strings for the churches, or every upcoming Bohoslužby event is rewritten:
  step 1's pinned test guards it.

- The calendars' location stays `venueLocation()`: "`name`, `formatAddress(address)`" ("Kostel sv. Maří Magdalény,
  Pátera Peši, 664 34 Kuřim, Česko"), because a church often has a street but no number, and its address alone finds the
  street.
- **The map link is a pin at `position`** (`https://mapy.cz/zakladni?source=coor&id=<lon>,<lat>&x=<lon>&y=<lat>&z=17`),
  not a search. A text search is Mapy's guess, whatever the text: of five venues searched by "name, address", two were
  found, two gave only a result list and one gave a chapel of the same name near Olomouc. The pin's card says "Pozice na
  mapě", not the building's name; the exact place is worth that. `mapQuery` goes from venues (events without a venue
  keep theirs).

### Events

- `NewsEvent` gains `venue?: string`, which requires `place`; `place` stays what people read.
- With a venue: the map link is `venueMapHref(venue)`; the `.ics` `LOCATION` and the Události location are
  `venueLocation(venue)`, as the Bohoslužby location is; `GEO` and the structured data's `geo` come from `position`; the structured data's
  `location.name` is `place`, its `address` the venue's address.
- Without a venue: everything as today (`mapQuery ?? place`, `place` as the location). `mapQuery` on events is kept
  for them and is refused next to a `venue`.
- The schema refuses a `venue` that is not in the list, and one whose `address.municipality` does not start `place`
  (folded). The structured data's address is a `PostalAddress` built from the parts.

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
3. `pnpm venue lookup --village "<village>" …` finds the **position**, from one of three sources, best first:
   - `"<query>"`: the building by name; Mapy.com results inside that municipality only, each with its name, address
     parts, position and pin link. When Mapy.com knows the building, its position is the building's. The agent judges
     which result is the building, or asks the user for a share link when none is.
   - `--link <share link>`: a place Mapy.com does not know by name. A link to a point ("Co je zde?", `source=coor`) is
     exact; a link to a named place carries the map's centre, which is where the place is only if the user did not move
     the map, so it is printed as approximate.
   - `--address "<address>"`: the address point, a few metres from the building; for a building with a number and no
     entry of its own.
4. The agent writes the venue file (name, address parts from the lookup, position, aliases); `pnpm venue add
<venue.json> --check` fills `address.municipality` from a reverse lookup of the position and prints the new venue
   with its pin link (`Would add …`); `pnpm venue alias <id> "<text>" --check` the new alias. The user opens the pin and
   confirms; the same commands without `--check` write.
5. `add-event` / `replace-event` write the event with its `venue`.

### Scripts

| Command                                     | Network | Rules                                                                                                                                                                                                                                                        |
| ------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm venue find --village <v> "<place>"`   | no      | `place` must start with the village (folded); exact match only; output in the tags of `scripts/lib/output.ts`                                                                                                                                                |
| `pnpm venue lookup --village <v> …`         | yes     | keeps only results whose municipality is `<v>`; resolves a share link's redirect first (no key needed for that part)                                                                                                                                         |
| `pnpm venue add <file> [--check]`           | yes     | schema; unique id from municipality and name; refuses a position whose reverse lookup names another municipality than `address.municipality` (fills it when missing); warns (no refusal) when the formatted address, searched, lands > 150 m from `position` |
| `pnpm venue alias <id> "<text>" [--check]`  | no      | refused when the text already matches another venue of the same village                                                                                                                                                                                      |
| `add-event`, `replace-event`, `stage event` | no      | refuse an unknown venue, a venue from another village, and `mapQuery` next to `venue`                                                                                                                                                                        |

- The key is `MAPY_API_KEY` in `.env.local` (README, `.env.example`), read only by `lookup` and `add`; it never reaches
  `out/`, the browser or CI. The calls happen on the maintainer's machine only, never in a visitor's browser, so the
  privacy page does not change.
- The exact request and response shapes are taken from the current Mapy.com REST API docs before the plan is written
  (geocode, reverse geocode, the place-type and municipality filters, the free tier's limits).

### Unattended runs

The events pipeline and comment runs cannot ask. They accept a `known` venue, or none; anything else (a candidate by
meaning, a new venue, a new alias) is a question in the report (`blocking: no`: the event is published without a
venue and corrected after the answer). They run only `pnpm venue find`: CI holds no Mapy.com key, because the agents
read untrusted mail and could be talked into printing their environment (final review); the maintainer looks a new
venue up locally when answering.

### Moving the existing records

- Step 1's nine venues move to the new shape first: their addresses in parts, `mapQuery` dropped, and a position each
  (five known, the four chapels looked up), confirmed by the user on their pins. Their map links on Pořad bohoslužeb,
  Kontakty and Betlémy become pins.
- Seed `venues.json` with the recurring venues found in the records (the Kuřim castle, the ZŠ
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
- **Wrong building:** Mapy.com can return a plausible result for the wrong building, and a shared link to a named
  place can carry a moved map's centre; only the user's yes guards it, so every new venue is shown with its pin link.
- **Google differs from Mapy:** the calendars geocode the location with Google, not Mapy; the building's name with a
  postal address including the country is what both find most reliably.
- **Alias collisions:** "kostel" means a different venue in each village; aliases are matched only within the stated
  village, and `alias` refuses a text another venue of that village already has.

## Plan

One plan: the data (JSON list, fields, postal addresses, event `venue`, its consumers), the scripts, the key, the
skills and the move of the records, in that order. It starts by checking the Mapy.com REST API docs.
