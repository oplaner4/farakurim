---
name: farnost-create-vyjimka
description: Add a výjimka (a change to the regular mass schedule for a day the ohlášky on the new farakurim.cz site do not cover yet - a cancelled or moved mass, an extra adoration) or remove one with `pnpm add-exception`, then publish. Use whenever the user, or an announcement in the ohlášky, says a mass or service changes on a date no published week covers ("v neděli 25. 10. mše svatá nebude"), or such a change is withdrawn. A change within a published week is corrected with farnost-correct-porad-bohosluzeb.
---

# Create a výjimka

A výjimka keeps the next-mass countdown right before that week's ohlášky arrive: for its date it **replaces the
whole day** of the regular schedule. Once the week's ohlášky are staged, their sheet takes over the day and the
výjimka is removed by itself.

## 1. Get the change

Take the date and what changes from the user or the announcement. Ask about anything unclear (which church, the new
time), and ask the user before adding a výjimka they did not ask for.

## 2. Write the record

Write `exception.json` in the session's scratchpad (never in the repo). List **every** public service of that date
at the parish churches, as it will be.

| Field      | How to fill it                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `date`     | ISO date.                                                                                                              |
| `services` | `{ time, place }` for a mass, with `title` for adoration and other mass-like services, `note` optional. `[]` for none. |
| `reason`   | Short, in Czech: `"pouť v Jinačovicích"`, `"dovolená kněze"`.                                                          |

`place` is `"kurim"`, `"moravske-kninice"` or `"jinacovice"`; services elsewhere, funerals, baptisms and weddings
never go in.

```json
{ "date": "2026-10-25", "services": [{ "time": "10:00", "place": "kurim" }], "reason": "pouť v Jinačovicích" }
```

## 3. Check and confirm

```sh
pnpm add-exception <scratchpad>/exception.json --check
```

It refuses a date the ohlášky already cover (correct that week with `farnost-correct-porad-bohosluzeb` instead), a
past date and a record that breaks the schema, and says whether it adds or replaces the výjimka of that date. Show
the user, in Czech, the date and the day's services as they will be.

Wait for the user's yes or corrections to these before adding anything.

## 4. Add

```sh
pnpm add-exception <scratchpad>/exception.json
```

It writes the výjimka in date order and runs the ohlášky tests. A withdrawn change: `pnpm add-exception --remove
<YYYY-MM-DD> --check`, the user's yes, then the same without `--check`.

## 5. Publish

Follow **`farnost-publish-content`**. Remind
the user to make the same change in the "Mše, adorace" Google Calendar, which the Kalendář reads.

## Common mistakes

- Listing only the changed mass: the day's other services then disappear from the countdown.
- Adding a výjimka for a date the ohlášky cover: the week's sheet drives those days, so correct the sheet.
- Editing `src/content/schedule-exceptions.json` by hand instead of `pnpm add-exception`.
