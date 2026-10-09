# Several Ohlášky Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the parish publish next week's ohlášky on any day: the content holds several sheets, the site shows the
one valid today (chosen in the browser), and `pnpm stage porad … --record` adds a sheet from JSON and prunes old ones.

**Architecture:** Sheets live one per generated file in `src/content/ohlasky/<validFrom>.ts`, joined by
`src/content/ohlasky/index.ts`. Pure rules (`currentSheet`, merged `scheduleExceptions`, `sheetOrderProblems`) live in
`src/lib/services/service-sheet.ts`, the record rules in a zod schema; a small client component `CurrentSheet` picks
the sheet with `useToday()`. The generator, index editing and pruning live in `scripts/add-ohlasky.ts`, called by
`stagePorad()`.

**Tech Stack:** Next.js 16 (static export), React 19, TypeScript, zod 4, date-fns 4 + `@date-fns/tz`, Vitest 5, tsx,
Prettier, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-09-ohlasky-sheets-design.md`

## Global Constraints

- pnpm only; code, comments, file names and commits in English, UI copy in Czech.
- Static export only: nothing that needs a Node server; date-dependent output is re-computed in the browser
  (`useToday`), the prerender uses `BUILD_TIME`.
- Dates are ISO `YYYY-MM-DD` in Europe/Prague (`pragueDate()`); times `H:MM`.
- `src/lib` is pure logic (no content imports except types and `@/content/site`); `src/content` is data only; every
  hook in `src/hooks/`; imports `./x` in the same folder, `@/…` otherwise (no `../`).
- The ohlášky content modules start with `import "server-only"`: non-public row details must never reach a client
  bundle (client components get only `publicDays()` rows or the PDF link and dates).
- Consecutive sheets may share only their boundary day; on a shared day the newer sheet wins.
- Content tests must not depend on today's date (the daily refresh rebuilds old tags on later days).
- `design/DESIGN.md` is not edited.
- Commits: Conventional Commits via the `commit` skill, validated with `pnpm exec commitlint`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; never `--no-verify`. Before each commit run
  `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit` (Task 7 adds `pnpm build` and the browser check).

## Review Focus

- A late PDF (added after the current sheet's week ended, e.g. on Monday): the stale sheet is the current one and is
  kept by pruning until the new one is added; the new sheet then becomes current. Pinned in Task 3 (prune test) and
  Task 1 (`currentSheet` after the last sheet).
- A corrected PDF of the same week (`--rev 2`): it replaces the sheet of the same `validFrom` instead of being
  refused as an overlap. Pinned in Task 3.
- A record that carries `pdfUrl`, `validFrom` or `validTo` (the agent copied them from `--check`): refused with a clear
  message, since the script takes them from the PDF. Pinned in Task 3.
- A hidden intention (`public: false`) of a sheet that is not shown yet must not reach the exported HTML or RSC
  payload. Pinned in Task 7 (grep of `out/` with the temporary sheet).
- A record whose week lies before the current sheet (an old PDF by mistake): refused instead of being written and
  pruned at once. Pinned in Task 3.

---

### Task 1: Multi-sheet rules in `service-sheet.ts`

**Files:**

- Modify: `src/lib/services/service-sheet.ts`
- Modify: `src/server/services.ts:13`
- Test: `src/lib/services/service-sheet.test.ts`

**Interfaces:**

- Produces:
  - `periodDates(validFrom: IsoDate, validTo: IsoDate): IsoDate[]` — every date of the period, in order.
  - `currentSheet<T extends { validFrom: IsoDate }>(sheets: T[], today: IsoDate): T | undefined` — the last sheet
    (sorted by `validFrom`) with `validFrom <= today`, else the first; `undefined` only for an empty list.
  - `scheduleExceptions(sheets: Pick<ServiceSheet, "days" | "validFrom" | "validTo">[], later: ScheduleException[],
places: readonly PlaceId[]): ScheduleException[]` — every sheet's days (newer sheet wins a shared date), sorted by
    date, then `later` entries after the last sheet's `validTo`.
  - `sheetOrderProblems(sheets: Pick<ServiceSheet, "validFrom" | "validTo">[]): string[]` — one message per sheet that
    starts before the previous one ends.

- [ ] **Step 1: Write the failing tests**

In `src/lib/services/service-sheet.test.ts`, add `currentSheet`, `periodDates` and `sheetOrderProblems` to the import
from `./service-sheet`, replace the whole `describe("scheduleExceptions", …)` block, and add the new blocks after it:

```ts
describe("scheduleExceptions", () => {
  const sheet = { validFrom: "2026-10-02", validTo: "2026-10-05", days };
  const cancelled = (date: string) => ({ date, reason: "zrušeno", services: [] });

  it("puts the sheet's days first, then the hand-entered exceptions after the week", () => {
    const result = scheduleExceptions([sheet], [cancelled("2026-10-11"), cancelled("2026-10-18")], ["kurim"]);
    expect(result.map((x) => x.date)).toEqual([
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-11",
      "2026-10-18",
    ]);
    expect(result.at(-1)).toEqual(cancelled("2026-10-18"));
  });

  it("drops hand-entered exceptions the sheet covers or that are past", () => {
    const result = scheduleExceptions(
      [sheet],
      [cancelled("2026-09-27"), cancelled("2026-10-04"), cancelled("2026-10-05")],
      ["kurim"],
    );
    expect(result).toEqual(sheetExceptions(sheet, ["kurim"]));
  });

  it("lets the newer sheet win the shared day and keeps every other day of both", () => {
    const next = {
      validFrom: "2026-10-05",
      validTo: "2026-10-06",
      days: [
        { date: "2026-10-05", rows: [{ time: "9:00", place: "kurim", title: "Mše sv.", mass: true }] },
        { date: "2026-10-06", rows: [] },
      ],
    };
    const result = scheduleExceptions([sheet, next], [cancelled("2026-10-06"), cancelled("2026-10-07")], ["kurim"]);
    expect(result.map((x) => x.date)).toEqual([
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ]);
    expect(result[3]).toEqual({
      date: "2026-10-05",
      reason: "dle ohlášek",
      services: [{ time: "9:00", place: "kurim" }],
    });
    expect(result.at(-1)).toEqual(cancelled("2026-10-07"));
  });

  it("leaves a gap between sheets to the regular schedule", () => {
    const later = { validFrom: "2026-10-11", validTo: "2026-10-11", days: [{ date: "2026-10-11", rows: [] }] };
    const dates = scheduleExceptions([sheet, later], [], ["kurim"]).map((x) => x.date);
    expect(dates).not.toContain("2026-10-08");
    expect(dates.at(-1)).toBe("2026-10-11");
  });
});

describe("periodDates", () => {
  it("lists every date of the period, across the DST change too", () => {
    expect(periodDates("2026-10-24", "2026-10-26")).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
    expect(periodDates("2026-10-04", "2026-10-04")).toEqual(["2026-10-04"]);
  });
});

describe("currentSheet", () => {
  const sheets = [
    { validFrom: "2026-10-04", validTo: "2026-10-11" },
    { validFrom: "2026-10-11", validTo: "2026-10-18" },
    { validFrom: "2026-10-25", validTo: "2026-11-01" },
  ];

  it("is the sheet whose week has started last", () => {
    expect(currentSheet(sheets, "2026-10-08")).toBe(sheets[0]);
    expect(currentSheet(sheets, "2026-10-12")).toBe(sheets[1]);
  });

  it("is the newer sheet on the shared Sunday", () => {
    expect(currentSheet(sheets, "2026-10-11")).toBe(sheets[1]);
  });

  it("stays on the last started sheet in a gap and after the last week", () => {
    expect(currentSheet(sheets, "2026-10-21")).toBe(sheets[1]);
    expect(currentSheet(sheets, "2026-12-01")).toBe(sheets[2]);
  });

  it("is the first sheet before any week starts, and nothing without sheets", () => {
    expect(currentSheet(sheets, "2026-09-01")).toBe(sheets[0]);
    expect(currentSheet([], "2026-10-08")).toBeUndefined();
  });
});

describe("sheetOrderProblems", () => {
  it("allows sheets sharing their boundary day, and gaps", () => {
    expect(
      sheetOrderProblems([
        { validFrom: "2026-10-04", validTo: "2026-10-11" },
        { validFrom: "2026-10-11", validTo: "2026-10-18" },
        { validFrom: "2026-10-25", validTo: "2026-11-01" },
      ]),
    ).toEqual([]);
  });

  it("names a sheet that starts before the previous one ends, or is out of order", () => {
    expect(
      sheetOrderProblems([
        { validFrom: "2026-10-04", validTo: "2026-10-11" },
        { validFrom: "2026-10-10", validTo: "2026-10-17" },
      ]),
    ).toEqual(["2026-10-10 – 2026-10-17 starts before 2026-10-04 – 2026-10-11 ends (only its last day may be shared)"]);
    expect(
      sheetOrderProblems([
        { validFrom: "2026-10-11", validTo: "2026-10-18" },
        { validFrom: "2026-10-04", validTo: "2026-10-11" },
      ]),
    ).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/lib/services/service-sheet.test.ts`
Expected: FAIL (`periodDates`, `currentSheet`, `sheetOrderProblems` are not exported; `scheduleExceptions` gets an
array).

- [ ] **Step 3: Implement**

In `src/lib/services/service-sheet.ts`, add `periodDates` above `sheetExceptions` and use it there:

```ts
/** Every date from `validFrom` to `validTo`, in order (Prague days, so the DST change counts one day). */
export const periodDates = (validFrom: IsoDate, validTo: IsoDate): IsoDate[] =>
  eachDayOfInterval(
    { start: pragueDateTime(validFrom, "12:00"), end: pragueDateTime(validTo, "12:00") },
    { in: inPrague },
  ).map((day) => pragueDate(day));
```

In `sheetExceptions`, replace the `eachDayOfInterval(…).map((day) => { const date = pragueDate(day); …` opening with
`periodDates(sheet.validFrom, sheet.validTo).map((date) => {` (drop the `const date = …` line; the body stays).

Replace `scheduleExceptions` (and its doc comment) with:

```ts
/**
 * All schedule exceptions: every day of every sheet (`sheetExceptions()`), the newer sheet replacing a day it shares
 * with the older one, then the hand-entered `later` ones after the last sheet. A hand-entered exception a sheet
 * covers, or that is past, is dropped, so the sheets always win over it. `sheets` are sorted by `validFrom`.
 */
export function scheduleExceptions(
  sheets: Pick<ServiceSheet, "days" | "validFrom" | "validTo">[],
  later: ScheduleException[],
  places: readonly PlaceId[],
): ScheduleException[] {
  const byDate = new Map<IsoDate, ScheduleException>();
  for (const sheet of sheets) for (const x of sheetExceptions(sheet, places)) byDate.set(x.date, x);
  const lastDay = sheets.reduce<IsoDate>((last, s) => (s.validTo > last ? s.validTo : last), "");
  const fromSheets = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  return [...fromSheets, ...later.filter((x) => x.date > lastDay)];
}

/**
 * The sheet shown on `today`: the last one (sorted by `validFrom`) whose week has started, so the newer sheet wins
 * the Sunday two sheets share and a stale sheet stays until the next one arrives; the first one before any started.
 */
export function currentSheet<T extends { validFrom: IsoDate }>(sheets: T[], today: IsoDate): T | undefined {
  return sheets.findLast((s) => s.validFrom <= today) ?? sheets[0];
}

/** "2026-10-04 – 2026-10-11" for the messages. */
const period = (s: Pick<ServiceSheet, "validFrom" | "validTo">) => `${s.validFrom} – ${s.validTo}`;

/**
 * How `sheets` break their order: each must start on or after the previous one's `validTo`, so two consecutive
 * sheets share at most that day. One message per offending sheet; empty when they are in order.
 */
export function sheetOrderProblems(sheets: Pick<ServiceSheet, "validFrom" | "validTo">[]): string[] {
  return sheets.flatMap((s, i) =>
    i > 0 && s.validFrom < sheets[i - 1].validTo
      ? [`${period(s)} starts before ${period(sheets[i - 1])} ends (only its last day may be shared)`]
      : [],
  );
}
```

In `src/server/services.ts`, keep the single sheet for now:

```ts
export const currentExceptions = scheduleExceptions([serviceSheet], laterExceptions, Object.keys(places) as PlaceId[]);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/lib/services/service-sheet.test.ts src/content && pnpm exec tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/service-sheet.ts src/lib/services/service-sheet.test.ts src/server/services.ts
git commit -F - <<'EOF'
feat(lib): combine several ohlášky sheets into the schedule exceptions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: The sheet record schema

**Files:**

- Create: `src/lib/services/schema.ts`
- Test: `src/lib/services/schema.test.ts`

**Interfaces:**

- Consumes: `periodDates` (Task 1).
- Produces: `serviceSheetSchema` (zod, `satisfies z.ZodType<ServiceSheet>`) — shape plus the one-sheet rules
  (`validTo` after `validFrom`, every date of the period once and in order, rows in time order).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/services/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as z from "zod";
import type { ServiceSheet } from "@/content/types/services";
import { serviceSheetSchema } from "./schema";

const sheet = (fields: Partial<ServiceSheet> = {}): ServiceSheet => ({
  pdfUrl: "/uploads/porady_bohosluzeb/2026-10-11-porad-bohosluzeb.pdf",
  validFrom: "2026-10-11",
  validTo: "2026-10-12",
  days: [
    {
      date: "2026-10-11",
      feast: "28. neděle v mezidobí",
      solemnity: true,
      rows: [
        { time: "8:00", place: "kurim", title: "Mše sv.", detail: "za farníky", mass: true },
        { time: "11:00", place: "Vranov", title: "Pohřeb", detail: "[jméno]", public: false },
      ],
    },
    { date: "2026-10-12", rows: [] },
  ],
  announcements: [{ category: "pozvanka", html: "<p>Zveme.</p>", newsId: "farni-den-2026" }],
  ...fields,
});

/** The messages of a failed parse, as the script prints them. */
const problems = (input: unknown) => {
  const result = serviceSheetSchema.safeParse(input);
  return result.success ? "" : z.prettifyError(result.error);
};

describe("serviceSheetSchema", () => {
  it("accepts a sheet and keeps the schema's field order", () => {
    const parsed = serviceSheetSchema.parse(sheet());
    expect(parsed).toEqual(sheet());
    expect(Object.keys(parsed)).toEqual(["pdfUrl", "validFrom", "validTo", "days", "announcements"]);
  });

  it("names bad fields and unknown ones", () => {
    const bad = sheet();
    bad.days[0].rows[0] = { ...bad.days[0].rows[0], time: "8.00" };
    expect(problems(bad)).toContain("days[0].rows[0].time");
    expect(problems({ ...sheet(), note: "x" })).toContain('Unrecognized key: "note"');
    expect(problems(sheet({ pdfUrl: "/uploads/x.pdf" }))).toContain("pdfUrl");
    expect(problems({ ...sheet(), announcements: [{ category: "jine", html: "<p>x</p>" }] })).toContain(
      "announcements[0].category",
    );
  });

  it("needs every date of the period once, in order", () => {
    expect(problems(sheet({ days: [sheet().days[0]] }))).toContain("missing 2026-10-12");
    expect(problems(sheet({ days: [sheet().days[1], sheet().days[0]] }))).toContain("in date order");
    expect(problems(sheet({ days: [...sheet().days, { date: "2026-10-13", rows: [] }] }))).toContain(
      "2026-10-13 is outside",
    );
  });

  it("needs validTo after validFrom and rows in time order", () => {
    expect(problems(sheet({ validTo: "2026-10-11" }))).toContain("validTo");
    const late = sheet();
    late.days[0].rows.reverse();
    expect(problems(late)).toContain("days[0].rows");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/lib/services/schema.test.ts`
Expected: FAIL with "Cannot find module './schema'".

- [ ] **Step 3: Implement**

Create `src/lib/services/schema.ts`:

```ts
import * as z from "zod";
import type { ServiceSheet } from "@/content/types/services";
import { periodDates } from "./service-sheet";

// The rules of one ohlášky sheet, in one place: ohlasky.test.ts checks every sheet in src/content/ohlasky/ with them,
// and scripts/add-ohlasky.ts checks a new record before the farnost-create-porad-bohosluzeb skill stages its PDF.
// The rules across sheets (their order, the aktuality an announcement links) are sheetOrderProblems() and the script's.

const date = z.iso.date();
const clock = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "must be H:MM");
const text = z.string().trim().min(1);
const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const rowSchema = z.strictObject({
  time: clock,
  place: text,
  title: text,
  detail: text.optional(),
  public: z.boolean().optional(),
  mass: z.boolean().optional(),
  service: z.boolean().optional(),
  changed: z.boolean().optional(),
});

const daySchema = z.strictObject({
  date,
  feast: text.optional(),
  solemnity: z.boolean().optional(),
  rows: z.array(rowSchema),
});

const announcementSchema = z.strictObject({
  category: z.enum(["zmena", "smireni", "pozvanka", "podekovani", "info"]),
  html: text,
  newsId: text.optional(),
});

/** A ServiceSheet (src/content/types/services.ts); its fields in the order the generated files write them. */
export const serviceSheetSchema = z
  .strictObject({
    pdfUrl: z
      .string()
      .regex(/^\/uploads\/porady_bohosluzeb\/[\w.-]+\.pdf$/, "must be a /uploads/porady_bohosluzeb/ PDF"),
    validFrom: date,
    validTo: date,
    days: z.array(daySchema),
    announcements: z.array(announcementSchema),
  })
  .superRefine((sheet, ctx) => {
    if (sheet.validTo <= sheet.validFrom) {
      ctx.addIssue({ code: "custom", path: ["validTo"], message: "must be after validFrom" });
      return;
    }
    // During the sheet's period only its rows count (sheetExceptions()), so a missing day would have no services.
    const period = periodDates(sheet.validFrom, sheet.validTo);
    const dates = sheet.days.map((d) => d.date);
    const missing = period.filter((d) => !dates.includes(d));
    if (missing.length > 0) {
      ctx.addIssue({ code: "custom", path: ["days"], message: `missing ${missing.join(", ")}` });
    }
    dates.forEach((d, i) => {
      if (!period.includes(d)) {
        ctx.addIssue({ code: "custom", path: ["days", i, "date"], message: `${d} is outside the sheet's period` });
      } else if (i > 0 && d <= dates[i - 1]) {
        ctx.addIssue({
          code: "custom",
          path: ["days", i, "date"],
          message: "must be after the previous day (in date order, once)",
        });
      }
    });
    sheet.days.forEach((day, i) => {
      if (day.rows.some((r, j) => j > 0 && minutes(r.time) < minutes(day.rows[j - 1].time))) {
        ctx.addIssue({ code: "custom", path: ["days", i, "rows"], message: "must be in time order" });
      }
    });
  }) satisfies z.ZodType<ServiceSheet>;
```

Note: a bad `time` makes `minutes()` return `NaN`, and `NaN <` is false, so a bad time reports only its own field.
zod 4 runs `superRefine` only when the shape parsed; if a test above shows otherwise, guard the refine with
`if (!sheet.days) return;` — do not change the tests.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/lib/services/schema.test.ts && pnpm exec tsc --noEmit`
Expected: PASS. If the "in date order" message does not appear for the reversed days, check that the reversed list
yields `2026-10-11 <= 2026-10-12` at index 1 — it must; fix the implementation, not the test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/schema.ts src/lib/services/schema.test.ts
git commit -F - <<'EOF'
feat(lib): add the ohlášky sheet record schema

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: The sheet generator, index editing and pruning (`scripts/add-ohlasky.ts`)

**Files:**

- Create: `scripts/add-ohlasky.ts`
- Modify: `scripts/add-aktualita.ts` (export `newsIds`, generalise `formatAndTest`)
- Test: `scripts/add-ohlasky.test.ts`

**Interfaces:**

- Consumes: `serviceSheetSchema` (Task 2), `sheetOrderProblems`, `currentSheet` (Task 1), `toSource`,
  `existingIds`, `formatFiles` from `./add-aktualita`.
- Produces (used by Tasks 4 and 6):
  - `type SheetWeek = { pdfUrl: string; validFrom: IsoDate; validTo: IsoDate }`
  - `sheetName(validFrom: IsoDate): string` → `"sheet20261004"`
  - `sheetSource(sheet: ServiceSheet): string` — the TS source of a sheet file.
  - `setSheets(index: string, validFroms: IsoDate[]): string` — the index with its sheet imports and
    `serviceSheets` array set to `validFroms`.
  - `addOhlasky(ohlaskyDir: string, newsDir: string, input: unknown, week: SheetWeek, options?: { check?: boolean; now?: Date }): AddOhlaskyResult`
    where `AddOhlaskyResult = { sheet: ServiceSheet; target: string; replaced: boolean; removed: string[]; covered: IsoDate[]; written: string[] }`
    (`target` and `removed` are file names like `"2026-10-11.ts"`; `written` absolute paths; nothing written with
    `check`).
  - `ohlaskyLines(result: AddOhlaskyResult, check: boolean): string[]` — the lines the command prints.
  - In `add-aktualita.ts`: `newsIds(newsDir: string): Set<string>` and `formatAndTest(files: string[], tests: string)`
    (absolute file paths; `tests` a path for `vitest run`, e.g. `"src/content/news"`).

- [ ] **Step 1: Generalise the helpers in `scripts/add-aktualita.ts`**

Replace the inline id lookup in `addAktualita` with an exported helper (put it right after `tsFiles`):

```ts
/** The IDs of every aktualita in the news folder `newsDir`. */
export const newsIds = (newsDir: string) => existingIds(tsFiles(newsDir).map((f) => readFileSync(f, "utf8")));
```

and in `addAktualita`: `if (newsIds(newsDir).has(record.id)) {`.

Replace `formatAndTest`:

```ts
/**
 * Formats `files` (absolute paths) and runs the content tests under `tests` (with Node itself, so no shell is needed
 * to start pnpm on Windows). Throws when a test fails.
 */
export async function formatAndTest(files: string[], tests: string) {
  await formatFiles(files);
  const vitest = join(root, "node_modules/vitest/vitest.mjs");
  execFileSync(process.execPath, [vitest, "run", tests], { cwd: root, stdio: "inherit" });
}
```

and in its `main()`: `await formatAndTest(result.written.map((f) => join(NEWS_DIR, f)), "src/content/news");`.
In `scripts/stage-upload.ts` `main()`: `if (written.length > 0) await formatAndTest(written.map((f) => join(NEWS_DIR, f)), "src/content/news");`
(Task 6 changes this line again).

Run: `pnpm exec vitest run scripts && pnpm exec tsc --noEmit` — Expected: PASS.

- [ ] **Step 2: Write the failing tests**

Create `scripts/add-ohlasky.test.ts`:

```ts
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ServiceSheet, SheetDay } from "@/content/types/services";
import { addOhlasky, ohlaskyLines, setSheets, sheetName, sheetSource, type SheetWeek } from "./add-ohlasky";

const INDEX = `import "server-only";
import type { ScheduleException, ServiceSheet } from "@/content/types/services";

export const serviceSheets: ServiceSheet[] = [];

export const laterExceptions: ScheduleException[] = [
  { date: "2026-10-18", services: [], reason: "pouť" },
  { date: "2026-11-01", services: [], reason: "dušičky" },
];
`;

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

describe("sheetName and sheetSource", () => {
  it("names the export after validFrom and writes a server-only typed module", () => {
    expect(sheetName("2026-10-04")).toBe("sheet20261004");
    const sheet: ServiceSheet = { ...week("2026-10-04", "2026-10-05"), ...record(datesOf(4, 5)) } as ServiceSheet;
    const source = sheetSource(sheet);
    expect(source).toMatch(
      /^import "server-only";\nimport type \{ ServiceSheet \} from "@\/content\/types\/services";/,
    );
    expect(source).toContain("export const sheet20261004: ServiceSheet = {");
    expect(source).toContain('validTo: "2026-10-05"');
  });
});

describe("setSheets", () => {
  it("sets the imports and the array, replacing the old ones", () => {
    const one = setSheets(INDEX, ["2026-10-04"]);
    expect(one).toContain('import { sheet20261004 } from "./2026-10-04";');
    expect(one).toContain("export const serviceSheets: ServiceSheet[] = [sheet20261004];");
    const two = setSheets(one, ["2026-10-11", "2026-10-18"]);
    expect(two).not.toContain("sheet20261004");
    expect(two).toContain(
      'import { sheet20261011 } from "./2026-10-11";\nimport { sheet20261018 } from "./2026-10-18";',
    );
    expect(two).toContain("[sheet20261011, sheet20261018];");
    expect(two).toContain('{ date: "2026-10-18", services: [], reason: "pouť" }');
  });

  it("refuses an index of another shape", () => {
    expect(() => setSheets("export const x = 1;", ["2026-10-04"])).toThrow("unexpected shape");
  });
});

describe("addOhlasky on a temp ohlasky/ and news/", () => {
  let dir: string;
  let ohlasky: string;
  let news: string;
  const now = new Date("2026-10-09T10:00:00+02:00");
  const files = () => readdirSync(ohlasky).sort();

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "add-ohlasky-"));
    ohlasky = join(dir, "ohlasky");
    news = join(dir, "news");
    mkdirSync(ohlasky);
    mkdirSync(news);
    writeFileSync(join(news, "10.ts"), '  {\n    id: "farni-den-2026",\n  },\n');
    writeFileSync(join(ohlasky, "index.ts"), INDEX);
    // An older sheet (27. 9.–4. 10.) and the current one (4.–11. 10.), written as the command writes them on
    // 30. 9., when both are still kept.
    const setup = { now: new Date("2026-09-30T10:00:00+02:00") };
    const september = ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", ...datesOf(1, 4)];
    addOhlasky(ohlasky, news, record(september), week("2026-09-27", "2026-10-04"), setup);
    addOhlasky(ohlasky, news, record(datesOf(4, 11)), week("2026-10-04", "2026-10-11"), setup);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("adds the next week in advance and prunes the sheets before the current one", () => {
    const result = addOhlasky(
      ohlasky,
      news,
      record(datesOf(11, 18), "farni-den-2026"),
      week("2026-10-11", "2026-10-18"),
      { now },
    );
    expect(result).toMatchObject({
      target: "2026-10-11.ts",
      replaced: false,
      removed: ["2026-09-27.ts"],
      covered: ["2026-10-18"],
    });
    expect(files()).toEqual(["2026-10-04.ts", "2026-10-11.ts", "index.ts"]);
    const index = readFileSync(join(ohlasky, "index.ts"), "utf8");
    expect(index).toContain("[sheet20261004, sheet20261011];");
    expect(result.written).toEqual([join(ohlasky, "2026-10-11.ts"), join(ohlasky, "index.ts")]);
    expect(ohlaskyLines(result, false)).toEqual([
      "Added the sheet 2026-10-11 – 2026-10-18 to src/content/ohlasky/2026-10-11.ts",
      "Removed the outdated sheet src/content/ohlasky/2026-09-27.ts",
      "laterExceptions on 2026-10-18 is now covered by the sheet: remove it from src/content/ohlasky/index.ts",
    ]);
  });

  it("keeps a stale current sheet when the next one comes late", () => {
    const monday = new Date("2026-10-12T10:00:00+02:00");
    addOhlasky(ohlasky, news, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), { now: monday });
    expect(files()).toEqual(["2026-10-11.ts", "index.ts"]);
    const late = new Date("2026-10-21T10:00:00+02:00");
    expect(
      addOhlasky(ohlasky, news, record(datesOf(25, 31)), week("2026-10-25", "2026-10-31"), { now: late }).removed,
    ).toEqual([]);
    expect(files()).toEqual(["2026-10-11.ts", "2026-10-25.ts", "index.ts"]);
  });

  it("replaces the sheet of the same week (a corrected PDF)", () => {
    const fixed = {
      ...week("2026-10-04", "2026-10-11"),
      pdfUrl: "/uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb-2.pdf",
    };
    const result = addOhlasky(ohlasky, news, record(datesOf(4, 11)), fixed, { now });
    expect(result.replaced).toBe(true);
    expect(readFileSync(join(ohlasky, "2026-10-04.ts"), "utf8")).toContain("porad-bohosluzeb-2.pdf");
    expect(ohlaskyLines(result, false)[0]).toBe(
      "Replaced the sheet 2026-10-04 – 2026-10-11 in src/content/ohlasky/2026-10-04.ts",
    );
  });

  it("refuses an overlap, a week before the current sheet, the PDF fields and an unknown aktualita", () => {
    expect(() => addOhlasky(ohlasky, news, record(datesOf(10, 17)), week("2026-10-10", "2026-10-17"), { now })).toThrow(
      "starts before 2026-10-04 – 2026-10-11 ends",
    );
    expect(() =>
      addOhlasky(ohlasky, news, record(["2026-09-20", "2026-09-21"]), week("2026-09-20", "2026-09-21"), { now }),
    ).toThrow("before the current sheet (2026-10-04)");
    expect(() =>
      addOhlasky(
        ohlasky,
        news,
        { ...record(datesOf(11, 18)), validFrom: "2026-10-11" },
        week("2026-10-11", "2026-10-18"),
        { now },
      ),
    ).toThrow("the script reads pdfUrl, validFrom and validTo from the PDF");
    expect(() =>
      addOhlasky(ohlasky, news, record(datesOf(11, 18), "neni-2026"), week("2026-10-11", "2026-10-18"), { now }),
    ).toThrow("no aktualita with the id neni-2026");
    expect(() => addOhlasky(ohlasky, news, record(datesOf(11, 17)), week("2026-10-11", "2026-10-18"), { now })).toThrow(
      "missing 2026-10-18",
    );
    expect(files()).toEqual(["2026-09-27.ts", "2026-10-04.ts", "index.ts"]);
  });

  it("only validates with check", () => {
    const result = addOhlasky(ohlasky, news, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), {
      now,
      check: true,
    });
    expect(result.written).toEqual([]);
    expect(existsSync(join(ohlasky, "2026-10-11.ts"))).toBe(false);
    expect(ohlaskyLines(result, true)[0]).toBe(
      "Would add the sheet 2026-10-11 – 2026-10-18 to src/content/ohlasky/2026-10-11.ts",
    );
  });
});
```

(Prettier reformats the long lines in Step 5; keep the content.)

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run scripts/add-ohlasky.test.ts`
Expected: FAIL with "Cannot find module './add-ohlasky'".

- [ ] **Step 4: Implement**

Create `scripts/add-ohlasky.ts`:

```ts
// Adds a confirmed ohlášky sheet to src/content/ohlasky/ (farnost-create-porad-bohosluzeb skill, through
// `pnpm stage porad <pdf> --record <record.json>`, which stages the PDF and passes its week). Each sheet is one
// generated file, <validFrom>.ts, joined by index.ts; a sheet of the same week (a corrected PDF) replaces its file.
// Sheets may share only their boundary day (sheetOrderProblems()). The sheets before the current one (the last whose
// week has started, today in Prague) are removed: the site needs the current sheet and the ones after it. The record's
// rules are serviceSheetSchema's (src/lib/services/schema.ts).

import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod";
import type { ServiceSheet } from "@/content/types/services";
import type { IsoDate } from "@/content/types/shared";
import { serviceSheetSchema } from "@/lib/services/schema";
import { currentSheet, sheetOrderProblems } from "@/lib/services/service-sheet";
import { pragueDate } from "@/lib/shared/prague";
import { newsIds, toSource } from "./add-aktualita";

const root = fileURLToPath(new URL("..", import.meta.url));
export const OHLASKY_DIR = join(root, "src/content/ohlasky");

/** The fields the script takes from the staged PDF, never from the record. */
const WEEK_FIELDS = ["pdfUrl", "validFrom", "validTo"] as const;
export type SheetWeek = Pick<ServiceSheet, (typeof WEEK_FIELDS)[number]>;

const SHEET_FILE = /^(\d{4}-\d{2}-\d{2})\.ts$/;
const TYPE_IMPORT = 'import type { ScheduleException, ServiceSheet } from "@/content/types/services";';
const SHEETS_ARRAY = /^export const serviceSheets: ServiceSheet\[\] = \[[^\]]*\];$/m;

/** The export name of the sheet starting on `validFrom`: "sheet20261004". */
export const sheetName = (validFrom: IsoDate) => `sheet${validFrom.replaceAll("-", "")}`;

/** The source of a sheet's file; Prettier formats it afterwards. */
export function sheetSource(sheet: ServiceSheet): string {
  return [
    'import "server-only";',
    'import type { ServiceSheet } from "@/content/types/services";',
    "",
    "// Generated by `pnpm stage porad … --record` (farnost-create-porad-bohosluzeb skill); a corrected record of the",
    "// same week replaces this file.",
    `export const ${sheetName(sheet.validFrom)}: ServiceSheet = ${toSource(sheet)};`,
    "",
  ].join("\n");
}

/** `index` (ohlasky/index.ts) with one import per sheet and `serviceSheets` listing them, in `validFroms` order. */
export function setSheets(index: string, validFroms: IsoDate[]): string {
  if (!index.includes(TYPE_IMPORT) || !SHEETS_ARRAY.test(index))
    throw new Error("ohlasky/index.ts has an unexpected shape");
  const imports = validFroms.map((d) => `import { ${sheetName(d)} } from "./${d}";`);
  return index
    .replace(/^import \{ sheet\d{8} \} from "\.\/\d{4}-\d{2}-\d{2}";\n/gm, "")
    .replace(TYPE_IMPORT, [TYPE_IMPORT, ...imports].join("\n"))
    .replace(SHEETS_ARRAY, `export const serviceSheets: ServiceSheet[] = [${validFroms.map(sheetName).join(", ")}];`);
}

/** The week of every sheet file in `dir`, sorted by `validFrom` (read from the generated source). */
function readWeeks(dir: string): Pick<ServiceSheet, "validFrom" | "validTo">[] {
  return readdirSync(dir)
    .flatMap((file) => SHEET_FILE.exec(file)?.[1] ?? [])
    .sort()
    .map((validFrom) => {
      const validTo = /^\s+validTo: "(\d{4}-\d{2}-\d{2})",$/m.exec(
        readFileSync(join(dir, `${validFrom}.ts`), "utf8"),
      )?.[1];
      if (!validTo) throw new Error(`ohlasky/${validFrom}.ts has no validTo line`);
      return { validFrom, validTo };
    });
}

export type AddOhlaskyResult = {
  sheet: ServiceSheet;
  /** The sheet's file name in ohlasky/. */
  target: string;
  /** A sheet of the same week was replaced. */
  replaced: boolean;
  /** The outdated sheet files removed (or that would be). */
  removed: string[];
  /** The laterExceptions dates the sheets now cover: the agent removes them from index.ts. */
  covered: IsoDate[];
  /** The files written (absolute), for formatAndTest; empty with `check`. */
  written: string[];
};

/**
 * Adds `input` (the record: days and announcements) for the staged PDF's `week` to `ohlaskyDir`, prunes the sheets
 * before the current one and returns what it did; `check` only validates. Throws with every problem found.
 */
export function addOhlasky(
  ohlaskyDir: string,
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

  const existing = readWeeks(ohlaskyDir);
  const replaced = existing.some((s) => s.validFrom === sheet.validFrom);
  const all = [...existing.filter((s) => s.validFrom !== sheet.validFrom), sheet].sort((a, b) =>
    a.validFrom < b.validFrom ? -1 : 1,
  );
  const current = currentSheet(all, pragueDate(now))!;
  const kept = all.filter((s) => s.validFrom >= current.validFrom);
  if (!kept.includes(sheet)) {
    throw new Error(
      `the sheet ${sheet.validFrom} – ${sheet.validTo} is before the current sheet (${current.validFrom}): nothing to add`,
    );
  }
  const problems = sheetOrderProblems(kept);
  if (problems.length > 0) throw new Error(problems.join("\n"));

  const target = `${sheet.validFrom}.ts`;
  const removed = all.filter((s) => !kept.includes(s)).map((s) => `${s.validFrom}.ts`);
  const indexPath = join(ohlaskyDir, "index.ts");
  const index = readFileSync(indexPath, "utf8");
  const lastDay = kept.at(-1)!.validTo;
  const covered = [...index.matchAll(/^\s+\{ date: "(\d{4}-\d{2}-\d{2})"|^\s+date: "(\d{4}-\d{2}-\d{2})"/gm)]
    .map((m) => m[1] ?? m[2])
    .filter((date) => date <= lastDay);
  const written: string[] = [];
  if (!check) {
    writeFileSync(join(ohlaskyDir, target), sheetSource(sheet));
    for (const file of removed) if (existsSync(join(ohlaskyDir, file))) rmSync(join(ohlaskyDir, file));
    writeFileSync(
      indexPath,
      setSheets(
        index,
        kept.map((s) => s.validFrom),
      ),
    );
    written.push(join(ohlaskyDir, target), indexPath);
  }
  return { sheet, target, replaced, removed, covered, written };
}

/** The lines the command prints for `result`. */
export function ohlaskyLines(result: AddOhlaskyResult, check: boolean): string[] {
  const { sheet, target, replaced, removed, covered } = result;
  const verb = replaced ? (check ? "Would replace" : "Replaced") : check ? "Would add" : "Added";
  return [
    `${verb} the sheet ${sheet.validFrom} – ${sheet.validTo} ${replaced ? "in" : "to"} src/content/ohlasky/${target}`,
    ...removed.map((file) => `${check ? "Would remove" : "Removed"} the outdated sheet src/content/ohlasky/${file}`),
    ...covered.map(
      (date) => `laterExceptions on ${date} is now covered by the sheet: remove it from src/content/ohlasky/index.ts`,
    ),
  ];
}
```

Note on `covered`: `laterExceptions` entries are written either on one line (`{ date: "…", … }`) or expanded
(`date: "…",` on its own line); the regex takes both. The index holds no other `date:` fields.

- [ ] **Step 5: Run the tests to verify they pass, then format**

Run: `pnpm exec vitest run scripts/add-ohlasky.test.ts scripts/add-aktualita.test.ts && pnpm exec tsc --noEmit && pnpm exec prettier --write scripts/add-ohlasky.ts scripts/add-ohlasky.test.ts && pnpm exec eslint scripts`
Expected: PASS, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add scripts/add-ohlasky.ts scripts/add-ohlasky.test.ts scripts/add-aktualita.ts scripts/stage-upload.ts
git commit -F - <<'EOF'
feat(scripts): generate ohlášky sheet files and prune the outdated ones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Migrate the content to `src/content/ohlasky/`

**Files:**

- Create: `src/content/ohlasky/index.ts`, `src/content/ohlasky/2026-10-04.ts` (generated)
- Move: `src/content/ohlasky.test.ts` → `src/content/ohlasky/ohlasky.test.ts`
- Delete: `src/content/ohlasky.ts`
- Modify: `src/server/services.ts`, `src/app/page.tsx`, `src/app/porad_bohosluzeb/page.tsx`,
  `src/components/layout/SiteHeader.tsx`, `src/lib/services/service-sheet.ts` (remove `massRow`),
  `src/lib/services/service-sheet.test.ts` (remove the `massRow` block)

**Interfaces:**

- Consumes: `addOhlasky`, `sheetName` (Task 3); `scheduleExceptions`, `currentSheet`, `sheetOrderProblems` (Task 1);
  `serviceSheetSchema` (Task 2).
- Produces: `serviceSheets: ServiceSheet[]` and `laterExceptions: ScheduleException[]` from `@/content/ohlasky`;
  `buildSheet: ServiceSheet` from `@/server/services` (the sheet current on the build day; Task 5 removes it).

- [ ] **Step 1: Export the current sheet as JSON**

Write `scripts/export-sheet.tmp.ts` (temporary, in the repo so `@/` resolves; deleted right after):

```ts
import { laterExceptions, serviceSheet } from "@/content/ohlasky";

const { pdfUrl, validFrom, validTo, ...record } = serviceSheet;
console.log(JSON.stringify({ week: { pdfUrl, validFrom, validTo }, record, laterExceptions }, null, 2));
```

Run from the repo root (the `react-server` condition makes `server-only` importable outside Next), then delete it:
`NODE_OPTIONS=--conditions=react-server pnpm exec tsx scripts/export-sheet.tmp.ts > <scratchpad>/sheet.json && rm scripts/export-sheet.tmp.ts`
Expected: JSON with `week.validFrom` `"2026-10-04"`, 8 days, the announcements and `laterExceptions: []`.

- [ ] **Step 2: Create the index and generate the sheet file**

Create `src/content/ohlasky/index.ts` (copy `laterExceptions` entries from the JSON if it had any):

```ts
import "server-only";
import type { ScheduleException, ServiceSheet } from "@/content/types/services";

// The ohlášky, one generated file per sheet (`pnpm stage porad … --record`, farnost-create-porad-bohosluzeb skill),
// sorted by validFrom. Consecutive sheets may share their boundary day (the newer wins it); the site shows the sheet
// whose week has started last (currentSheet(), in the browser). Server-only: rows marked not public must never reach
// a client bundle, so client components get what they need as props, never these modules.
export const serviceSheets: ServiceSheet[] = [];

/**
 * Hand-entered changes after the last sheet, as soon as the parish announces them: each replaces its whole day
 * (`services: []` cancels it). `scheduleExceptions()` puts them after the sheets' days and drops the ones a sheet
 * covers or that are past.
 */
export const laterExceptions: ScheduleException[] = [];
```

Write `scripts/generate-sheet.tmp.ts` (a temporary helper in the repo so `./` and `@/` imports resolve; deleted in
Step 4, never committed):

```ts
import { readFileSync } from "node:fs";
import { formatFiles, NEWS_DIR } from "./add-aktualita";
import { addOhlasky, OHLASKY_DIR } from "./add-ohlasky";

async function main() {
  const { week, record } = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const result = addOhlasky(OHLASKY_DIR, NEWS_DIR, record, week);
  await formatFiles(result.written);
  console.log(result.written.join("\n"));
}
void main();
```

Run: `pnpm exec tsx scripts/generate-sheet.tmp.ts <scratchpad>/sheet.json`
Expected: prints `…/src/content/ohlasky/2026-10-04.ts` and `…/src/content/ohlasky/index.ts`; the index now imports
`sheet20261004` and lists it in `serviceSheets`.

- [ ] **Step 3: Move the content test and point it at the sheets**

`git mv src/content/ohlasky.test.ts src/content/ohlasky/ohlasky.test.ts`, then replace its contents with:

```ts
import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { serviceSheetSchema } from "@/lib/services/schema";
import { sheetOrderProblems } from "@/lib/services/service-sheet";
import { events } from "@/content/news";
import { isClock, isIsoDate, isPlaceId, isSorted } from "@/content/test-helpers";
import { laterExceptions, serviceSheets } from "./index";

vi.mock("server-only", () => ({}));

describe("Ohlášky (ohlasky/)", () => {
  it("has at least one sheet, in order, sharing at most their boundary days", () => {
    expect(serviceSheets.length).toBeGreaterThan(0);
    expect(sheetOrderProblems(serviceSheets)).toEqual([]);
  });

  // The rules of one sheet (every day of its period, times, row order, the PDF link, unknown fields) are the
  // schema's, shared with the stage script; failures name the field.
  it.each(serviceSheets.map((s) => [s.validFrom, s] as const))("%s matches the sheet schema", (_, sheet) => {
    const result = serviceSheetSchema.safeParse(sheet);
    expect(result.success, result.error && z.prettifyError(result.error)).toBe(true);
  });

  it("links announcements to existing Aktuality", () => {
    const ids = new Set(events.map((e) => e.id));
    const missing = serviceSheets.flatMap((s) => s.announcements.filter((a) => a.newsId && !ids.has(a.newsId)));
    expect(missing.map((a) => a.newsId)).toEqual([]);
  });

  it("has valid hand-entered exceptions after the last sheet, one per date, in order", () => {
    // The sheets replace a covered entry anyway: remove it when the stage script names it.
    const lastDay = serviceSheets.at(-1)!.validTo;
    expect(laterExceptions.every((x) => x.date > lastDay)).toBe(true);
    expect(isSorted(laterExceptions, (a, b) => a.date < b.date)).toBe(true);
    for (const x of laterExceptions) {
      expect(isIsoDate(x.date), x.date).toBe(true);
      expect(
        x.services.every((m) => isClock(m.time) && isPlaceId(m.place)),
        x.date,
      ).toBe(true);
    }
  });
});
```

- [ ] **Step 4: Switch the consumers, remove the old module and `massRow`**

`git rm src/content/ohlasky.ts` and delete `scripts/generate-sheet.tmp.ts`.

`src/server/services.ts`:

```ts
import "server-only";
import { places } from "@/content/masses";
import { laterExceptions, serviceSheets } from "@/content/ohlasky";
import { currentSheet, scheduleExceptions } from "@/lib/services/service-sheet";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { pragueDate } from "@/lib/shared/prague";
import type { PlaceId } from "@/content/types/services";

// The schedule derived from the ohlášky, for the pages that need it at build time.

/**
 * Every sheet's days and the hand-entered `laterExceptions` as schedule exceptions (`scheduleExceptions()`): the
 * homepage countdown and the calendar fallback combine them with `regularServices`.
 */
export const currentExceptions = scheduleExceptions(serviceSheets, laterExceptions, Object.keys(places) as PlaceId[]);

/** The sheet current on the build day. */
export const buildSheet = currentSheet(serviceSheets, pragueDate(BUILD_TIME))!;
```

In `src/app/page.tsx`, `src/app/porad_bohosluzeb/page.tsx` and `src/components/layout/SiteHeader.tsx`, replace
`import { serviceSheet } from "@/content/ohlasky";` with `import { buildSheet } from "@/server/services";` (merge
with an existing `@/server/services` import in `page.tsx`) and rename `serviceSheet` → `buildSheet` in each file.

In `src/lib/services/service-sheet.ts`, delete `massRow` and its doc comment, and drop `SheetRow` and `ClockTime`
from the imports if nothing else uses them. In `src/lib/services/service-sheet.test.ts`, delete the
`describe("massRow", …)` block and `massRow` from the import.

- [ ] **Step 5: Verify**

Run: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`
Expected: all pass. Then compare the generated data with the old one:
`git show HEAD:src/content/ohlasky.ts | grep -c 'massRow('` equals
`grep -c 'mass: true' src/content/ohlasky/2026-10-04.ts` (each generated row is on its own line after Prettier;
if not, compare the counts with `grep -o`), and `grep -rl "massRow" src scripts` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add -A src/content/ohlasky src/content/ohlasky.ts src/content/ohlasky.test.ts src/server/services.ts src/app/page.tsx src/app/porad_bohosluzeb/page.tsx src/components/layout/SiteHeader.tsx src/lib/services/service-sheet.ts src/lib/services/service-sheet.test.ts
git commit -F - <<'EOF'
refactor(content): move the ohlášky into one generated file per sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Choose the current sheet in the browser

**Files:**

- Create: `src/components/services/CurrentSheet.tsx`
- Modify: `src/app/porad_bohosluzeb/page.tsx`, `src/components/layout/SiteHeader.tsx`,
  `src/components/home/NextMass.tsx`, `src/app/page.tsx`, `src/server/services.ts` (remove `buildSheet`)

**Interfaces:**

- Consumes: `currentSheet` (Task 1), `useToday(renderedAt: number): IsoDate` (`src/hooks/use-now.ts`),
  `serviceSheets` (Task 4).
- Produces: `CurrentSheet({ items: { validFrom: IsoDate; node: ReactNode }[]; renderedAt: number })`;
  `NextMass` prop `sheets: Pick<ServiceSheet, "pdfUrl" | "validFrom" | "validTo">[]` (replaces `sheet`).

- [ ] **Step 1: Create `CurrentSheet`**

`src/components/services/CurrentSheet.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import type { IsoDate } from "@/content/types/shared";
import { currentSheet } from "@/lib/services/service-sheet";
import { useToday } from "@/hooks/use-now";

type Props = {
  /** One server-rendered node per ohlášky sheet, sorted by `validFrom`. */
  items: { validFrom: IsoDate; node: ReactNode }[];
  renderedAt: number;
};

/**
 * Shows the node of the sheet valid today (`currentSheet()`): the build day's in the prerendered HTML and during
 * hydration, the visitor's day after load, so a sheet published in advance takes over without a rebuild.
 */
export function CurrentSheet({ items, renderedAt }: Props) {
  const today = useToday(renderedAt);
  return currentSheet(items, today)?.node ?? null;
}
```

- [ ] **Step 2: `/porad_bohosluzeb/`**

In `src/app/porad_bohosluzeb/page.tsx`: import `serviceSheets` from `@/content/ohlasky`, `CurrentSheet` from
`@/components/services/CurrentSheet` and `type ServiceSheet` from `@/content/types/services`; drop the `buildSheet`
import. Replace the `weekDays` constant with:

```tsx
// Only what is public reaches the page (and the client bundle), tagged "změna" where it differs from the regular
// schedule, with place names instead of IDs.
const shownDays = (sheet: ServiceSheet) =>
  publicDays(markChanges(sheet.days, regularServices)).map((day) => ({
    ...day,
    rows: day.rows.map((row) => ({ ...row, place: places[row.place as PlaceId]?.name ?? row.place })),
  }));
```

and replace the `OhlaskyPanel` and `WeekSchedule` lines with:

```tsx
<CurrentSheet
  renderedAt={BUILD_TIME}
  items={serviceSheets.map((sheet) => ({
    validFrom: sheet.validFrom,
    node: (
      <>
        <OhlaskyPanel sheet={sheet} newsHref={newsHref} />
        <WeekSchedule days={shownDays(sheet)} oneWeek={isOneWeek(sheet)} renderedAt={BUILD_TIME} />
      </>
    ),
  }))}
/>
```

- [ ] **Step 3: The header button**

In `src/components/layout/SiteHeader.tsx`: import `serviceSheets` from `@/content/ohlasky`, `CurrentSheet` from
`@/components/services/CurrentSheet` and `BUILD_TIME` from `@/lib/shared/build-time`; drop `buildSheet`. Replace the
`ButtonLink` of the PDF with:

```tsx
<CurrentSheet
  renderedAt={BUILD_TIME}
  items={serviceSheets.map((sheet) => ({
    validFrom: sheet.validFrom,
    node: (
      <ButtonLink href={sheet.pdfUrl} size="compact" className="max-md:hidden">
        <FileDownloadIcon size={18} />
        Ohlášky
      </ButtonLink>
    ),
  }))}
/>
```

- [ ] **Step 4: `NextMass`**

In `src/components/home/NextMass.tsx`: import `currentSheet` alongside `isOneWeek` and `useToday` alongside
`useHydrated, useNow`. Change the prop:

```tsx
/** Every ohlášky sheet (sorted by `validFrom`): the one valid today gives the PDF link and its dates. */
sheets: (Pick < ServiceSheet, "pdfUrl" | "validFrom" | ("validTo" > []));
```

In the function: destructure `sheets` instead of `sheet`, and add after `useHydrated()`:

```tsx
const sheet = currentSheet(sheets, useToday(renderedAt));
```

Wrap the PDF `ButtonLink` and the "Ohlášky … " paragraph in `{sheet && (<>…</>)}` (the two elements unchanged).

In `src/app/page.tsx`, import `serviceSheets` from `@/content/ohlasky`, drop `buildSheet`, and pass:

```tsx
sheets={serviceSheets.map(({ pdfUrl, validFrom, validTo }) => ({ pdfUrl, validFrom, validTo }))}
```

In `src/server/services.ts`, delete `buildSheet` and the imports only it used (`currentSheet`, `BUILD_TIME`,
`pragueDate`).

- [ ] **Step 5: Verify**

Run: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`
Expected: all pass; `grep -rn "buildSheet\|serviceSheet\b" src` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/components/services/CurrentSheet.tsx src/app/porad_bohosluzeb/page.tsx src/components/layout/SiteHeader.tsx src/components/home/NextMass.tsx src/app/page.tsx src/server/services.ts
git commit -F - <<'EOF'
feat(mass): show the ohlášky sheet valid today, chosen in the browser

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: `pnpm stage porad … --record`

**Files:**

- Modify: `scripts/stage-upload.ts` (header comment, `StageEnv`, `defaultEnv`, `stagePorad`, `USAGE`, `COMMANDS`,
  `runCommand`, `main`)
- Test: `scripts/stage-upload.test.ts`

**Interfaces:**

- Consumes: `addOhlasky`, `ohlaskyLines`, `OHLASKY_DIR` (Task 3); `formatAndTest(files, tests)` (Task 3).
- Produces: `stagePorad(env, options & { record?: Record<string, unknown> }): Promise<{ lines: string[]; written: string[] }>`;
  `StageEnv.ohlaskyDir: string`; `runCommand` returns `{ lines: string[]; format?: { files: string[]; tests: string }; event?: NewsEvent }`.

- [ ] **Step 1: Write the failing tests**

In `scripts/stage-upload.test.ts`:

- In `beforeEach`, after the news copy, add
  `cpSync(join(root, "src/content/ohlasky"), join(dir, "ohlasky"), { recursive: true });` and add
  `ohlaskyDir: join(dir, "ohlasky"),` to `env`.
- In the three existing `stagePorad` tests, read `.lines` from the result: `const { lines } = await stagePorad(…)`,
  `(await stagePorad(env, { ...week, rev: 2 })).lines[0]`, `(await stagePorad(env, { source, check: true })).lines[1]`.
- Add to `describe("stagePorad", …)`:

```ts
/** A record covering 2099-10-04 – 2099-10-11, after every real sheet, so the tests keep passing. */
const record = () => ({
  days: weekDays("2099-10-04", "2099-10-11").map((d) => ({ date: d.slice(3), rows: [] })),
  announcements: [{ category: "info", html: "<p>Sbírka.</p>" }],
});

it("adds the record as a sheet after staging the PDF", async () => {
  const source = download("porad.pdf", "%PDF");
  const { lines, written } = await stagePorad(env, {
    source,
    validFrom: "2099-10-04",
    validTo: "2099-10-11",
    record: record(),
  });
  expect(lines[0]).toBe("Staged uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf");
  expect(lines[1]).toBe("Added the sheet 2099-10-04 – 2099-10-11 to src/content/ohlasky/2099-10-04.ts");
  expect(written).toContain(join(dir, "ohlasky", "2099-10-04.ts"));
  expect(readFileSync(join(dir, "ohlasky", "2099-10-04.ts"), "utf8")).toContain(
    'pdfUrl: "/uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf"',
  );
});

it("stages nothing for a record it refuses, and only validates with check", async () => {
  const source = download("porad.pdf", "%PDF");
  const week = { source, validFrom: "2099-10-04", validTo: "2099-10-11" };
  await expect(stagePorad(env, { ...week, record: { ...record(), days: [] } })).rejects.toThrow("missing 2099-10-04");
  expect(existsSync(uploaded("porady_bohosluzeb"))).toBe(false);
  // The real sheets copied into the temp folder may add "Would remove …" lines in between: assert the ends only.
  const checked = await stagePorad(env, { ...week, record: record(), check: true });
  expect(checked.lines[0]).toBe("Would add the sheet 2099-10-04 – 2099-10-11 to src/content/ohlasky/2099-10-04.ts");
  expect(checked.lines.at(-1)).toBe("Would stage uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf");
  expect(existsSync(join(dir, "ohlasky", "2099-10-04.ts"))).toBe(false);
});
```

- In `describe("runCommand", …)` "parses each command's arguments", after the porad `--check` assertion add:

```ts
const sheetFile = join(dir, "sheet.json");
writeFileSync(
  sheetFile,
  JSON.stringify({
    days: weekDays("2099-10-04", "2099-10-11").map((d) => ({ date: d.slice(3), rows: [] })),
    announcements: [],
  }),
);
const sheet = await runCommand(env, [
  "porad",
  source,
  "--from",
  "2099-10-04",
  "--to",
  "2099-10-11",
  "--record",
  sheetFile,
]);
expect(sheet.format).toEqual({
  files: [join(dir, "ohlasky", "2099-10-04.ts"), join(dir, "ohlasky", "index.ts")],
  tests: "src/content/ohlasky",
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run scripts/stage-upload.test.ts`
Expected: FAIL (`ohlaskyDir` unknown to the type, `.lines` of an array, `record` ignored, `format` undefined).

- [ ] **Step 3: Implement**

In `scripts/stage-upload.ts`:

- Import `addOhlasky, ohlaskyLines, OHLASKY_DIR` from `./add-ohlasky`.
- `StageEnv`: add `ohlaskyDir: string;` after `newsDir`; `defaultEnv`: `ohlaskyDir: OHLASKY_DIR,`.
- `PoradOptions`: add `/** The confirmed sheet record (days and announcements), added to src/content/ohlasky/. */ record?: Record<string, unknown>;`
- Replace the end of `stagePorad` (from `const rel = …` on) with:

```ts
const rel = `porady_bohosluzeb/${validFrom}-porad-bohosluzeb${rev ? `-${rev}` : ""}.pdf`;
const hint = `this week is already published; for a corrected PDF pass --rev ${(rev ?? 1) + 1}`;
const sheetWeek = { pdfUrl: `/uploads/${rel}`, validFrom, validTo };
const lines: string[] = [];
// Validate before anything is copied, so a bad record leaves nothing staged.
if (options.record) {
  const checked = addOhlasky(env.ohlaskyDir, env.newsDir, options.record, sheetWeek, { check: true });
  if (check) lines.push(...ohlaskyLines(checked, true));
}
await stage(env, src, rel, check, hint);
lines.push(stagedLine(check, `uploads/${rel}`));
if (!options.record) {
  lines.push(
    `  pdfUrl: "/uploads/${rel}",\n  validFrom: "${validFrom}",\n  validTo: "${validTo}",`,
    `days: ${weekDays(validFrom, validTo).join(", ")}`,
  );
  return { lines, written: [] };
}
if (check) return { lines, written: [] };
const result = addOhlasky(env.ohlaskyDir, env.newsDir, options.record, sheetWeek);
lines.push(...ohlaskyLines(result, false));
return { lines, written: result.written };
```

and its doc comment: `/** Stages the weekly PDF and, with a record, adds the sheet; returns the lines to print and the files written. */`

- `USAGE` porad line: `pnpm stage porad <pdf> [--from YYYY-MM-DD --to YYYY-MM-DD] [--rev N] [--record <json>] [--check]`;
  `COMMANDS.porad.options`: add `"record"`.
- `runCommand`: read the JSON for both commands once:

```ts
const record = values.record ? (JSON.parse(readFileSync(values.record, "utf8")) as Record<string, unknown>) : undefined;
if (command === "aktualita") {
  const [source, id, label] = args;
  const result = await stageAktualita(env, {
    source,
    id,
    label,
    title: values.title,
    poster: values.poster,
    record,
    check,
  });
  const files = result.written.map((f) => join(env.newsDir, f));
  return { ...result, format: files.length > 0 ? { files, tests: "src/content/news" } : undefined };
}
if (command === "porad") {
  const rev = values.rev === undefined ? undefined : Number(values.rev);
  if (rev !== undefined && !(Number.isInteger(rev) && rev > 1)) throw new Error("--rev is a number from 2");
  const { lines, written } = await stagePorad(env, {
    source: args[0],
    validFrom: values.from,
    validTo: values.to,
    rev,
    record,
    check,
  });
  return { lines, format: written.length > 0 ? { files: written, tests: "src/content/ohlasky" } : undefined };
}
const lines = await stagePetrklic(env, { source: args[0], id: args[1], note: values.note, check });
return { lines };
```

- `main()`: `const { lines, format, event } = await runCommand(…)`; `if (format) await formatAndTest(format.files, format.tests);`
- Header comment, porad entry:

```
//   porad <pdf> [--from YYYY-MM-DD --to YYYY-MM-DD] [--rev N] [--record <record.json>]
//       reads the week from the heading ("od 4. 10. 2026 do 11. 10. 2026"), stages
//       uploads/porady_bohosluzeb/<validFrom>-porad-bohosluzeb[-<N>].pdf; prints pdfUrl, the week and its days.
//       --rev 2 names a corrected PDF of a week already on the server. --record adds the confirmed sheet (days and
//       announcements as JSON) to src/content/ohlasky/ and removes the outdated sheets (scripts/add-ohlasky.ts; with
//       --check it only validates the record).
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run scripts && pnpm exec tsc --noEmit && pnpm exec eslint scripts && pnpm exec prettier --check scripts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/stage-upload.ts scripts/stage-upload.test.ts
git commit -F - <<'EOF'
feat(scripts): add the ohlášky sheet with pnpm stage porad --record

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Skill, docs and verification

**Files:**

- Modify: `.claude/skills/farnost-create-porad-bohosluzeb/SKILL.md`, `.claude/rules/content-and-time.md`,
  `README.md:131`

- [ ] **Step 1: Update the skill**

In `.claude/skills/farnost-create-porad-bohosluzeb/SKILL.md`:

- Intro paragraph: "one `ServiceSheet` … in `src/content/ohlasky.ts` that replaces the previous week" →
  "one `ServiceSheet` (`src/content/types/services.ts`), generated into `src/content/ohlasky/<validFrom>.ts`. It can be
  published any day before its week: the site shows each sheet from its `validFrom` (the newer one on the Sunday two
  sheets share), and the script removes the sheets before the current one."
- Step 2 opening: say the agent writes the confirmed sheet as `record.json` in the session's scratchpad (never in the
  repo) with `days` and `announcements` only — `pdfUrl`, `validFrom` and `validTo` come from the PDF. Rows use the
  table's fields; a mass row is `{ "time", "place", "title": "Mše sv.", "detail", "mass": true }`. Replace the TS
  example in step 5 with this JSON example:

```json
{
  "days": [
    {
      "date": "2026-10-04",
      "feast": "27. neděle v mezidobí",
      "solemnity": true,
      "rows": [
        { "time": "8:00", "place": "kurim", "title": "Mše sv.", "detail": "za Jana Nováka", "mass": true },
        { "time": "11:00", "place": "kurim", "title": "Hodová mše sv.", "detail": "za obec Česká", "mass": true }
      ]
    }
  ],
  "announcements": [
    { "category": "smireni", "html": "<p>V Kuřimi se zpovídá ve čtvrtek od <strong>17.30</strong>.</p>" }
  ]
}
```

- Steps 4 and 5 become one step "Stage the PDF and add the sheet":
  `pnpm stage porad "<source>" --record <scratchpad>/record.json` (plus `--rev 2` for a corrected PDF of a published
  week, which replaces that week's sheet). It validates the record first (the error names each field), stages the
  PDF, writes the sheet file and the index, removes the outdated sheets, formats them and runs the ohlášky tests. When
  it names a `laterExceptions` entry the new sheet covers, remove that entry from `src/content/ohlasky/index.ts`.
  Run it with `--check` before confirming with the user to validate the record.
- "Later changes": `laterExceptions` are in `src/content/ohlasky/index.ts` and must be after the **last** sheet's
  `validTo`.
- Remove the "Rewrite `serviceSheet` …", `massRow`, `FOR_PARISHIONERS` and module-shape instructions and the TS
  example.
- Common mistakes: add "Putting `pdfUrl`, `validFrom` or `validTo` into `record.json`: the script reads them from the
  PDF." and "Editing a generated sheet file instead of staging a corrected record (`--rev 2`)."

- [ ] **Step 2: Update the rules and README**

`.claude/rules/content-and-time.md`, the "Ohlášky" bullet: replace `(content/ohlasky.ts, …): one ServiceSheet per week`
with `(content/ohlasky/, …): one generated ServiceSheet file per week (<validFrom>.ts, joined by index.ts with
laterExceptions), added in advance with pnpm stage porad … --record, which removes the sheets before the current one`;
replace "For every day from `validFrom` to `validTo` the sheet's …" with "For every day of every sheet (the newer sheet
wins the Sunday two sheets share) the `mass` and `service` rows …"; replace "after the week" with "after the last
sheet"; add "The site shows the sheet whose week has started last (`currentSheet()`), chosen in the browser by
`CurrentSheet` / `NextMass` from the build day's choice." Keep the rest (privacy, `public: false`, `markChanges()`).

`README.md:131`: `| `farnost-create-porad-bohosluzeb`| The weekly ohlášky PDF, into`ohlasky/` |` (Prettier
re-pads the table).

- [ ] **Step 3: Full check**

Run: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`
Expected: all pass.

- [ ] **Step 4: Browser check against the mockups**

Per `.claude/rules/design-check.md`: `pnpm preview` and `pnpm mockups`; compare `/` (home) and
`/porad_bohosluzeb/` (porad-bohosluzeb) at 390, 834 and 1440 px (viewport ~15 px wider), light and dark
(`prefers-color-scheme: dark`). Expected: no difference from before this change.

- [ ] **Step 5: Switch check with a temporary sheet (not committed)**

Write `<scratchpad>/next.json`: a record for 2026-10-11 – 2026-10-18 (8 days, each with one Kuřim mass at 8:00,
`detail: "TAJNY-UMYSL"` and `"public": false` on the 2026-10-12 row, one `info` announcement "<p>KONTROLA-PRISTI-TYDEN</p>").
Generate it with the Task 4 helper (`scripts/generate-sheet.tmp.ts`, recreated temporarily) and a `week` of
`{ "pdfUrl": "/uploads/porady_bohosluzeb/2026-10-11-porad-bohosluzeb.pdf", "validFrom": "2026-10-11", "validTo": "2026-10-18" }`,
then `pnpm build && pnpm preview`. With Playwright:

1. Default clock (build day 2026-10-09): `/porad_bohosluzeb/` shows "Ohlášky 4.–11. 10." and no
   "KONTROLA-PRISTI-TYDEN"; the header button links `2026-10-04-porad-bohosluzeb.pdf`.
2. `page.clock.setFixedTime(new Date("2026-10-11T09:00:00+02:00"))` before navigation (use
   `browser_run_code_unsafe`): after load `/porad_bohosluzeb/` shows the 11.–18. 10. ohlášky with
   "KONTROLA-PRISTI-TYDEN", the header button and the homepage `NextMass` link `2026-10-11-porad-bohosluzeb.pdf`,
   and the homepage countdown counts to the 2026-10-11 8:00 mass of the new sheet.
3. `grep -rl "TAJNY-UMYSL" out/` prints nothing (the hidden intention is in no exported file).

Then remove the temporary sheet: `git checkout src/content/ohlasky && git clean -f src/content/ohlasky scripts/generate-sheet.tmp.ts`
and confirm `git status` shows only the Task 7 doc changes.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/farnost-create-porad-bohosluzeb/SKILL.md .claude/rules/content-and-time.md README.md
git commit -F - <<'EOF'
docs(skills): publish the ohlášky in advance with a sheet record

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
