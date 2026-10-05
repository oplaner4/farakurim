---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Where code goes

`src/` is split by **kind** first, then by the same **domain groups** everywhere:
`news`, `services` (Pořad bohoslužeb, masses), `contacts`, `calendar`, `petrklic`, `gallery`, `support` (Finanční
podpora and Starší projekty), `links` (Odkazy; content in `web-links.ts`, as `links` in `site.ts` are the site's own
routes), `chronicle` (Kronika farnosti), `activities` (Seznam aktivit, Výuka náboženství and the group pages; content in
`activities.ts`, `religious-education.ts` and `groups.ts`, types in `types/activities.ts`), `home`, `layout`
(header, footer and their parts) and `shared` (`ui` in components) for what several domains use.

| Folder                         | Holds                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `src/components/<group>/`      | React components, one per block                                                      |
| `src/hooks/`                   | Every React hook, one `use-<name>.ts` each (`hooks.md`)                              |
| `src/lib/<group>/<topic>.ts`   | Pure logic with its `<topic>.test.ts` beside it; no React, no content imports        |
| `src/content/<domain>.ts`      | The content (mock data, build-time fetches): the future API boundary                 |
| `src/content/types/<group>.ts` | The content types of one domain; `shared.ts` holds `IsoDate`, `ClockTime`, `Weekday` |

- **`src/lib`** files are named after their topic inside the group, not after the group: `lib/news/events.ts`,
  `lib/news/archive.ts`, `lib/news/ics.ts`, `lib/services/masses.ts`, `lib/contacts/office-hours.ts`,
  `lib/layout/bible-quote.ts`. `lib/shared/` holds the cross-domain helpers: `prague.ts` (time zone),
  `czech.ts` (Czech grammar and formats), `build-time.ts`, `links.ts`, `query-params.ts` and
  `structured-data.ts` (JSON-LD). `lib` may import `@/content/site` for URLs and
  `@/content/types/*` for types, never the content data itself (tests may, to check real records).
- When a `lib` file grows two independent topics, split it by topic (as `news/events.ts` and `news/archive.ts`)
  rather than letting it pass ~300 lines.
- **Types:** import each type from its domain file (`import type { NewsEvent } from "@/content/types/news"`).
  There is no `types` index file (no barrel). A type used by two domains lives in the domain that owns the data
  (`ChurchColor` in `services.ts`, used by `contacts.ts`).
- **Imports:** same folder `./x`, anything else `@/…` (no `../`).
