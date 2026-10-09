# Ohlášky as JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store the ohlášky as one JSON data file that scripts parse and write, instead of TypeScript source they
edit as text, and let the stage script remove the `laterExceptions` entries a new sheet covers.

**Architecture:** `src/content/ohlasky.json` holds `{ sheets, laterExceptions }`. A server-only loader
(`src/server/ohlasky.ts`) imports it statically and validates it with a new zod `ohlaskyFileSchema`; the four
consumers import from the loader. `scripts/add-ohlasky.ts` reads, changes and writes the JSON.

**Tech Stack:** Next.js 16 (static export), TypeScript, zod 4, vitest, tsx, Prettier, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-09-ohlasky-json-design.md`

## Global Constraints

- Code, comments and commit messages in English; any visible text in Czech (no UI text changes here).
- Conventional Commits, checked by commitlint; never `--no-verify`. End every commit message with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Imports: same folder `./x`, anything else `@/…` (no `../` in `src/`; `scripts/stage/` imports `../` as today).
- `src/lib` never imports content data (types only); `src/server/*` starts with `import "server-only"`.
- The site output must not change (same data, same types).
- Do not edit `design/DESIGN.md` or the 2026-10-09 ohlášky-sheets spec and plan.
- Check zod APIs with context7 before using one you have not seen in this repo (CLAUDE.md working rule).
- Full check before calling work done: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`.

## Review Focus

- A `laterExceptions` entry dated exactly the new last sheet's `validTo` is removed; one dated the day after stays
  (pinned in Task 3, test "adds the next week in advance…").
- An entry without `reason`, or with a `note` on a service, survives a script rewrite unchanged, with no keys added
  (pinned in Task 3, same test, `LATER[1]`).
- A hand-broken `ohlasky.json` (bad JSON syntax, or valid JSON breaking the schema) stops the script with a message
  naming the file, also under `--check`, and leaves the file untouched (Task 3, "refuses a broken ohlasky.json").
- The written file keeps the schema's field order (`pdfUrl`, `validFrom`, `validTo`, `days`, `announcements`), so a
  replaced sheet gives a small diff (Task 3, "adds the next week in advance…").
- A place that is not a parish church in `laterExceptions` fails the schema, so the loader fails the build
  (Task 1, "names a bad date, time, place and unknown field").

---

## File Structure

| File                                                                                                                             | Change                                                   |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/content/types/services.ts`                                                                                                  | Add `OhlaskyFile` type                                   |
| `src/lib/services/schema.ts`                                                                                                     | Add `scheduleExceptionSchema`, `ohlaskyFileSchema`       |
| `src/lib/services/schema.test.ts`                                                                                                | Tests for both                                           |
| `src/content/ohlasky.json`                                                                                                       | New: the data (migrated)                                 |
| `src/server/ohlasky.ts`                                                                                                          | New: loader exporting `serviceSheets`, `laterExceptions` |
| `src/content/ohlasky.test.ts`                                                                                                    | New (moved from `src/content/ohlasky/ohlasky.test.ts`)   |
| `src/server/services.ts`, `src/app/page.tsx`, `src/app/porad_bohosluzeb/page.tsx`, `src/components/layout/SiteHeader.tsx`        | Import from `@/server/ohlasky`                           |
| `src/content/ohlasky/`                                                                                                           | Removed (Task 3)                                         |
| `scripts/add-ohlasky.ts`, `scripts/add-ohlasky.test.ts`                                                                          | Rewritten for JSON                                       |
| `scripts/content-files.ts`, `scripts/stage/core.ts`, `scripts/stage/porad.ts`, `scripts/stage/cli.ts`, `scripts/test-helpers.ts` | `ohlaskyFile` wiring                                     |
| `scripts/stage/porad.test.ts`, `scripts/stage/cli.test.ts`                                                                       | Expectations for JSON                                    |
| Skill, rule, README, comments                                                                                                    | Task 4                                                   |

Scratch files (`<scratchpad>` = `/tmp/claude-1000/-home-ondrej-planer-Documents-farakurim/f99cc8d8-7824-4f37-9cf0-97b49792ee10/scratchpad`)
are never committed.

---

### Task 0: Baseline HTML

**Files:** none in the repo.

- [ ] **Step 1: Write the HTML normalizer** to `<scratchpad>/normalize-html.mjs`. It strips scripts and hashed
      asset paths, which differ between any two builds, and puts one tag per line for a readable diff:

```js
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [outDir, destDir] = process.argv.slice(2);
for (const page of ["index.html", "porad_bohosluzeb/index.html", "kontakty/index.html"]) {
  const html = readFileSync(join(outDir, page), "utf8")
    .replace(/<script\b[^]*?<\/script>/g, "")
    .replace(/\/_next\/static\/[^"' )]+/g, "/_next/static/…")
    .replace(/></g, ">\n<");
  mkdirSync(dirname(join(destDir, page)), { recursive: true });
  writeFileSync(join(destDir, page), html);
}
```

- [ ] **Step 2: Build the current main and keep the normalized pages**

Run: `pnpm build && node <scratchpad>/normalize-html.mjs out <scratchpad>/html-before`
Expected: build succeeds; three files under `<scratchpad>/html-before/`.

---

### Task 1: Schemas for the JSON file

**Files:**

- Modify: `src/content/types/services.ts` (after `ScheduleException`, line ~53)
- Modify: `src/lib/services/schema.ts`
- Test: `src/lib/services/schema.test.ts`

**Interfaces:**

- Produces: `type OhlaskyFile = { sheets: ServiceSheet[]; laterExceptions: ScheduleException[] }` in
  `@/content/types/services`; `scheduleExceptionSchema` and `ohlaskyFileSchema` exported from
  `@/lib/services/schema` (`satisfies z.ZodType<ScheduleException>` / `z.ZodType<OhlaskyFile>`).

- [ ] **Step 1: Write the failing tests** (append to `src/lib/services/schema.test.ts`; extend its import to
      `import { ohlaskyFileSchema, scheduleExceptionSchema, serviceSheetSchema } from "./schema";`):

```ts
describe("scheduleExceptionSchema and ohlaskyFileSchema", () => {
  const exception = { date: "2026-10-25", services: [{ time: "10:00", place: "kurim" }], reason: "Hody" };
  const issues = (schema: z.ZodType, input: unknown) => {
    const result = schema.safeParse(input);
    return result.success ? "" : z.prettifyError(result.error);
  };

  it("accepts an exception with or without its optional fields, and a whole file", () => {
    expect(scheduleExceptionSchema.parse(exception)).toEqual(exception);
    const bare = { date: "2026-10-25", services: [] };
    expect(scheduleExceptionSchema.parse(bare)).toEqual(bare);
    const noted = {
      date: "2026-10-25",
      services: [{ time: "18:00", place: "jinacovice", title: "Adorace", note: "x" }],
    };
    expect(scheduleExceptionSchema.parse(noted)).toEqual(noted);
    const file = { sheets: [sheet()], laterExceptions: [exception] };
    expect(ohlaskyFileSchema.parse(file)).toEqual(file);
  });

  it("names a bad date, time, place and unknown field", () => {
    expect(issues(scheduleExceptionSchema, { ...exception, date: "25. 10." })).toContain("date");
    expect(issues(scheduleExceptionSchema, { ...exception, services: [{ time: "10.00", place: "kurim" }] })).toContain(
      "services[0].time",
    );
    expect(issues(scheduleExceptionSchema, { ...exception, services: [{ time: "10:00", place: "Vranov" }] })).toContain(
      "services[0].place",
    );
    expect(issues(scheduleExceptionSchema, { ...exception, cancelled: true })).toContain(
      'Unrecognized key: "cancelled"',
    );
    expect(issues(ohlaskyFileSchema, { sheets: [] })).toContain("laterExceptions");
    expect(
      issues(ohlaskyFileSchema, { sheets: [{ ...sheet(), validTo: "2026-10-11" }], laterExceptions: [] }),
    ).toContain("sheets[0].validTo");
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run src/lib/services/schema.test.ts`
Expected: FAIL, `scheduleExceptionSchema` / `ohlaskyFileSchema` not exported.

- [ ] **Step 3: Add the type** to `src/content/types/services.ts`, right after `ScheduleException`:

```ts
/** The ohlášky (src/content/ohlasky.json): the sheets by `validFrom` and the hand-entered later changes. */
export type OhlaskyFile = {
  sheets: ServiceSheet[];
  laterExceptions: ScheduleException[];
};
```

- [ ] **Step 4: Add the schemas** to `src/lib/services/schema.ts`. Import the types
      (`import type { OhlaskyFile, PlaceId, ScheduleException, ServiceSheet } from "@/content/types/services";`)
      and append after `serviceSheetSchema`. Check `z.enum` with a string array in zod 4 via context7 first; the
      parsed `place` must be typed `PlaceId` (the `satisfies` fails to compile otherwise):

```ts
/** Every PlaceId once: a place added to the type must be added here too, or this does not compile. */
const PARISH_CHURCHES: Record<PlaceId, true> = { kurim: true, "moravske-kninice": true, jinacovice: true };

const serviceEntrySchema = z.strictObject({
  time: clock,
  place: z.enum(Object.keys(PARISH_CHURCHES) as PlaceId[]),
  title: text.optional(),
  note: text.optional(),
});

/** A hand-entered ScheduleException (`laterExceptions` in src/content/ohlasky.json). */
export const scheduleExceptionSchema = z.strictObject({
  date,
  services: z.array(serviceEntrySchema),
  reason: text.optional(),
}) satisfies z.ZodType<ScheduleException>;

/** The whole of src/content/ohlasky.json; src/server/ohlasky.ts and scripts/add-ohlasky.ts parse it. */
export const ohlaskyFileSchema = z.strictObject({
  sheets: z.array(serviceSheetSchema),
  laterExceptions: z.array(scheduleExceptionSchema),
}) satisfies z.ZodType<OhlaskyFile>;
```

Also update the file's header comment (lines 5–7) to:

```ts
// The rules of the ohlášky, in one place: src/server/ohlasky.ts checks src/content/ohlasky.json with them when the
// site loads it, and scripts/add-ohlasky.ts checks a new record and the file before the farnost-create-porad-bohosluzeb
// skill stages its PDF. The rules across sheets (their order, the aktuality an announcement links) are
// sheetOrderProblems() and the content test's.
```

- [ ] **Step 5: Run the tests and the type check**

Run: `pnpm exec vitest run src/lib/services/schema.test.ts && pnpm exec tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/content/types/services.ts src/lib/services/schema.ts src/lib/services/schema.test.ts
git commit -F - <<'EOF'
feat(lib): add the schemas of the ohlášky JSON file

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Migrate the data and load it from JSON

**Files:**

- Create: `src/content/ohlasky.json`, `src/server/ohlasky.ts`, `src/content/ohlasky.test.ts`
- Modify: `src/server/services.ts:3`, `src/app/page.tsx:6`, `src/app/porad_bohosluzeb/page.tsx:13`,
  `src/components/layout/SiteHeader.tsx:2`
- Delete: `src/content/ohlasky/ohlasky.test.ts` (the rest of the folder stays until Task 3; the scripts still use it)

**Interfaces:**

- Consumes: `ohlaskyFileSchema` (Task 1).
- Produces: `serviceSheets: ServiceSheet[]` and `laterExceptions: ScheduleException[]` from `@/server/ohlasky`.

- [ ] **Step 1: Write the one-off conversion** to `<scratchpad>/to-json.ts`. It imports the old modules, writes the
      JSON and checks that the zod-parsed JSON deep-equals the old exports:

```ts
import { deepStrictEqual } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { laterExceptions, serviceSheets } from "/home/ondrej-planer/Documents/farakurim/src/content/ohlasky/index";
import { ohlaskyFileSchema } from "/home/ondrej-planer/Documents/farakurim/src/lib/services/schema";

const file = "/home/ondrej-planer/Documents/farakurim/src/content/ohlasky.json";
const data = ohlaskyFileSchema.parse({ sheets: serviceSheets, laterExceptions });
writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
const back = ohlaskyFileSchema.parse(JSON.parse(readFileSync(file, "utf8")));
deepStrictEqual(back, { sheets: serviceSheets, laterExceptions });
console.log(`ok: ${back.sheets.length} sheets, ${back.laterExceptions.length} laterExceptions`);
```

- [ ] **Step 2: Run it** (`react-server` lets `server-only` load outside Next; `--tsconfig` resolves `@/`):

Run: `NODE_OPTIONS=--conditions=react-server pnpm exec tsx --tsconfig tsconfig.json <scratchpad>/to-json.ts && pnpm exec prettier --write src/content/ohlasky.json`
Expected: `ok: 2 sheets, 0 laterExceptions`; `src/content/ohlasky.json` exists.

- [ ] **Step 3: Move the content test** to `src/content/ohlasky.test.ts` (delete the old one) so it reads through the
      loader that does not exist yet:

```ts
import { describe, expect, it, vi } from "vitest";
import { sheetOrderProblems } from "@/lib/services/service-sheet";
import { events } from "@/content/news";
import { isSorted } from "@/content/test-helpers";
import { laterExceptions, serviceSheets } from "@/server/ohlasky";

vi.mock("server-only", () => ({}));

// The rules of the file itself (every day of a sheet's period, times, places, the PDF link, unknown fields) are
// ohlaskyFileSchema's: src/server/ohlasky.ts checks them on import, so a broken file fails here naming the field.
describe("Ohlášky (ohlasky.json)", () => {
  it("has at least one sheet, in order, sharing at most their boundary days", () => {
    expect(serviceSheets.length).toBeGreaterThan(0);
    expect(sheetOrderProblems(serviceSheets)).toEqual([]);
  });

  it("links announcements to existing Aktuality", () => {
    const ids = new Set(events.map((e) => e.id));
    const missing = serviceSheets.flatMap((s) => s.announcements.filter((a) => a.newsId && !ids.has(a.newsId)));
    expect(missing.map((a) => a.newsId)).toEqual([]);
  });

  it("has hand-entered exceptions after the last sheet, one per date, in order", () => {
    // `pnpm stage porad … --record` removes the entries a new sheet covers.
    const lastDay = serviceSheets.at(-1)!.validTo;
    expect(laterExceptions.filter((x) => x.date <= lastDay).map((x) => x.date)).toEqual([]);
    expect(isSorted(laterExceptions, (a, b) => a.date < b.date)).toBe(true);
  });
});
```

Run: `git rm -q src/content/ohlasky/ohlasky.test.ts && pnpm exec vitest run src/content/ohlasky.test.ts`
Expected: FAIL, cannot resolve `@/server/ohlasky`.

- [ ] **Step 4: Write the loader** `src/server/ohlasky.ts`:

```ts
import "server-only";
import * as z from "zod";
import data from "@/content/ohlasky.json";
import type { ScheduleException, ServiceSheet } from "@/content/types/services";
import { ohlaskyFileSchema } from "@/lib/services/schema";

// The ohlášky (src/content/ohlasky.json, written by `pnpm stage porad … --record`, farnost-create-porad-bohosluzeb
// skill): the sheets sorted by validFrom, consecutive ones sharing at most their boundary day (the newer wins it),
// and the hand-entered changes after the last sheet. The site shows the sheet whose week has started last
// (currentSheet(), in the browser). Checked on import, so a broken file fails the build naming the field.
// Server-only: rows marked not public must never reach a client bundle, so client components get what they need as
// props, never this module.

const parsed = ohlaskyFileSchema.safeParse(data);
if (!parsed.success) throw new Error(`src/content/ohlasky.json is not valid:\n${z.prettifyError(parsed.error)}`);

export const serviceSheets: ServiceSheet[] = parsed.data.sheets;

/**
 * Hand-entered changes after the last sheet, as soon as the parish announces them: each replaces its whole day
 * (`services: []` cancels it). `scheduleExceptions()` puts them after the sheets' days.
 */
export const laterExceptions: ScheduleException[] = parsed.data.laterExceptions;
```

- [ ] **Step 5: Run the content test**

Run: `pnpm exec vitest run src/content/ohlasky.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Switch the consumers.** In each of `src/server/services.ts`, `src/app/page.tsx`,
      `src/app/porad_bohosluzeb/page.tsx` and `src/components/layout/SiteHeader.tsx` replace
      `from "@/content/ohlasky"` with `from "@/server/ohlasky"` (same imported names):

Run: `sed -i 's#from "@/content/ohlasky"#from "@/server/ohlasky"#' src/server/services.ts src/app/page.tsx src/app/porad_bohosluzeb/page.tsx src/components/layout/SiteHeader.tsx && grep -rn '@/content/ohlasky' src`
Expected: no output from grep.

- [ ] **Step 7: Check, build and compare the HTML**

Run: `pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && node <scratchpad>/normalize-html.mjs out <scratchpad>/html-after && diff -r <scratchpad>/html-before <scratchpad>/html-after && echo SAME`
Expected: all pass, `SAME`. A difference only in a countdown time computed from the build time is acceptable;
any other difference is a bug: stop and investigate.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add src/content/ohlasky.json src/content/ohlasky.test.ts src/content/ohlasky/ohlasky.test.ts src/server/ohlasky.ts src/server/services.ts src/app/page.tsx src/app/porad_bohosluzeb/page.tsx src/components/layout/SiteHeader.tsx
git commit -F - <<'EOF'
refactor(content): load the ohlášky from ohlasky.json

The sheets and laterExceptions move to one JSON file, validated with ohlaskyFileSchema by the server-only
src/server/ohlasky.ts. The scripts switch to it in the next commit.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: The scripts write the JSON

**Files:**

- Modify (rewrite): `scripts/add-ohlasky.ts`, `scripts/add-ohlasky.test.ts`
- Modify: `scripts/content-files.ts:1-2,12`, `scripts/stage/core.ts:18,37`, `scripts/stage/porad.ts:1-3,54,86,99`,
  `scripts/stage/cli.ts:19,105`, `scripts/test-helpers.ts:43,56,62`, `scripts/stage/porad.test.ts:85-109`,
  `scripts/stage/cli.test.ts:44-47`
- Delete: `src/content/ohlasky/` (the remaining sheet files and `index.ts`)

**Interfaces:**

- Consumes: `ohlaskyFileSchema`, `serviceSheetSchema`, `OhlaskyFile` (Task 1); `src/content/ohlasky.json` (Task 2).
- Produces:
  - `readOhlasky(ohlaskyFile: string): OhlaskyFile`
  - `addOhlasky(ohlaskyFile: string, newsDir: string, input: unknown, week: SheetWeek, options?: { check?: boolean; now?: Date }): AddOhlaskyResult`
  - `type AddOhlaskyResult = { sheet: ServiceSheet; replaced: boolean; removed: string[]; removedExceptions: IsoDate[]; written: string[] }`
    (`removed`: periods like `"2026-09-27 – 2026-10-04"`)
  - `ohlaskyLines(result: AddOhlaskyResult, check: boolean): string[]`
  - `OHLASKY_FILE` (`scripts/content-files.ts`), `StageEnv.ohlaskyFile` (`scripts/stage/core.ts`)

- [ ] **Step 1: Write the failing tests.** Replace `scripts/add-ohlasky.test.ts` with:

```ts
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ScheduleException, SheetDay } from "@/content/types/services";
import { addOhlasky, ohlaskyLines, readOhlasky, type SheetWeek } from "./add-ohlasky";

/** Two hand-entered changes: one the 11.–18. 10. sheet covers (its last day), one after it (no reason, a note). */
const LATER: ScheduleException[] = [
  { date: "2026-10-18", services: [], reason: "pouť" },
  { date: "2026-10-19", services: [{ time: "10:00", place: "kurim", note: "hody" }] },
];

const week = (validFrom: string, validTo: string): SheetWeek => ({
  pdfUrl: `/uploads/porady_bohosluzeb/${validFrom}-porad-bohosluzeb.pdf`,
  validFrom,
  validTo,
});

/** A record (days and announcements) covering every date of the period. */
const record = (dates: string[], newsId?: string) => ({
  days: dates.map((date): SheetDay => ({
    date,
    rows: [{ time: "8:00", place: "kurim", title: "Mše sv.", mass: true }],
  })),
  announcements: [{ category: "info", html: "<p>Sbírka.</p>", ...(newsId && { newsId }) }],
});

const datesOf = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `2026-10-${String(from + i).padStart(2, "0")}`);

describe("addOhlasky on a temp ohlasky.json and news/", () => {
  let dir: string;
  let file: string;
  let news: string;
  const now = new Date("2026-10-09T10:00:00+02:00");
  const sheets = () => readOhlasky(file).sheets.map((s) => s.validFrom);
  const raw = () => readFileSync(file, "utf8");

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "add-ohlasky-"));
    file = join(dir, "ohlasky.json");
    news = join(dir, "news");
    mkdirSync(news);
    writeFileSync(join(news, "10.ts"), '  {\n    id: "farni-den-2026",\n  },\n');
    writeFileSync(file, JSON.stringify({ sheets: [], laterExceptions: LATER }));
    // An older sheet (27. 9.–4. 10.) and the current one (4.–11. 10.), written as the command writes them on
    // 30. 9., when both are still kept.
    const setup = { now: new Date("2026-09-30T10:00:00+02:00") };
    const september = ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", ...datesOf(1, 4)];
    addOhlasky(file, news, record(september), week("2026-09-27", "2026-10-04"), setup);
    addOhlasky(file, news, record(datesOf(4, 11)), week("2026-10-04", "2026-10-11"), setup);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("adds the next week in advance, prunes the outdated sheet and the covered exception", () => {
    const result = addOhlasky(file, news, record(datesOf(11, 18), "farni-den-2026"), week("2026-10-11", "2026-10-18"), {
      now,
    });
    expect(result).toMatchObject({
      replaced: false,
      removed: ["2026-09-27 – 2026-10-04"],
      removedExceptions: ["2026-10-18"],
      written: [file],
    });
    expect(sheets()).toEqual(["2026-10-04", "2026-10-11"]);
    // The entry on the sheet's last day goes; the next day's stays exactly as written, no keys added.
    expect(readOhlasky(file).laterExceptions).toEqual([LATER[1]]);
    expect(Object.keys(JSON.parse(raw()).sheets[1])).toEqual([
      "pdfUrl",
      "validFrom",
      "validTo",
      "days",
      "announcements",
    ]);
    expect(ohlaskyLines(result, false)).toEqual([
      "Added the sheet 2026-10-11 – 2026-10-18 to src/content/ohlasky.json",
      "Removed the outdated sheet 2026-09-27 – 2026-10-04",
      "Removed the laterExceptions entry on 2026-10-18 (the sheet covers it)",
    ]);
  });

  it("keeps a stale current sheet when the next one comes late", () => {
    const monday = new Date("2026-10-12T10:00:00+02:00");
    addOhlasky(file, news, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), { now: monday });
    expect(sheets()).toEqual(["2026-10-11"]);
    const late = new Date("2026-10-21T10:00:00+02:00");
    expect(
      addOhlasky(file, news, record(datesOf(25, 31)), week("2026-10-25", "2026-10-31"), { now: late }).removed,
    ).toEqual([]);
    expect(sheets()).toEqual(["2026-10-11", "2026-10-25"]);
  });

  it("replaces the sheet of the same week (a corrected PDF)", () => {
    const fixed = {
      ...week("2026-10-04", "2026-10-11"),
      pdfUrl: "/uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb-2.pdf",
    };
    const result = addOhlasky(file, news, record(datesOf(4, 11)), fixed, { now });
    expect(result.replaced).toBe(true);
    expect(readOhlasky(file).sheets.at(-1)!.pdfUrl).toContain("porad-bohosluzeb-2.pdf");
    expect(ohlaskyLines(result, false)[0]).toBe(
      "Replaced the sheet 2026-10-04 – 2026-10-11 in src/content/ohlasky.json",
    );
  });

  it("refuses an overlap, a week before the current sheet, the PDF fields and an unknown aktualita", () => {
    const before = raw();
    expect(() => addOhlasky(file, news, record(datesOf(10, 17)), week("2026-10-10", "2026-10-17"), { now })).toThrow(
      "starts before 2026-10-04 – 2026-10-11 ends",
    );
    expect(() =>
      addOhlasky(file, news, record(["2026-09-20", "2026-09-21"]), week("2026-09-20", "2026-09-21"), { now }),
    ).toThrow("before the current sheet (2026-10-04)");
    expect(() =>
      addOhlasky(
        file,
        news,
        { ...record(datesOf(11, 18)), validFrom: "2026-10-11" },
        week("2026-10-11", "2026-10-18"),
        { now },
      ),
    ).toThrow("the script reads pdfUrl, validFrom and validTo from the PDF");
    expect(() =>
      addOhlasky(file, news, record(datesOf(11, 18), "neni-2026"), week("2026-10-11", "2026-10-18"), { now }),
    ).toThrow("no aktualita with the id neni-2026");
    expect(() => addOhlasky(file, news, record(datesOf(11, 17)), week("2026-10-11", "2026-10-18"), { now })).toThrow(
      "missing 2026-10-18",
    );
    expect(raw()).toBe(before);
  });

  it("refuses a broken ohlasky.json, also with check, and leaves it unchanged", () => {
    const add = (check: boolean) =>
      addOhlasky(file, news, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), { now, check });
    writeFileSync(file, '{ "sheets": [');
    for (const check of [true, false]) expect(() => add(check)).toThrow(`${file} is not valid JSON`);
    const wrongPlace = JSON.stringify({
      sheets: [],
      laterExceptions: [{ date: "2026-10-25", services: [{ time: "10:00", place: "Vranov" }] }],
    });
    writeFileSync(file, wrongPlace);
    for (const check of [true, false]) expect(() => add(check)).toThrow("laterExceptions[0].services[0].place");
    expect(raw()).toBe(wrongPlace);
  });

  it("only validates with check", () => {
    const before = raw();
    const result = addOhlasky(file, news, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), {
      now,
      check: true,
    });
    expect(result.written).toEqual([]);
    expect(raw()).toBe(before);
    expect(ohlaskyLines(result, true)).toEqual([
      "Would add the sheet 2026-10-11 – 2026-10-18 to src/content/ohlasky.json",
      "Would remove the outdated sheet 2026-09-27 – 2026-10-04",
      "Would remove the laterExceptions entry on 2026-10-18 (the sheet covers it)",
    ]);
  });
});
```

Run: `pnpm exec vitest run scripts/add-ohlasky.test.ts`
Expected: FAIL (`readOhlasky` not exported, old signature).

- [ ] **Step 2: Rewrite `scripts/add-ohlasky.ts`:**

```ts
// Adds a confirmed ohlášky sheet to src/content/ohlasky.json (farnost-create-porad-bohosluzeb skill, through
// `pnpm stage porad <pdf> --record <record.json>`, which stages the PDF and passes its week); a sheet of the same week
// (a corrected PDF) replaces the old one. Sheets may share only their boundary day (sheetOrderProblems()). The sheets
// before the current one (the last whose week has started, today in Prague) are removed, and so are the
// laterExceptions on or before the last sheet's validTo: the sheets cover those days. The file's rules are
// ohlaskyFileSchema's (src/lib/services/schema.ts).

import { readFileSync, writeFileSync } from "node:fs";
import * as z from "zod";
import type { OhlaskyFile, ServiceSheet } from "@/content/types/services";
import type { IsoDate } from "@/content/types/shared";
import { ohlaskyFileSchema, serviceSheetSchema } from "@/lib/services/schema";
import { currentSheet, sheetOrderProblems } from "@/lib/services/service-sheet";
import { pragueDate } from "@/lib/shared/prague";
import { newsIds } from "./content-files";

/** The fields the script takes from the staged PDF, never from the record. */
const WEEK_FIELDS = ["pdfUrl", "validFrom", "validTo"] as const;
export type SheetWeek = Pick<ServiceSheet, (typeof WEEK_FIELDS)[number]>;

const period = (s: Pick<ServiceSheet, "validFrom" | "validTo">) => `${s.validFrom} – ${s.validTo}`;

/** The ohlášky in `ohlaskyFile`; throws naming the file when it is not valid JSON or breaks the schema. */
export function readOhlasky(ohlaskyFile: string): OhlaskyFile {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(ohlaskyFile, "utf8"));
  } catch (error) {
    throw new Error(`${ohlaskyFile} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }
  const parsed = ohlaskyFileSchema.safeParse(data);
  if (!parsed.success) throw new Error(`${ohlaskyFile} is not valid:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

export type AddOhlaskyResult = {
  sheet: ServiceSheet;
  /** A sheet of the same week was replaced. */
  replaced: boolean;
  /** The periods of the outdated sheets removed (or that would be). */
  removed: string[];
  /** The laterExceptions dates the sheets now cover, removed (or that would be). */
  removedExceptions: IsoDate[];
  /** The file written, for formatAndTest; empty with `check`. */
  written: string[];
};

/**
 * Adds `input` (the record: days and announcements) for the staged PDF's `week` to `ohlaskyFile`, prunes the sheets
 * before the current one and the covered laterExceptions, and returns what it did; `check` only validates. Throws
 * with every problem found, before anything is written.
 */
export function addOhlasky(
  ohlaskyFile: string,
  newsDir: string,
  input: unknown,
  week: SheetWeek,
  { check = false, now = new Date() } = {},
): AddOhlaskyResult {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    throw new Error("the record is not an object");
  if (WEEK_FIELDS.some((field) => field in input)) {
    throw new Error(
      "leave pdfUrl, validFrom and validTo out of the record: the script reads pdfUrl, validFrom and validTo from the PDF",
    );
  }
  const parsed = serviceSheetSchema.safeParse({ ...week, ...input });
  if (!parsed.success) throw new Error(`the record is not valid:\n${z.prettifyError(parsed.error)}`);
  const sheet = parsed.data;
  const ids = newsIds(newsDir);
  const unknown = sheet.announcements.flatMap((a, i) =>
    a.newsId && !ids.has(a.newsId) ? [`announcement ${i + 1}: no aktualita with the id ${a.newsId}`] : [],
  );
  if (unknown.length > 0) throw new Error(unknown.join("\n"));

  const { sheets, laterExceptions } = readOhlasky(ohlaskyFile);
  const replaced = sheets.some((s) => s.validFrom === sheet.validFrom);
  const all = [...sheets.filter((s) => s.validFrom !== sheet.validFrom), sheet].sort((a, b) =>
    a.validFrom < b.validFrom ? -1 : 1,
  );
  const current = currentSheet(all, pragueDate(now))!;
  const kept = all.filter((s) => s.validFrom >= current.validFrom);
  if (!kept.includes(sheet)) {
    throw new Error(`the sheet ${period(sheet)} is before the current sheet (${current.validFrom}): nothing to add`);
  }
  const problems = sheetOrderProblems(kept);
  if (problems.length > 0) throw new Error(problems.join("\n"));

  const lastDay = kept.at(-1)!.validTo;
  const removed = all.filter((s) => !kept.includes(s)).map(period);
  const removedExceptions = laterExceptions.filter((x) => x.date <= lastDay).map((x) => x.date);
  const written: string[] = [];
  if (!check) {
    const data: OhlaskyFile = { sheets: kept, laterExceptions: laterExceptions.filter((x) => x.date > lastDay) };
    writeFileSync(ohlaskyFile, `${JSON.stringify(data, null, 2)}\n`);
    written.push(ohlaskyFile);
  }
  return { sheet, replaced, removed, removedExceptions, written };
}

/** The lines the command prints for `result`. */
export function ohlaskyLines(result: AddOhlaskyResult, check: boolean): string[] {
  const { sheet, replaced, removed, removedExceptions } = result;
  const verb = replaced ? (check ? "Would replace" : "Replaced") : check ? "Would add" : "Added";
  const remove = check ? "Would remove" : "Removed";
  return [
    `${verb} the sheet ${period(sheet)} ${replaced ? "in" : "to"} src/content/ohlasky.json`,
    ...removed.map((p) => `${remove} the outdated sheet ${p}`),
    ...removedExceptions.map((date) => `${remove} the laterExceptions entry on ${date} (the sheet covers it)`),
  ];
}
```

- [ ] **Step 3: Run the script tests**

Run: `pnpm exec vitest run scripts/add-ohlasky.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 4: Wire the file path through.**
  - `scripts/content-files.ts`: replace `export const OHLASKY_DIR = join(ROOT, "src/content/ohlasky");` with
    `export const OHLASKY_FILE = join(ROOT, "src/content/ohlasky.json");`. The header comment stays.
  - `scripts/stage/core.ts`: in `StageEnv` replace `ohlaskyDir: string;` with `ohlaskyFile: string;`; in
    `defaultEnv` replace `ohlaskyDir: OHLASKY_DIR,` with `ohlaskyFile: OHLASKY_FILE,`; import `OHLASKY_FILE`
    instead of `OHLASKY_DIR`; header comment: "where they stage and add content" stays.
  - `scripts/stage/porad.ts`: `env.ohlaskyDir` becomes `env.ohlaskyFile` (lines 86, 99); header comment line 3
    "adds the sheet to src/content/ohlasky/" becomes "adds the sheet to src/content/ohlasky.json"; the
    `PoradOptions.record` comment (line 54) becomes "added to src/content/ohlasky.json".
  - `scripts/stage/cli.ts`: line 105 `tests: "src/content/ohlasky"` becomes
    `tests: "src/content/ohlasky.test.ts"`; usage comment (lines 18–19) becomes
    `//       announcements as JSON) to src/content/ohlasky.json and removes the outdated sheets and the covered`
    `//       laterExceptions (scripts/add-ohlasky.ts; with --check it only validates the record).`
  - `scripts/test-helpers.ts`: comment "A temp uploads/, news/, ohlasky/ and home" becomes "A temp uploads/,
    news/, ohlasky.json and home"; `cpSync(OHLASKY_DIR, join(dir, "ohlasky"), { recursive: true });` becomes
    `cpSync(OHLASKY_FILE, join(dir, "ohlasky.json"));`; `ohlaskyDir: join(dir, "ohlasky"),` becomes
    `ohlaskyFile: join(dir, "ohlasky.json"),`; import `OHLASKY_FILE` instead of `OHLASKY_DIR`.

- [ ] **Step 5: Update the stage tests.**
  - `scripts/stage/porad.test.ts`, test "adds the record as a sheet after staging the PDF":

```ts
expect(lines[0]).toBe("Staged uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf");
expect(lines[1]).toBe("Added the sheet 2099-10-04 – 2099-10-11 to src/content/ohlasky.json");
expect(written).toEqual([env.ohlaskyFile]);
expect(JSON.parse(readFileSync(env.ohlaskyFile, "utf8")).sheets.at(-1).pdfUrl).toBe(
  "/uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf",
);
```

- same file, test "stages nothing for a record it refuses, and only validates with check": replace the last
  three expectations with

```ts
const before = readFileSync(env.ohlaskyFile, "utf8");
const checked = await stagePorad(env, { ...week, record: record(), check: true });
expect(checked.lines[0]).toBe("Would add the sheet 2099-10-04 – 2099-10-11 to src/content/ohlasky.json");
expect(checked.lines.at(-1)).toBe("Would stage uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf");
expect(readFileSync(env.ohlaskyFile, "utf8")).toBe(before);
```

    and drop `existsSync` from the imports if nothing else uses it (the first half of that test still does).

- `scripts/stage/cli.test.ts`:

```ts
expect(sheet.format).toEqual({ files: [env.ohlaskyFile], tests: "src/content/ohlasky.test.ts" });
```

- [ ] **Step 6: Remove the old folder and find leftovers**

Run: `git rm -rq src/content/ohlasky && grep -rn "OHLASKY_DIR\|ohlaskyDir\|content/ohlasky/\|sheetSource\|setSheets" scripts src`
Expected: no output.

- [ ] **Step 7: Full check and HTML comparison**

Run: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && node <scratchpad>/normalize-html.mjs out <scratchpad>/html-after && diff -r <scratchpad>/html-before <scratchpad>/html-after && echo SAME`
Expected: all pass, `SAME` (same caveat as Task 2 Step 7).

- [ ] **Step 8: Smoke-run the command without writing**

Run: `pnpm stage porad 2>&1 | head -3`
Expected: the usage text (exit 1), proving the CLI loads with the new wiring.

- [ ] **Step 9: Commit**

```bash
git add scripts/add-ohlasky.ts scripts/add-ohlasky.test.ts scripts/content-files.ts scripts/stage/core.ts scripts/stage/porad.ts scripts/stage/cli.ts scripts/test-helpers.ts scripts/stage/porad.test.ts scripts/stage/cli.test.ts src/content/ohlasky
git commit -F - <<'EOF'
refactor(scripts): write the ohlášky as JSON and prune covered laterExceptions

addOhlasky() parses, changes and writes src/content/ohlasky.json instead of generating TypeScript, and removes the
laterExceptions entries the kept sheets cover. The generated sheet files and index.ts are gone.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

(If the commitlint body line limit of 100 characters rejects the message, rewrap the body; never `--no-verify`.)

---

### Task 4: Docs

**Files:**

- Modify: `.claude/skills/farnost-create-porad-bohosluzeb/SKILL.md` (already has the uncommitted trim from the
  earlier conversation: keep it), `.claude/rules/content-and-time.md:38`, `README.md:131`,
  `src/content/masses.ts:5,75`

- [ ] **Step 1: Skill.** In `.claude/skills/farnost-create-porad-bohosluzeb/SKILL.md`:
  - Intro: "one `ServiceSheet` (`src/content/types/services.ts`), generated into
    `src/content/ohlasky/<validFrom>.ts`" becomes "one `ServiceSheet` (`src/content/types/services.ts`) in
    `src/content/ohlasky.json`".
  - **Later changes** paragraph: "(`laterExceptions`, in `src/content/ohlasky/index.ts`, after the **last** sheet's
    `validTo`)" becomes "(`laterExceptions` in `src/content/ohlasky.json`, after the **last** sheet's `validTo`)".
  - Step 4, the paragraph after the command becomes:

```markdown
It validates the record first (the error names each field), stages the PDF, adds the sheet to
`src/content/ohlasky.json`, removes the outdated sheets and the `laterExceptions` entries the sheets now cover, formats
the file and runs the ohlášky test.
```

- **Corrections**: "never edit the generated sheet file by hand." becomes "never edit a sheet in
  `src/content/ohlasky.json` by hand."
- Step 5: "the commit must include the whole `src/content/ohlasky/` folder, with the sheet files the script removed
  (deletions): `git add src/content/ohlasky`" becomes "the commit includes `src/content/ohlasky.json`".
- Common mistakes: "Editing a generated sheet file instead of rerunning…" becomes "Editing a sheet in
  `ohlasky.json` by hand instead of rerunning…".

- [ ] **Step 2: Rule.** In `.claude/rules/content-and-time.md`, the Ohlášky bullet: replace
      "Ohlášky (`content/ohlasky/`, design §14.5–14.7): one generated `ServiceSheet` file per week (a week, or two
      weeks around holidays; `isOneWeek()` switches the labels; `<validFrom>.ts`, joined by `index.ts` with
      `laterExceptions`), added in advance with `pnpm stage porad … --record`, which removes the sheets before the
      current one." with "Ohlášky (`content/ohlasky.json`, design §14.5–14.7): one `ServiceSheet` per week (a week, or
      two weeks around holidays; `isOneWeek()` switches the labels) and the hand-entered `laterExceptions`, loaded and
      checked by `server/ohlasky.ts` (`ohlaskyFileSchema`); a sheet is added in advance with
      `pnpm stage porad … --record`, which removes the sheets before the current one and the `laterExceptions` the
      sheets cover." Also replace "the module is `server-only`" with "`server/ohlasky.ts` is `server-only`".

- [ ] **Step 3: README and comments.**
  - `README.md:131`: "into `ohlasky/`" becomes "into `ohlasky.json`" (keep the table aligned; `pnpm format` does it).
  - `src/content/masses.ts` lines 5 and 75: "`content/ohlasky.ts`" becomes "`content/ohlasky.json`".

Run: `grep -rn "content/ohlasky/\|ohlasky/index\|ohlasky\.ts\b" .claude README.md src scripts docs/conventions.md docs/deployment.md`
Expected: no output.

- [ ] **Step 4: Format and commit**

```bash
pnpm format
git add .claude/skills/farnost-create-porad-bohosluzeb/SKILL.md .claude/rules/content-and-time.md README.md src/content/masses.ts
git commit -F - <<'EOF'
docs: describe the ohlášky as ohlasky.json

The skill drops the manual laterExceptions cleanup (the script prunes covered entries) and the codebase explanations
it does not need.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Final verification

- [ ] **Step 1: Full check on the final tree**

Run: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && git status --short`
Expected: all pass; `git status` empty (format changed nothing).

- [ ] **Step 2: HTML comparison against the baseline**

Run: `node <scratchpad>/normalize-html.mjs out <scratchpad>/html-after && diff -r <scratchpad>/html-before <scratchpad>/html-after && echo SAME`
Expected: `SAME`.

- [ ] **Step 3: Report** the four commits of Tasks 1–4 (`git log --oneline -4`) to the user. Do not push or
      release: that needs the user's explicit yes.
