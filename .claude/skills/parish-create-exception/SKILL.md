---
name: parish-create-exception
description: Add a schedule exception (a "výjimka", a change to the regular mass schedule for a day the service sheets on the new farakurim.cz site do not cover yet, such as a cancelled or moved mass or an extra adoration) or remove one with `pnpm add-exception`, then publish. Use whenever the user, or an announcement in the service sheet ("ohlášky"), says a mass or service changes on a date no published week covers ("v neděli 25. 10. mše svatá nebude"), or such a change is withdrawn. A change within a published week is corrected with parish-correct-service-sheet.
---

# Create a schedule exception

A schedule exception keeps the next-mass countdown right before that week's service sheet arrives: for its date it
**replaces the whole day** of the regular schedule. Once the week's service sheet is staged, it takes over the day
and the exception is removed by itself.

## 1. Get the change

Take the date and what changes from the user or the announcement. Ask about anything unclear (which church, the new
time), and ask the user before adding a schedule exception they did not ask for.

## 2. Write the record

Write `exception.json` in the session's scratchpad (never in the repo). List **every** public service of that date
at the parish churches, as it will be.

| Field      | How to fill it                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| `date`     | ISO date.                                                                                                       |
| `services` | `{ time, place }` for a mass, with `title` for a mass-like service ("Adorace"), `note` optional. `[]` for none. |
| `reason`   | Short, in Czech: `"pouť v Jinačovicích"`, `"dovolená kněze"`.                                                   |

`place` is `"kurim"`, `"moravske-kninice"` or `"jinacovice"`; services elsewhere, "Pohřeb" and "Křest dětí" never go
in.

```json
{ "date": "2026-10-25", "services": [{ "time": "10:00", "place": "kurim" }], "reason": "pouť v Jinačovicích" }
```

## 3. Check and confirm

```sh
pnpm add-exception <scratchpad>/exception.json --check
```

It refuses a date the service sheets already cover (correct that week with `parish-correct-service-sheet` instead),
a past date and a record that breaks the schema, and says whether it adds or replaces the schedule exception of that
date. Show the user the date and the day's services as they will be.

Wait for the user's yes or corrections to these before adding anything.

## 4. Add

```sh
pnpm add-exception <scratchpad>/exception.json
```

It writes the schedule exception in date order and runs the service sheet tests. A withdrawn change:
`pnpm add-exception --remove <YYYY-MM-DD> --check`, the user's yes, then the same without `--check`.

## 5. Publish

Follow **`parish-publish-content`**. Remind
the user to make the same change in the "Bohoslužby" Google Calendar, which the Kalendář reads.

## Common mistakes

- Listing only the changed mass: the day's other services then disappear from the countdown.
- Adding a schedule exception for a date the service sheets cover: the week's sheet drives those days, so correct
  the sheet.
- Editing `src/content/schedule-exceptions.json` by hand instead of `pnpm add-exception`.
