---
name: parish-manage-exceptions
description: Manage the schedule exceptions (a "výjimka", a change to the regular mass schedule for a day the service sheets do not cover yet, such as a cancelled or moved mass or an extra adoration) - add one, correct one, move one to another date or remove a withdrawn one - then publish. Use whenever the user, or an announcement in the service sheet ("ohlášky"), says a mass or service changes on a date no published week covers ("v neděli 25. 10. mše svatá nebude"), says such a change is different than announced, or withdraws it ("mše svatá bude, jak je obvyklé", "změna se ruší"). A change within a published week is corrected with parish-correct-service-sheet.
---

# Manage schedule exceptions

A schedule exception keeps the next-mass countdown right before that week's service sheet arrives: for its date it
**replaces the whole day** of the regular schedule. Once the week's service sheet is staged, it takes over the day
and the exception is removed by itself. `pnpm add-exception` adds, replaces and removes them.

There is one schedule exception per date, so a record for a date that already has one **replaces** it: a correction
is never a remove and an add.

| The user wants…                                                    | Do                                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------- |
| a new change to a day                                              | **Add or correct** for that date                          |
| a different change to a day that has one (other time, place, mass) | **Add or correct** for the same date: it replaces the old |
| the change on another date (the date was wrong, or it moved)       | **Move**                                                  |
| the change withdrawn, the day back to the regular schedule         | **Remove**                                                |

Take the date and what changes from the user or the announcement. Ask about anything unclear (which church, the new
time), and ask the user before adding a schedule exception they did not ask for.

## Add or correct

### 1. Draft the record

Draft the day as it stands into the session's scratchpad (never into the repo):

```sh
pnpm add-exception --draft <YYYY-MM-DD> --out <scratchpad>/exception.json
```

The draft is the date's schedule exception when it has one, otherwise the day's regular services (with no `reason`);
its line says which and lists the services. It refuses a date the service sheets cover or a past one, as the check
below does.

Edit the draft into the day as it will be: change, add or drop only the services that change and keep the others,
because the record replaces the whole day. Add a `reason` to a new one.

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

### 2. Check and confirm

```sh
pnpm add-exception <scratchpad>/exception.json --check
```

It refuses a date the service sheets already cover (its `next:` line names the sheet: correct that week with
`parish-correct-service-sheet` instead),
a past date and a record that breaks the schema, and says whether it adds or replaces the schedule exception of that
date. Show the user the date and the day's services as they will be.

Wait for the user's yes or corrections to these before adding anything.

### 3. Add

```sh
pnpm add-exception <scratchpad>/exception.json
```

It writes the schedule exception in date order and runs the service sheet tests. Then **Publish**.

## Remove

Removing a schedule exception gives its date back to the regular schedule.

### 1. Check and confirm

```sh
pnpm add-exception --remove <YYYY-MM-DD> --check
```

It refuses a date with no schedule exception, and lists the regular services the day gets back. Show the user the
date and those services.

Wait for the user's yes before removing anything.

### 2. Remove

```sh
pnpm add-exception --remove <YYYY-MM-DD>
```

Then **Publish**.

## Move

A schedule exception moves as a remove on the old date and an add on the new one, published together.

1. Draft the old date (`--draft <old YYYY-MM-DD>`, **Add or correct**, step 1) and change its `date` to the new
   one, and anything else that changes with it.
2. Run both checks before changing anything, so a refused new date (a service sheet covers it, or it is past) leaves
   the old one in place:

   ```sh
   pnpm add-exception <scratchpad>/exception.json --check
   pnpm add-exception --remove <old YYYY-MM-DD> --check
   ```

3. Show the user both days as they will be (the old date back to the regular services, the new one changed) and wait
   for one yes.
4. Remove the old date, then add the new record:

   ```sh
   pnpm add-exception --remove <old YYYY-MM-DD>
   pnpm add-exception <scratchpad>/exception.json
   ```

Then **Publish**.

## Publish

Follow **`parish-publish-content`**, once for the whole change. The release brings the "Bohoslužby" calendar in
line: its preview lists the changes.

## Common mistakes

- Removing a schedule exception to correct it: add the corrected record for the same date, it replaces the old one.
- Writing the record from scratch instead of from the draft, or leaving out the services that stay: the day's other
  services then disappear from the countdown.
- Adding a schedule exception on the new date of a moved change and keeping the old one: both days then change.
- Adding a schedule exception for a date the service sheets cover: the week's sheet drives those days, so correct
  the sheet.
- Editing `src/content/schedule-exceptions.json` by hand instead of `pnpm add-exception`.
