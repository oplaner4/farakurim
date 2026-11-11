---
name: parish-manage-venues
description: Manage the venues (the buildings and their map pins) - choose an event's venue, add a venue looked up on Mapy.com, add a name of one (an alias), or change a venue - then publish. Use from parish-create-event and parish-correct-event when an event's place names a building, and whenever the user wants to add, rename, move or fix a venue ("místo", "budova", "špendlík", "adresa") or add an alias. Venues are never removed.
---

# Manage venues

The venues are the buildings that the services, Kontakty, Betlémy and events refer to by id. A venue's pin is the
map link, and its name and address are the calendars' location. `pnpm venue` finds, looks up, adds and changes
venues and adds aliases; never edit the list by hand. A venue is never removed, and its id never changes.

| The user wants…                       | Section |
| ------------------------------------- | ------- |
| the venue of an event (from a skill)  | A       |
| a new venue                           | B       |
| a new name of a venue (an alias)      | C       |
| a venue renamed, moved or fixed       | E       |
| any of A–C in an events PR's run (CI) | D       |

Each section ends with a confirmation; after the yes the venue or alias is written **before** any record that refers
to it (the event skills refuse a `venue` not in the list). Run on its own, finish with **`parish-publish-content`**;
from an event skill, go back to it with the venue's id (or none).

## A. Choose an event's venue

**Which events get one:** an event held at a building gets a `venue`. An event in several places or with an
alternative ("…, nebo …") takes the venue it is mainly held at (a pilgrimage's destination, the first of the
alternatives); `place` still names them all. A whole municipality or an online event gets none, and its map link
searches `place`.

1. **Name the municipality:** the one the event is in, as Mapy.com names it ("Brno" for Brno-Husovice). Read it
   from the source; never split `place` at a comma to get it.
2. **Find it in the list:** `pnpm venue find --municipality "<municipality>"` prints `Venues of <municipality>:`,
   each with its name and aliases.
   - Take the one the source plainly means (`"farní zahrada"` → `kurim-fara`). When the source names it in words
     not yet its name or an alias, propose them as its new alias (C).
   - Several that could fit, or a doubtful one, is a question, never a guess.
   - `tell: … has no venues yet.`, or none of them fits: add it (B).
   - Only when the list is long (more than about 15 venues, as in Brno), narrow it with a word or two of the
     building: `pnpm venue find --municipality "<municipality>" <keyword>…`, which lists the venues whose name or
     an alias holds one (`far` finds "Fara" and "areál za farou"), or all of them after a `tell:` when none does.
3. **Confirm** the venue with the event (the event skill's confirmation shows it, a new venue with its pin link).

## B. Add a venue

1. **Look it up on Mapy.com**, inside the municipality (A1):

   ```sh
   pnpm venue lookup --municipality "<municipality>" "<name of the building>" --out <scratchpad>/venue-candidates.json
   ```

   Use `--address "<address>"` instead of the name for a building with a number. Each result is numbered, with its
   address, position and pin link; judge which one is the building. The file holds the same results, in the same
   order, as venue candidates. When none is the building, ask the user for a Mapy.com link of it and run
   `--link <link>`:
   - a link to a point ("Co je zde?") is exact;
   - one to a named place is only approximate (the map's centre) and gives no candidate: ask for the GPS line of
     the place's card and run `--position "49.2827397N, 16.5662197E"`, exact like a point.

2. **Check the chosen candidate** _n_:

   ```sh
   pnpm venue add <scratchpad>/venue-candidates.json --pick <n> [--name "<building>"] [--alias "<text>"…] --check
   ```

   - `--name` (in Czech: `"Sokolovna"`) when the candidate's own name is not the building's plain name ("Sokolovna
     Kuřim"), and always for an address or a point, which have none. The id is made of the municipality and the
     name.
   - `--alias` with the place's building text when it differs from the name.

   It prints `Would add the venue <id>` with its fields and pin link, and a `tell:` when the address lands far from
   the position.

3. **Confirm** the venue with its pin link, for the user to open. After the yes, run the same `pnpm venue add`
   without `--check`.

## C. Add an alias

An alias is a text of an event's `place` that means the venue ("areál za farou"); it is matched within the venue's
municipality, case and accents aside. `pnpm venue alias <id> "<text>" --check` prints `Would add the alias …` and
refuses a text another venue of the municipality already has. Confirm, then run it without `--check`.

## D. Unattended and comment runs

In an events PR's run (`parish-create-event` "Unattended run", `parish-correct-event` "Comment run") nobody answers:
the PR's review is the user's yes, so the report (or the reply) must show what to check.

- Take a listed venue when the source names it by its name or an alias (case and word endings aside), or plainly
  means it: then add the source's building text as its alias (C).
- Add a new venue (B) only when one candidate is plainly the building: its name is the source's building, or it is
  the address the source gives. In a comment run, a venue, an alias or a Mapy.com link the comment names is the
  maintainer's yes.
- Report each, with the pin to check: `New venue <id>: <name>, <address> — pin: <pin link>`,
  `New alias "<text>" for <id>`.
- Anything less certain (several candidates, none, an approximate link): leave `venue` out and write a question
  (`blocking: no`) with the candidates and their pin links.
- Never change a venue (E): the PR refuses the whole change.

## E. Change a venue

A venue keeps its id and its municipality (the id is made of them): `pnpm venue set` changes its name, or its
address and position.

1. **A new name:** `pnpm venue set <id> --name "<name>" --check`.
2. **A new address or position** (a moved pin, a wrong address): look the building up as in B1, then take the
   chosen candidate _n_: `pnpm venue set <id> <scratchpad>/venue-candidates.json --pick <n> --check` (with
   `--name` too when both change). The candidate's own name is not used.
3. **Show the user** what it prints: `Would update the venue <id>`, each changed field as `old → new` (the old and
   new pin links for a move), and `used by:` what refers to it. Its `tell:` lines say what changes with it: a
   church's name and address are every upcoming service's location in the Bohoslužby calendar.
4. After the yes, run the same `pnpm venue set` without `--check`.

The parish office's (the fara's) address is Kontakty's too, so `set` refuses to change it: that is the maintainer's
change.

## Common mistakes

- Guessing a venue from a similar name, or adding one without the user's yes on its pin (unattended: without a
  candidate that is plainly the building): ask instead.
- Splitting `place` at a comma to get the municipality: read it from the source.
- Copying a candidate into a file by hand: `--pick`, `--name` and `--alias` make the venue.
- Writing a record before its new venue: the event skills refuse a venue not in the list.
- Editing the venue list by hand: `pnpm venue add`, `alias` and `set` check what they write.
- Changing a church's name or address without saying that the Bohoslužby calendar changes with it.
