# Petrklíč as JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store the Petrklíč issues in `src/content/petrklic.json` as `{ year, number, note?, pageCount }`, checked by
a zod schema, and let `pnpm stage petrklic <pdf> --year --number [--note]` add the issue itself instead of printing a
line to paste.

**Architecture:** `src/lib/petrklic/issues.ts` computes the id (`issueId()`, with `slug()` from
`src/lib/shared/slug.ts`), the URLs (`toIssue()`) and the viewer pages; `src/lib/petrklic/schema.ts` holds the rules.
`src/content/petrklic.ts` loads and checks the JSON and keeps exporting `petrklicIssues`. `scripts/add-petrklic.ts`
inserts an issue, and `scripts/stage/petrklic.ts` checks it before staging and writes it after.

**Tech Stack:** Next.js 16 (static export), TypeScript, zod 4, vitest, tsx, poppler (`pdfinfo`, `pdftoppm`), pnpm.

**Spec:** `docs/superpowers/specs/2026-10-10-petrklic-json-design.md`

## Global Constraints

- Code, comments and commit messages in English; visible text in Czech (no UI text changes here).
- Conventional Commits, checked by commitlint (body lines ≤ 100 characters); never `--no-verify`. End every commit
  message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Use the `commit` skill.
- Imports: same folder `./x`, anything else `@/…` (no `../` in `src/`; `scripts/stage/` imports `../` as today).
- The site output must not change (same issues, ids, URLs, order, `PetrklicIssue` type).
- Comments and code lines ≤ 120 characters (`.prettierrc.json`); Prettier does not wrap comments or strings.
- No top-level `await` in scripts (tsx runs them as CommonJS).
- Do not edit `design/DESIGN.md` or older specs and plans.
- `<scratchpad>` is `/tmp/claude-1000/-home-ondrej-planer-Documents-farakurim/3d8338c3-55b9-4c30-be5b-3a42a131a59d/scratchpad`;
  `<scratchpad>/normalize-out.mjs` exists from the gallery work (it normalizes `out/` for a diff).
- Full check before calling work done: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`.
- The `stagePetrklic` tests run only with poppler installed (`describe.skipIf(!hasPoppler)`); it is installed here.

## Review Focus

- A note that slugs to nothing ("!!!", "–") would give an id ending in `-`: the schema refuses it (Task 2, "refuses
  a note without a letter or digit").
- A second part of an issue already in the file (same year and number, another note) goes before the older part,
  as 1/2012 is stored today (Task 3, "puts a new part before the older parts").
- An issue older than the current one is added but reported as not current, so nobody believes the site now shows
  it (Task 3, "inserts an older issue in order and says it is not current").
- A taken id stops `pnpm stage petrklic` before the PDF is copied to `uploads/`, so an abandoned folder cannot go out
  with the next release (Task 3, "stops on an issue already there before copying anything").
- `--year` or `--number` missing, not a whole number, or the old positional id: `wrong arguments` and the usage, not
  a NaN in the file (Task 3, CLI test).

---

## File Structure

| File                                                    | Change                                                                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/lib/shared/slug.ts`, `slug.test.ts`                | New: `slug()` moved from `scripts/add-album.ts` (Task 1)                                                         |
| `src/content/types/petrklic.ts`                         | `PetrklicRecord`, `PetrklicFile` (Task 2)                                                                        |
| `src/lib/petrklic/issues.ts`, `issues.test.ts`          | `FIRST_YEAR` exported, `issueId`, `toIssue`, `pageImages`, `isNewerIssue`; `parsePetrklicId` removed (Tasks 2–3) |
| `src/lib/petrklic/schema.ts`, `schema.test.ts`          | New (Task 2)                                                                                                     |
| `src/content/petrklic.json`                             | New: migrated data (Task 2)                                                                                      |
| `src/content/petrklic.ts`, `petrklic.test.ts`           | Loader, schema-based test (Task 2)                                                                               |
| `scripts/add-petrklic.ts`, `add-petrklic.test.ts`       | New (Task 3)                                                                                                     |
| `scripts/stage/petrklic.ts`, `cli.ts`, `core.ts`, tests | `--year`/`--number`, writes the issue (Task 3)                                                                   |
| `scripts/content-files.ts`, `scripts/test-helpers.ts`   | `PETRKLIC_FILE`, fixture copy (Task 3)                                                                           |
| Skill, rules, README, `scripts/upload-images.ts` header | Task 4                                                                                                           |

---

### Task 0: Baseline

**Files:** none in the repo.

- [ ] **Step 1: Build and keep the normalized output**

Run: `rm -rf <scratchpad>/out-before-p && pnpm build > <scratchpad>/build-before-p.log 2>&1 && node <scratchpad>/normalize-out.mjs out <scratchpad>/out-before-p`
Expected: a file count of several hundred.

- [ ] **Step 2: Keep the old issues** — write `<scratchpad>/dump-petrklic.mts`:

```ts
import { petrklicIssues } from "@/content/petrklic";
console.log(JSON.stringify(petrklicIssues));
```

Run: `pnpm exec tsx --tsconfig tsconfig.json <scratchpad>/dump-petrklic.mts > <scratchpad>/petrklic-before.json && node -e "console.log(require('<scratchpad>/petrklic-before.json').length)"`
Expected: `86`.

---

### Task 1: slug() in src/lib/shared

**Files:**

- Create: `src/lib/shared/slug.ts`, `src/lib/shared/slug.test.ts`
- Modify: `scripts/add-album.ts` (remove `slug`, import it), `scripts/add-album.test.ts` (remove the `slug` describe
  and its import)

**Interfaces:**

- Produces: `slug(text: string): string` from `@/lib/shared/slug`.

- [ ] **Step 1: Write the failing test** `src/lib/shared/slug.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { slug } from "./slug";

describe("slug", () => {
  it("is ASCII kebab-case", () => {
    expect(slug("Pěší pouť na Vranov")).toBe("pesi-pout-na-vranov");
    expect(slug("  Žehnání – náměstí! ")).toBe("zehnani-namesti");
    expect(slug("2. část")).toBe("2-cast");
    expect(slug("mimořádné")).toBe("mimoradne");
  });

  it("is empty without a letter or digit", () => {
    expect(slug("–!")).toBe("");
  });
});
```

- [ ] **Step 2: Run it** — `pnpm exec vitest run src/lib/shared/slug.test.ts`
      Expected: FAIL, `Cannot find module './slug'`.

- [ ] **Step 3: Write `src/lib/shared/slug.ts`** (the function body moved unchanged from `scripts/add-album.ts`):

```ts
// ASCII ids from Czech titles: the Fotogalerie album ids (scripts/add-album.ts) and the Petrklíč issue ids
// (issueId() in src/lib/petrklic/issues.ts).

/** "Pouť na Vranov" → "pout-na-vranov", "2. část" → "2-cast"; empty without a letter or digit. */
export const slug = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\P{ASCII}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
```

In `scripts/add-album.ts` delete the `/** "Pouť na Vranov" → "pout-na-vranov" */ export const slug = …;` block and add
`import { slug } from "@/lib/shared/slug";` after the `@/lib/gallery/schema` import. In `scripts/add-album.test.ts`
delete the `describe("slug", …)` block and `slug,` from the `./add-album` import.

- [ ] **Step 4: Run** — `pnpm exec vitest run src/lib/shared/slug.test.ts scripts/add-album.test.ts && pnpm exec tsc --noEmit`
      Expected: PASS, no type errors.

- [ ] **Step 5: Commit** (stage the four files):

```
refactor(lib): move slug() to src/lib/shared for the album and Petrklíč ids

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 2: Rules, data and loader

**Files:**

- Create: `src/lib/petrklic/schema.ts`, `src/lib/petrklic/schema.test.ts`, `src/content/petrklic.json`
- Modify: `src/content/types/petrklic.ts`, `src/lib/petrklic/issues.ts`, `src/lib/petrklic/issues.test.ts`,
  `src/content/petrklic.ts` (rewritten top), `src/content/petrklic.test.ts` (rewritten)

**Interfaces:**

- Consumes: `slug` (Task 1).
- Produces: types `PetrklicRecord`, `PetrklicFile` (`@/content/types/petrklic`); from `@/lib/petrklic/issues`:
  `FIRST_YEAR`, `issueId(record: Pick<PetrklicRecord, "year" | "number" | "note">): string`,
  `toIssue(record: PetrklicRecord): PetrklicIssue`, `pageImages(issue: Pick<PetrklicIssue, "id" | "pageCount">):
string[]`, `isNewerIssue(a, b: Pick<PetrklicRecord, "year" | "number">): boolean`; from `@/lib/petrklic/schema`:
  `petrklicRecordSchema`, `petrklicFileSchema`. `petrklicIssues` unchanged.

- [ ] **Step 1: Types.** In `src/content/types/petrklic.ts` change `// Petrklíč (petrklic.ts): the parish newsletter.`
      to `// Petrklíč (petrklic.json): the parish newsletter.` and append:

```ts
/**
 * One issue as stored in src/content/petrklic.json: what cannot be computed. The id, the file URLs and the viewer
 * pages are computed (toIssue() in src/lib/petrklic/issues.ts).
 */
export type PetrklicRecord = Pick<PetrklicIssue, "year" | "number" | "note" | "pageCount">;

/** src/content/petrklic.json: the issues, newest first; the first is the current issue. */
export type PetrklicFile = {
  issues: PetrklicRecord[];
};
```

- [ ] **Step 2: Write the failing lib tests.** Append to `src/lib/petrklic/issues.test.ts`, and add `isNewerIssue`,
      `issueId`, `pageImages` and `toIssue` to its `./issues` import:

```ts
describe("issueId", () => {
  it("is the year and number, with the note's slug for a special issue", () => {
    expect(issueId({ year: 2026, number: 2 })).toBe("2026-2");
    expect(issueId({ year: 2012, number: 4, note: "mimořádné" })).toBe("2012-4-mimoradne");
    expect(issueId({ year: 2012, number: 1, note: "2. část" })).toBe("2012-1-2-cast");
  });
});

describe("toIssue", () => {
  it("adds the id and the URLs of the PDF and the cover", () => {
    expect(toIssue({ year: 2026, number: 1, pageCount: 36 })).toEqual({
      id: "2026-1",
      year: 2026,
      number: 1,
      pageCount: 36,
      pdfUrl: "/uploads/petrklic/2026-1/petrklic-2026-1.pdf",
      cover: "/uploads/petrklic/2026-1/cover.webp",
    });
    expect(toIssue({ year: 2012, number: 4, note: "mimořádné", pageCount: 4 })).toMatchObject({
      id: "2012-4-mimoradne",
      note: "mimořádné",
      pdfUrl: "/uploads/petrklic/2012-4-mimoradne/petrklic-2012-4-mimoradne.pdf",
    });
  });
});

describe("pageImages", () => {
  it("lists one image per page", () => {
    expect(pageImages({ id: "2026-1", pageCount: 2 })).toEqual([
      "/uploads/petrklic/2026-1/pages/1.webp",
      "/uploads/petrklic/2026-1/pages/2.webp",
    ]);
  });
});

describe("isNewerIssue", () => {
  it("compares the year, then the number", () => {
    expect(isNewerIssue({ year: 2026, number: 1 }, { year: 2025, number: 4 })).toBe(true);
    expect(isNewerIssue({ year: 2026, number: 2 }, { year: 2026, number: 1 })).toBe(true);
    expect(isNewerIssue({ year: 2026, number: 1 }, { year: 2026, number: 1 })).toBe(false);
    expect(isNewerIssue({ year: 2025, number: 4 }, { year: 2026, number: 1 })).toBe(false);
  });
});
```

Write `src/lib/petrklic/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { PetrklicRecord } from "@/content/types/petrklic";
import { petrklicFileSchema, petrklicRecordSchema } from "./schema";

const record = (fields: Partial<PetrklicRecord> = {}): PetrklicRecord => ({
  year: 2026,
  number: 1,
  pageCount: 36,
  ...fields,
});

/** The paths of the problems zod found. */
const problemPaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.success ? [] : result.error!.issues.map((issue) => issue.path.join("."));

describe("petrklicRecordSchema", () => {
  it("accepts an issue, with and without a note", () => {
    expect(petrklicRecordSchema.parse(record())).toEqual(record());
    expect(petrklicRecordSchema.parse(record({ note: "mimořádné" }))).toEqual(record({ note: "mimořádné" }));
  });

  it.each<[string, Partial<PetrklicRecord>, string]>([
    ["a year before the first volume", { year: 2005 }, "year"],
    ["a year that is not whole", { year: 2026.5 }, "year"],
    ["number 0", { number: 0 }, "number"],
    ["no pages", { pageCount: 0 }, "pageCount"],
    ["an empty note", { note: " " }, "note"],
    ["a note without a letter or digit", { note: "–!" }, "note"],
  ])("refuses %s", (_, fields, path) => {
    expect(problemPaths(petrklicRecordSchema.safeParse(record(fields)))).toContain(path);
  });

  it("refuses an unknown field", () => {
    expect(petrklicRecordSchema.safeParse({ ...record(), id: "2026-1" }).success).toBe(false);
  });
});

describe("petrklicFileSchema", () => {
  const issues = (...list: PetrklicRecord[]) => ({ issues: list });

  it("accepts issues newest first, two parts of one issue too", () => {
    expect(petrklicFileSchema.safeParse(issues(record({ number: 2 }), record())).success).toBe(true);
    const parts = issues(record({ note: "2. část" }), record({ note: "1. část" }), record({ year: 2025, number: 4 }));
    expect(petrklicFileSchema.safeParse(parts).success).toBe(true);
  });

  it("refuses issues out of order", () => {
    expect(problemPaths(petrklicFileSchema.safeParse(issues(record(), record({ number: 2 }))))).toEqual(["issues.1"]);
  });

  it("refuses a taken id, also two parts with the same note", () => {
    expect(problemPaths(petrklicFileSchema.safeParse(issues(record(), record())))).toEqual(["issues.1"]);
    const same = issues(record({ note: "1. část" }), record({ note: "1. Část" }));
    expect(problemPaths(petrklicFileSchema.safeParse(same))).toEqual(["issues.1"]);
  });
});
```

- [ ] **Step 3: Run them** — `pnpm exec vitest run src/lib/petrklic`
      Expected: FAIL (`issueId` / `toIssue` are not exported, `./schema` cannot be resolved).

- [ ] **Step 4: Implement.** In `src/lib/petrklic/issues.ts`: export `FIRST_YEAR` (`export const FIRST_YEAR = 2006;`),
      add `PetrklicRecord` to the type import, import `slug` (`import { slug } from "@/lib/shared/slug";`), and add
      after `issueLabel`:

```ts
/** "2026-2", or "2012-4-mimoradne" with a note: names the issue's upload folder and PDF. */
export const issueId = ({ year, number, note }: Pick<PetrklicRecord, "year" | "number" | "note">) =>
  `${year}-${number}${note ? `-${slug(note)}` : ""}`;

const issueDir = (id: string) => `/uploads/petrklic/${id}`;

/** The full issue of a stored record: its id and the URLs of its PDF and cover. */
export function toIssue(record: PetrklicRecord): PetrklicIssue {
  const id = issueId(record);
  return { id, ...record, pdfUrl: `${issueDir(id)}/petrklic-${id}.pdf`, cover: `${issueDir(id)}/cover.webp` };
}

/** The viewer's page images (only the current issue has them). */
export const pageImages = (issue: Pick<PetrklicIssue, "id" | "pageCount">) =>
  Array.from({ length: issue.pageCount }, (_, i) => `${issueDir(issue.id)}/pages/${i + 1}.webp`);

/** `a` is newer than `b`: a later year, or a higher number in the same year. */
export const isNewerIssue = (a: Pick<PetrklicRecord, "year" | "number">, b: Pick<PetrklicRecord, "year" | "number">) =>
  a.year > b.year || (a.year === b.year && a.number > b.number);
```

Keep `parsePetrklicId()` for now (the stage script uses it until Task 3).

Write `src/lib/petrklic/schema.ts`:

```ts
import * as z from "zod";
import type { PetrklicFile, PetrklicRecord } from "@/content/types/petrklic";
import { slug } from "@/lib/shared/slug";
import { FIRST_YEAR, isNewerIssue, issueId, issueLabel } from "./issues";

// The rules of the Petrklíč issues, in one place: src/content/petrklic.ts checks src/content/petrklic.json with them
// when the site loads it, and scripts/add-petrklic.ts checks a new issue and the file before `pnpm stage petrklic`
// copies its PDF.

const count = z.int().positive();

export const petrklicRecordSchema = z.strictObject({
  year: z.int().min(FIRST_YEAR, `must be ${FIRST_YEAR} or later (the first volume)`),
  number: count,
  // The note is part of the id ("2012-4-mimoradne"), so it needs a letter or digit.
  note: z
    .string()
    .trim()
    .min(1)
    .refine((note) => slug(note) !== "", "must contain a letter or digit")
    .optional(),
  pageCount: count,
}) satisfies z.ZodType<PetrklicRecord>;

export const petrklicFileSchema = z
  .strictObject({ issues: z.array(petrklicRecordSchema) })
  .superRefine(({ issues }, ctx) => {
    issues.forEach((issue, i) => {
      const id = issueId(issue);
      if (issues.slice(0, i).some((other) => issueId(other) === id)) {
        ctx.addIssue({ code: "custom", path: ["issues", i], message: `the id ${id} is already taken` });
      }
      if (i > 0 && isNewerIssue(issue, issues[i - 1])) {
        ctx.addIssue({
          code: "custom",
          path: ["issues", i],
          message: `must not be newer than the issue before it (${issueLabel(issues[i - 1])}): newest first`,
        });
      }
    });
  }) satisfies z.ZodType<PetrklicFile>;
```

- [ ] **Step 5: Run** — `pnpm exec vitest run src/lib/petrklic`
      Expected: PASS. (If `"1. Část"` and `"1. část"` give different slugs, the "same note" case is wrong: both slug
      to `1-cast`, so it must report `issues.1`.)

- [ ] **Step 6: Migrate.** Write `<scratchpad>/migrate-petrklic.mts` and run it once (not committed):

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { petrklicFileSchema } from "@/lib/petrklic/schema";

type Old = { year: number; number: number; note?: string; pageCount: number };
const old = JSON.parse(readFileSync(process.argv[2], "utf8")) as Old[];
const issues = old.map(({ year, number, note, pageCount }) => ({ year, number, ...(note && { note }), pageCount }));
const data = petrklicFileSchema.parse({ issues });
writeFileSync("src/content/petrklic.json", `${JSON.stringify(data, null, 2)}\n`);
console.log(`${data.issues.length} issues`);
```

Run: `pnpm exec tsx --tsconfig tsconfig.json <scratchpad>/migrate-petrklic.mts <scratchpad>/petrklic-before.json && pnpm exec prettier --write src/content/petrklic.json`
Expected: `86 issues`.

- [ ] **Step 7: Rewrite the loader.** In `src/content/petrklic.ts` replace everything from the first line through
      `current.pageImages = …;` with:

```ts
import * as z from "zod";
import type { PetrklicIssue } from "@/content/types/petrklic";
import { pageImages, toIssue } from "@/lib/petrklic/issues";
import { petrklicFileSchema } from "@/lib/petrklic/schema";
import data from "./petrklic.json";

// The Petrklíč issues (src/content/petrklic.json, added by `pnpm stage petrklic`, farnost-create-petrklic skill):
// the old site's archive (farakurim.cz/petrklic/archiv) and the new issues, newest first. Each issue is a folder
// /uploads/petrklic/<id>/ with petrklic-<id>.pdf, cover.webp and, for the current issue, pages/<n>.webp, rendered from
// the PDF; the id and the URLs are computed (toIssue()). Checked on import, so a broken file fails the build naming
// the field.

const parsed = petrklicFileSchema.safeParse(data);
if (!parsed.success) throw new Error(`src/content/petrklic.json is not valid:\n${z.prettifyError(parsed.error)}`);

/** Newest first; the first one is the current issue (aktuální číslo), with its pages for the viewer. */
export const petrklicIssues: PetrklicIssue[] = parsed.data.issues.map((record, i) => {
  const issue = toIssue(record);
  return i === 0 ? { ...issue, pageImages: pageImages(issue) } : issue;
});
```

Keep `petrklicTexts` and `petrklicEditorial` below it unchanged.

- [ ] **Step 8: Rewrite the content test** `src/content/petrklic.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as z from "zod";
import { petrklicFileSchema, petrklicRecordSchema } from "@/lib/petrklic/schema";
import { UPLOAD } from "@/lib/test/content-checks";
import { petrklicIssues } from "./petrklic";
import data from "./petrklic.json";

const problems = (result: z.ZodSafeParseResult<unknown>) => (result.success ? "" : z.prettifyError(result.error));

describe("Petrklíč (petrklic.json)", () => {
  it.each(data.issues.map((record, i) => [petrklicIssues[i].id, record] as const))(
    "issue %s matches the schema",
    (_, record) => {
      expect(problems(petrklicRecordSchema.safeParse(record))).toBe("");
    },
  );

  it("has unique ids, newest first", () => {
    expect(problems(petrklicFileSchema.safeParse(data))).toBe("");
  });

  it("has uploaded files and a page image per page of the current issue", () => {
    for (const i of petrklicIssues) {
      expect(i.pdfUrl, i.id).toMatch(UPLOAD);
      if (i.cover) expect(i.cover, i.id).toMatch(UPLOAD);
    }
    expect(petrklicIssues[0].pageImages).toHaveLength(petrklicIssues[0].pageCount);
    expect(petrklicIssues.slice(1).every((i) => i.pageImages === undefined)).toBe(true);
  });
});
```

- [ ] **Step 9: Check the migration** — write `<scratchpad>/check-petrklic.mts`:

```ts
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { petrklicIssues } from "@/content/petrklic";

const before = JSON.parse(readFileSync(process.argv[2], "utf8"));
console.log(isDeepStrictEqual(petrklicIssues, before) ? "SAME" : "DIFFERENT");
```

Run: `pnpm exec tsx --tsconfig tsconfig.json <scratchpad>/check-petrklic.mts <scratchpad>/petrklic-before.json`
Expected: `SAME` (ids, URLs, notes, order and the current issue's `pageImages`).

- [ ] **Step 10: Run** — `pnpm format && pnpm exec vitest run src/content/petrklic.test.ts src/lib/petrklic src/lib/shared && pnpm exec tsc --noEmit && pnpm lint`
      Expected: PASS, no errors.

- [ ] **Step 11: Commit** (stage the types, `src/lib/petrklic/issues.ts`, `issues.test.ts`, `schema.ts`,
      `schema.test.ts`, `src/content/petrklic.json`, `petrklic.ts`, `petrklic.test.ts`):

```
refactor(content): store the Petrklíč issues as petrklic.json

An issue stores only year, number, note and pageCount; issueId() and toIssue() compute the
id, the URLs and the current issue's pages, and petrklicFileSchema checks the file on load.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 3: The stage command writes the issue

**Files:**

- Create: `scripts/add-petrklic.ts`, `scripts/add-petrklic.test.ts`
- Modify: `scripts/content-files.ts`, `scripts/test-helpers.ts`, `scripts/stage/core.ts`, `scripts/stage/petrklic.ts`,
  `scripts/stage/petrklic.test.ts`, `scripts/stage/cli.ts`, `scripts/stage/cli.test.ts`,
  `src/lib/petrklic/issues.ts` and `issues.test.ts` (remove `parsePetrklicId`)

**Interfaces:**

- Consumes: Task 2's schema and `issues.ts` functions.
- Produces: `PETRKLIC_FILE`; `StageEnv.petrklicFile`; `readPetrklic(file): PetrklicFile`;
  `addPetrklic(file, input: unknown, { check }?): { record: PetrklicRecord; id: string; position: number; written:
string[] }`; `petrklicLines(result, check): string[]`; `stagePetrklic(env, { source, year, number, note?, check? }):
Promise<{ lines: string[]; written: string[] }>`.

- [ ] **Step 1: Write the failing `scripts/add-petrklic.test.ts`**:

```ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PetrklicRecord } from "@/content/types/petrklic";
import { issueId } from "@/lib/petrklic/issues";
import { addPetrklic, petrklicLines, readPetrklic } from "./add-petrklic";

const record = (year: number, number: number, fields: Partial<PetrklicRecord> = {}): PetrklicRecord => ({
  year,
  number,
  pageCount: 24,
  ...fields,
});

describe("addPetrklic on a temp petrklic.json", () => {
  let dir: string;
  let file: string;
  const save = (issues: PetrklicRecord[]) => writeFileSync(file, `${JSON.stringify({ issues }, null, 2)}\n`);
  const raw = () => readFileSync(file, "utf8");
  const ids = () => readPetrklic(file).issues.map(issueId);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "petrklic-"));
    file = join(dir, "petrklic.json");
    save([record(2026, 1), record(2025, 4), record(2025, 3)]);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("puts the next issue first, as the current one", () => {
    const result = addPetrklic(file, record(2026, 2, { pageCount: 36 }));
    expect(ids()).toEqual(["2026-2", "2026-1", "2025-4", "2025-3"]);
    expect(result).toMatchObject({ id: "2026-2", position: 1, written: [file] });
    expect(petrklicLines(result, false)).toEqual([
      "Added 2/2026 (36 pages) at position 1 in src/content/petrklic.json (the current issue)",
    ]);
  });

  it("inserts an older issue in order and says it is not current", () => {
    const result = addPetrklic(file, record(2025, 3, { note: "mimořádné" }));
    expect(ids()).toEqual(["2026-1", "2025-4", "2025-3-mimoradne", "2025-3"]);
    expect(petrklicLines(result, false)).toEqual([
      "Added 3/2025 (mimořádné) (24 pages) at position 3 in src/content/petrklic.json" +
        " (not the current issue: newer issues come first)",
    ]);
  });

  it("puts a new part before the older parts", () => {
    save([record(2012, 1, { note: "1. část" })]);
    addPetrklic(file, record(2012, 1, { note: "2. část" }));
    expect(ids()).toEqual(["2012-1-2-cast", "2012-1-1-cast"]);
  });

  it("refuses an issue already there and an invalid one", () => {
    expect(() => addPetrklic(file, record(2025, 4))).toThrow("the issue 2025-4 is already in petrklic.json");
    expect(() => addPetrklic(file, record(2026, 0))).toThrow(/the issue is not valid/);
  });

  it("only says what it would do with check", () => {
    const before = raw();
    const result = addPetrklic(file, record(2026, 2), { check: true });
    expect(result).toMatchObject({ position: 1, written: [] });
    expect(petrklicLines(result, true)[0]).toMatch(/^Would add 2\/2026 /);
    expect(raw()).toBe(before);
  });

  it("stops on a broken petrklic.json, also with check, and leaves it unchanged", () => {
    writeFileSync(file, '{ "issues": [');
    expect(() => addPetrklic(file, record(2026, 2))).toThrow(/petrklic\.json is not valid JSON/);
    save([record(2025, 4), record(2026, 1)]);
    const before = raw();
    expect(() => addPetrklic(file, record(2026, 2), { check: true })).toThrow(/petrklic\.json is not valid:\n/);
    expect(raw()).toBe(before);
  });
});
```

- [ ] **Step 2: Run** — `pnpm exec vitest run scripts/add-petrklic.test.ts`
      Expected: FAIL, `./add-petrklic` cannot be resolved.

- [ ] **Step 3: Write `scripts/add-petrklic.ts`**:

```ts
// Adds a Petrklíč issue to src/content/petrklic.json for `pnpm stage petrklic` (scripts/stage/petrklic.ts,
// farnost-create-petrklic skill): newest first, before the issues it is not older than. The issue's rules are
// petrklicRecordSchema's (src/lib/petrklic/schema.ts); its id and URLs are computed (toIssue()).

import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import * as z from "zod";
import type { PetrklicFile, PetrklicRecord } from "@/content/types/petrklic";
import { isNewerIssue, issueId, issueLabel } from "@/lib/petrklic/issues";
import { petrklicFileSchema, petrklicRecordSchema } from "@/lib/petrklic/schema";

/** The issues in `file`, checked by petrklicFileSchema; a broken file throws, naming it. */
export function readPetrklic(file: string): PetrklicFile {
  const name = relative(process.cwd(), file);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${name} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }
  const parsed = petrklicFileSchema.safeParse(data);
  if (!parsed.success) throw new Error(`${name} is not valid:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

export type AddPetrklicResult = {
  record: PetrklicRecord;
  id: string;
  /** 1-based, newest first: 1 is the current issue. */
  position: number;
  /** The file written, for formatAndTest; empty with `check`. */
  written: string[];
};

/**
 * Adds `input` (year, number, note, pageCount) to `file` before the first issue it is not older than (a new part
 * goes before the older parts) and returns what it did; `check` only validates. Throws before writing anything.
 */
export function addPetrklic(file: string, input: unknown, { check = false } = {}): AddPetrklicResult {
  const parsed = petrklicRecordSchema.safeParse(input);
  if (!parsed.success) throw new Error(`the issue is not valid:\n${z.prettifyError(parsed.error)}`);
  const record = parsed.data;
  const id = issueId(record);
  const { issues } = readPetrklic(file);
  if (issues.some((issue) => issueId(issue) === id)) throw new Error(`the issue ${id} is already in petrklic.json`);
  const at = issues.findIndex((issue) => !isNewerIssue(issue, record));
  const list = at === -1 ? [...issues, record] : issues.toSpliced(at, 0, record);
  if (!check) writeFileSync(file, `${JSON.stringify({ issues: list } satisfies PetrklicFile, null, 2)}\n`);
  return { record, id, position: list.indexOf(record) + 1, written: check ? [] : [file] };
}

/** The line the stage command prints for `result`. */
export function petrklicLines({ record, position }: AddPetrklicResult, check: boolean): string[] {
  const where = position === 1 ? "the current issue" : "not the current issue: newer issues come first";
  const added = `${check ? "Would add" : "Added"} ${issueLabel(record)} (${record.pageCount} pages)`;
  return [`${added} at position ${position} in src/content/petrklic.json (${where})`];
}
```

(The inserted list cannot break `petrklicFileSchema`: the id is new and the position keeps the order, so it is not
parsed again.)

- [ ] **Step 4: Run** — `pnpm exec vitest run scripts/add-petrklic.test.ts`
      Expected: PASS.

- [ ] **Step 5: Wire the environment.** `scripts/content-files.ts`: after `GALLERY_FILE` add
      `export const PETRKLIC_FILE = join(ROOT, "src/content/petrklic.json");` and add `add-petrklic` to the header's
      list of scripts (wrap the comment at 120). `scripts/stage/core.ts`: `StageEnv` gains
      `petrklicFile: string;` after `ohlaskyFile`, `defaultEnv()` gains `petrklicFile: PETRKLIC_FILE,`, and the
      `./content-files` import (or `../content-files`, as the file has it) gains `PETRKLIC_FILE`.
      `scripts/test-helpers.ts`: import `PETRKLIC_FILE` with `NEWS_DIR, OHLASKY_FILE`; in `useStageFixture()`'s
      `beforeEach` add `cpSync(PETRKLIC_FILE, join(dir, "petrklic.json"));`, add
      `petrklicFile: join(dir, "petrklic.json"),` to the `Object.assign`, and name petrklic.json in its doc comment
      (A temp uploads/, news/, ohlasky.json, petrklic.json and home …).

- [ ] **Step 6: Write the failing stage tests.** Replace the body of `scripts/stage/petrklic.test.ts` with:

```ts
import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { issueId } from "@/lib/petrklic/issues";
import { readPetrklic } from "../add-petrklic";
import { stagePetrklic } from "./petrklic";
import { hasPoppler, pdfWithText, useStageFixture } from "../test-helpers";

describe.skipIf(!hasPoppler)("stagePetrklic", { timeout: 30_000 }, () => {
  const { env, download, uploaded } = useStageFixture();
  const firstId = () => issueId(readPetrklic(env.petrklicFile).issues[0]);

  it("stages the PDF with its cover and pages and adds the issue", async () => {
    const source = download("Petrklic.pdf", pdfWithText(["Petrklic", "Strana 2"]));
    const options = { source, year: 2099, number: 3, note: "Mimořádné" };
    expect(await stagePetrklic(env, { ...options, check: true })).toEqual({
      lines: [
        "Would stage uploads/petrklic/2099-3-mimoradne/ (PDF), 2 pages",
        "Would add 3/2099 (Mimořádné) (2 pages) at position 1 in src/content/petrklic.json (the current issue)",
      ],
      written: [],
    });
    expect(firstId()).not.toBe("2099-3-mimoradne");
    const result = await stagePetrklic(env, options);
    expect(result).toEqual({
      lines: [
        "Staged uploads/petrklic/2099-3-mimoradne/ (PDF, cover.webp, pages/), 2 pages",
        "Added 3/2099 (Mimořádné) (2 pages) at position 1 in src/content/petrklic.json (the current issue)",
      ],
      written: [env.petrklicFile],
    });
    expect(firstId()).toBe("2099-3-mimoradne");
    expect(readdirSync(uploaded("petrklic", "2099-3-mimoradne")).sort()).toEqual([
      "cover.webp",
      "pages",
      "petrklic-2099-3-mimoradne.pdf",
    ]);
    expect(readdirSync(uploaded("petrklic", "2099-3-mimoradne", "pages")).sort()).toEqual(["1.webp", "2.webp"]);
  });

  it("stops on an issue already there before copying anything", async () => {
    const source = download("Petrklic.pdf", pdfWithText(["Petrklic"]));
    const { year, number, note } = readPetrklic(env.petrklicFile).issues[0];
    await expect(stagePetrklic(env, { source, year, number, note })).rejects.toThrow(/is already in petrklic\.json/);
    expect(existsSync(env.uploadsDir) ? readdirSync(env.uploadsDir) : []).toEqual([]);
  });
});
```

In `scripts/stage/cli.test.ts`, add to the "refuses missing arguments…" test:

```ts
await expect(runCommand(env, ["petrklic", "a.pdf", "--year", "2026"])).rejects.toThrow("wrong arguments");
await expect(runCommand(env, ["petrklic", "a.pdf", "--year", "2026.5", "--number", "1"])).rejects.toThrow(
  "wrong arguments",
);
await expect(runCommand(env, ["petrklic", "a.pdf", "2026-1"])).rejects.toThrow("wrong arguments");
```

Run: `pnpm exec vitest run scripts/stage/petrklic.test.ts scripts/stage/cli.test.ts`
Expected: FAIL (`stagePetrklic` still takes an id and returns lines; the `--year` cases are not refused).

- [ ] **Step 7: Rewrite `scripts/stage/petrklic.ts`**:

```ts
// `pnpm stage petrklic` (scripts/stage/cli.ts): checks the issue (scripts/add-petrklic.ts), stages its PDF as
// uploads/petrklic/<id>/petrklic-<id>.pdf, renders cover.webp and pages/ (scripts/upload-images.ts) and adds the
// issue to src/content/petrklic.json.

import { dirname, extname } from "node:path";
import { addPetrklic, petrklicLines } from "../add-petrklic";
import { MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";
import { pdfPageCount, renderPetrklic } from "../upload-images";

export interface PetrklicOptions {
  source: string;
  year: number;
  number: number;
  note?: string;
  check?: boolean;
}

/**
 * Stages a Petrklíč PDF, renders its cover and pages and adds the issue; returns the lines to print and the file
 * written. The issue is checked before anything is copied.
 */
export async function stagePetrklic(env: StageEnv, options: PetrklicOptions) {
  const { year, number, note, check = false } = options;
  const src = sourceFile(options.source, MAX_MB.petrklic, env.home);
  if (extname(src).toLowerCase() !== ".pdf") throw new Error("the Petrklíč is a PDF");
  const pageCount = pdfPageCount(src);
  const record = { year, number, ...(note !== undefined && { note }), pageCount };
  const checked = addPetrklic(env.petrklicFile, record, { check: true });
  const { id } = checked;
  const dest = await stage(env, src, `petrklic/${id}/petrklic-${id}.pdf`, check);
  if (!check) await renderPetrklic(dirname(dest), { pages: true });
  const result = check ? checked : addPetrklic(env.petrklicFile, record);
  return {
    lines: [
      stagedLine(check, `uploads/petrklic/${id}/ (PDF${check ? "" : ", cover.webp, pages/"}), ${pageCount} pages`),
      ...petrklicLines(result, check),
    ],
    written: result.written,
  };
}
```

- [ ] **Step 8: Update `scripts/stage/cli.ts`.**
  - Header comment lines for `petrklic`: `//   petrklic <pdf> --year <year> --number <number> [--note "<note>"]` and
    `//       checks the issue, stages uploads/petrklic/<id>/petrklic-<id>.pdf with cover.webp and pages/ and adds the`
    `//       issue to src/content/petrklic.json (scripts/add-petrklic.ts; with --check it only validates).`
  - `USAGE`: `       pnpm stage petrklic <pdf> --year <year> --number <number> [--note "<note>"] [--check]`.
  - `COMMANDS.petrklic`: `{ positionals: 1, options: ["year", "number", "note", "check"] }`.
  - `parseArgs` options gain `year: { type: "string" }, number: { type: "string" },`.
  - Replace the last two lines of `runCommand` with:

```ts
const year = Number(values.year);
const number = Number(values.number);
if (!Number.isInteger(year) || !Number.isInteger(number)) {
  throw new Error(`wrong arguments: --year and --number are whole numbers\n${USAGE}`);
}
const { lines, written } = await stagePetrklic(env, { source: args[0], year, number, note: values.note, check });
return { lines, format: written.length > 0 ? { files: written, tests: "src/content/petrklic.test.ts" } : undefined };
```

- [ ] **Step 9: Remove `parsePetrklicId()`** from `src/lib/petrklic/issues.ts` and its `describe` (and import) from
      `src/lib/petrklic/issues.test.ts`. Check: `git grep -n parsePetrklicId` prints nothing outside
      `docs/superpowers`.

- [ ] **Step 10: Run** — `pnpm format && pnpm exec vitest run scripts src/lib/petrklic src/content/petrklic.test.ts && pnpm exec tsc --noEmit && pnpm lint`
      Expected: PASS, no type or lint errors.

- [ ] **Step 11: Try the command** on a generated two-page PDF. Write `<scratchpad>/make-pdf.mts`:

```ts
import { writeFileSync } from "node:fs";
import { pdfWithText } from "/home/ondrej-planer/Documents/farakurim/scripts/test-helpers";

writeFileSync(process.argv[2], pdfWithText(["Petrklic", "Strana 2"]));
```

Run:

```sh
pnpm exec tsx --tsconfig tsconfig.json <scratchpad>/make-pdf.mts <scratchpad>/petrklic-try.pdf
pnpm -s stage petrklic <scratchpad>/petrklic-try.pdf --year 2099 --number 1 --check
pnpm -s stage petrklic <scratchpad>/petrklic-try.pdf --year 2026 --number 1 --check
git status --short
```

Expected: the first prints `Would stage uploads/petrklic/2099-1/ (PDF), 2 pages` and `Would add 1/2099 (2 pages) at
position 1 in src/content/petrklic.json (the current issue)`; the second stops with `stage: the issue 2026-1 is already
in petrklic.json`; `git status` lists only this task's source files (no `src/content/petrklic.json`, no `uploads/`).
`stage()` asks the server whether the name is free (a HEAD request), so this needs the network.

- [ ] **Step 12: Commit** (stage the new and changed `scripts/` files and `src/lib/petrklic/issues.ts`,
      `issues.test.ts`):

```
feat(scripts): add the Petrklíč issue to petrklic.json with pnpm stage petrklic

The command takes --year, --number and --note instead of an id, checks the issue before
copying the PDF and writes it newest first; nothing is pasted by hand any more.
parsePetrklicId() goes: nothing reads a year and number out of an id now.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 4: Docs

**Files:**

- Modify: `.claude/skills/farnost-create-petrklic/SKILL.md`, `README.md`, `.claude/rules/content-and-time.md`,
  `.claude/rules/structure.md`, `scripts/upload-images.ts` (header)

- [ ] **Step 1: Skill.** In `.claude/skills/farnost-create-petrklic/SKILL.md`:
  - `description`: replace "add a PetrklicIssue to src/content/petrklic.ts" with "add the issue to
    src/content/petrklic.json".
  - Intro: its first sentence becomes the block below.
  - Step 2: the command becomes the block below, and the sentence after it: "It prints the id, the page count and
    where the issue would go, and refuses an issue already in the file." In the list, the **id** item becomes "**id**,
    as `--check` printed it: computed from the year, number and note (2026-2, 2026-3-mimoradne); it names the PDF
    and the images." The year-and-number item proposes the next issue after the first one in
    `src/content/petrklic.json` (instead of `petrklicIssues[0]`).
  - Step 3: the same command without `--check`; replace "and prints the `issue(...)` line for the record." with
    "and adds the issue to `src/content/petrklic.json` (newest first), then formats it and runs the Petrklíč test.
    It says whether the issue is now the current one: an older issue goes lower in the list."
  - Delete step 4 ("Add the record") and renumber "Publish" to 4.
  - Common mistakes: replace the "Inserting the issue below the current one" item with "Correcting an issue: edit
    its record in `src/content/petrklic.json`. Changing a note changes the id, so the folder in `uploads/petrklic/`
    and on the server must be renamed too."

The intro's new first sentence:

```markdown
One issue is one record (`year`, `number`, `note`, `pageCount`; `PetrklicRecord` in `src/content/types/petrklic.ts`)
at the top of `src/content/petrklic.json` (design/DESIGN.md §17–18).
```

The step 2 command:

```sh
pnpm stage petrklic "<source>" --year <year> --number <number> [--note "<note>"] --check
```

- [ ] **Step 2: README.** Replace the `pnpm stage` row's description (the second cell) with the text below, and
      in the skill row change `petrklic.ts` to `petrklic.json`; `pnpm format` realigns the table:

```markdown
Stage a file in `uploads/`; petrklic adds the issue to `petrklic.json`, the others print their lines or add a `--record`
```

- [ ] **Step 3: Rules.** In `.claude/rules/content-and-time.md` replace the first line of the Petrklíč bullet
      (it starts with `- Petrklíč (` and ends with `the`) with the block below, and keep the rest of the bullet:

```markdown
- Petrklíč (`content/petrklic.json`, loaded and checked by `content/petrklic.ts` with `petrklicFileSchema` from
  `src/lib/petrklic/schema.ts`): one record per issue (`year`, `number`, `note`, `pageCount`), newest first, added
  by `pnpm stage petrklic` (`farnost-create-petrklic`); the id (`issueId()`), the URLs (`toIssue()`) and the
```

In `.claude/rules/structure.md`, add `` `slug.ts` (ASCII ids from Czech titles), `` to the `lib/shared/` list after
`` `links.ts`, ``.

- [ ] **Step 4: `scripts/upload-images.ts` header:** drop ", for src/content/petrklic.ts" from the line that says
      it prints `<id> <page count>` per issue.

- [ ] **Step 5: Check** — `git grep -n "petrklic\.ts\b\|issue(\"\|parsePetrklicId" -- ':!docs/superpowers' ':!design'`
      Expected: only `src/content/petrklic.ts` itself and correct mentions of the loader.

- [ ] **Step 6: Commit** — `pnpm format`, then stage the five files:

```
docs: describe the Petrklíč as petrklic.json added by pnpm stage petrklic

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 5: Verification

- [ ] **Step 1:** `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && rm -rf <scratchpad>/out-after-p && node <scratchpad>/normalize-out.mjs out <scratchpad>/out-after-p && diff -r <scratchpad>/out-before-p <scratchpad>/out-after-p > <scratchpad>/out-p.diff; grep -E "^[<>]" <scratchpad>/out-p.diff | grep -vE 'leading-verse|text-green-ink not-italic|DTSTAMP|next-size-adjust' | sort | uniq -c`
      Expected: the check passes; the filtered diff is empty or only the homepage countdown number. Any line from
      `/petrklic/` pages or the homepage Petrklíč card is a bug.

- [ ] **Step 2: Report** the commits and the diff result. Do not push or release.
