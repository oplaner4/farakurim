---
name: parish-remove-exception
description: Remove a schedule exception (a "výjimka", a change to the regular mass schedule for a day the service sheets do not cover yet), then publish. Use whenever the user, or an announcement in the service sheet ("ohlášky"), withdraws such a change ("mše svatá bude, jak je obvyklé", "změna se ruší"). A new or changed schedule exception is added with parish-create-exception.
---

# Remove a schedule exception

Removing a schedule exception gives its date back to the regular schedule. Finish with **`parish-publish-content`**.

## 1. Check and confirm

Take the date from the user or the announcement, then:

```sh
pnpm add-exception --remove <YYYY-MM-DD> --check
```

It refuses a date with no schedule exception. Show the user the date and the regular services that day gets back.

Wait for the user's yes before removing anything.

## 2. Remove

```sh
pnpm add-exception --remove <YYYY-MM-DD>
```

## 3. Publish

Follow **`parish-publish-content`**. The release brings the "Bohoslužby" calendar in line: its preview lists the changes.

## Common mistakes

- Removing a schedule exception when the day still changes, only differently: replace it with `parish-create-exception`.
- Editing `src/content/schedule-exceptions.json` by hand instead of `pnpm add-exception --remove`.
