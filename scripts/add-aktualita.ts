// Adds a confirmed aktualita to src/content/news/ (farnost-create-aktualita skill): the record goes into the file
// of its start month, in start-date order, with `published` set to today in Prague. The first event of a new year
// creates its folder (twelve month files and index.ts) and adds the year to news/index.ts. Prettier formats the
// touched files, then the news tests run. The record's rules are newsEventSchema's (src/lib/news/schema.ts).
//
// Usage: pnpm add-aktualita <record.json | -> [--check]
// The record is a NewsEvent as JSON; upload paths are root-relative ("/uploads/aktuality/x.webp") and become
// `${UPLOADS}/x.webp`. --check only validates the record and prints the target file, without writing.
// Then it checks the event in the Události calendar (scripts/aktualita-calendar.ts).
// `pnpm stage aktualita … --record <file>` (scripts/stage-upload.ts) adds the staged poster and attachments and
// calls addAktualita(), formatAndTest() and the calendar check itself.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod";
import type { NewsEvent } from "@/content/types/news";
import { NEWS_EVENT_FIELDS, newsEventSchema } from "@/lib/news/schema";
import { pragueDate } from "@/lib/shared/prague";
import { reportCalendar } from "./aktualita-calendar";
import { entries, formatAndTest, NEWS_DIR, newsIds } from "./content-files";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const UPLOADS_IMPORT = 'import { UPLOADS } from "../uploads";';

/**
 * A record as a month file's array item: one field per line in the schema's order, indented as Prettier writes it
 * (it keeps the object expanded and only wraps long lines).
 */
export function recordSource(record: NewsEvent): string {
  return ["  {", ...entries(record, NEWS_EVENT_FIELDS).map((entry) => `    ${entry},`), "  },"].join("\n");
}

/** The month file's export name and path inside news/ for a record starting on `start`. */
export function monthFile(start: string) {
  const [year, month] = start.split("-");
  return { year, month, name: MONTHS[Number(month) - 1], path: `${year}/${month}.ts` };
}

/**
 * `source` (a news/<year>/<MM>.ts file) with `record` inserted after the last record that starts on or before it.
 * Records are the array's top-level `  {` … `  },` blocks, as Prettier writes them.
 */
export function insertRecord(source: string, record: NewsEvent, name: string): string {
  const lines = source.split("\n");
  const head = lines.findIndex((line) => line.startsWith(`export const ${name}: NewsEvent[] = [`));
  if (head === -1) throw new Error(`no "export const ${name}: NewsEvent[] = [" in the month file`);
  const entry = recordSource(record);
  if (lines[head].endsWith("[];")) {
    lines.splice(head, 1, `export const ${name}: NewsEvent[] = [`, entry, "];");
  } else {
    const end = lines.findIndex((line, i) => i > head && line === "];");
    if (end === -1) throw new Error(`the ${name} array has no closing "];" line`);
    let at = end;
    for (let i = head + 1; i < end; i++) {
      if (!/^ {2}\S/.test(lines[i]) || lines[i].startsWith("  //")) continue;
      if (lines[i] !== "  {") throw new Error(`unexpected line ${i + 1} in the ${name} array: ${lines[i]}`);
      const close = lines.findIndex((line, j) => j > i && /^ {2}},?$/.test(line));
      if (close === -1 || close > end) throw new Error(`the record at line ${i + 1} is not closed`);
      const start = lines
        .slice(i, close)
        .join("\n")
        .match(/^ {4}start: "(\d{4}-\d{2}-\d{2})"/m)?.[1];
      if (!start) throw new Error(`the record at line ${i + 1} has no start date`);
      if (start > record.start) {
        at = i;
        break;
      }
      i = close;
    }
    lines.splice(at, 0, entry);
  }
  let result = lines.join("\n");
  if (result.includes("${UPLOADS}") && !result.includes(UPLOADS_IMPORT)) {
    result = result.replace(/^(import type \{ NewsEvent \} from .*;)$/m, `$1\n${UPLOADS_IMPORT}`);
  }
  return result;
}

/** The files of a new news/<year>/ folder: an empty file per month and the index joining them. */
export function yearFiles(year: string): Record<string, string> {
  const file = (i: number) => String(i + 1).padStart(2, "0");
  const files: Record<string, string> = {};
  MONTHS.forEach((name, i) => {
    files[`${file(i)}.ts`] =
      `import type { NewsEvent } from "@/content/types/news";\n\nexport const ${name}: NewsEvent[] = [];\n`;
  });
  files["index.ts"] = [
    'import type { NewsEvent } from "@/content/types/news";',
    ...MONTHS.map((name, i) => `import { ${name} } from "./${file(i)}";`),
    "",
    `// The ${year} aktuality, added with the farnost-create-aktualita skill: one file per start month, each in`,
    "// start-date order.",
    `export const events${year}: NewsEvent[] = [${MONTHS.map((name) => `...${name}`).join(", ")}];`,
    "",
  ].join("\n");
  return files;
}

/** news/index.ts with the new year imported and listed first in `events`. */
export function addYear(index: string, year: string): string {
  const imports = [...index.matchAll(/^import \{ events\d{4} \} from "\.\/\d{4}";$/gm)];
  const marker = "export const events: NewsEvent[] = [";
  if (imports.length === 0 || !index.includes(marker)) throw new Error("news/index.ts has an unexpected shape");
  const last = imports[imports.length - 1];
  const at = last.index + last[0].length;
  return (index.slice(0, at) + `\nimport { events${year} } from "./${year}";` + index.slice(at)).replace(
    marker,
    `${marker}...events${year}, `,
  );
}

/**
 * Adds `input` to the news folder `newsDir` and returns the files it wrote (relative to newsDir); `check` only
 * validates. Throws with every problem found.
 */
export function addAktualita(newsDir: string, input: unknown, { check = false, now = new Date() } = {}) {
  const withDate = input !== null && typeof input === "object" ? { published: pragueDate(now), ...input } : input;
  const parsed = newsEventSchema.safeParse(withDate);
  if (!parsed.success) throw new Error(`the record is not valid:\n${z.prettifyError(parsed.error)}`);
  const record = parsed.data;
  if (newsIds(newsDir).has(record.id)) {
    throw new Error(`id ${record.id} is already taken`);
  }
  const target = monthFile(record.start);
  if (existsSync(join(newsDir, `${target.year}.ts`))) {
    throw new Error(`${target.year} is a migrated year (news/${target.year}.ts): add the record by hand`);
  }
  const written: string[] = [];
  const newYear = !existsSync(join(newsDir, target.year));
  if (!check && newYear) {
    mkdirSync(join(newsDir, target.year));
    for (const [file, content] of Object.entries(yearFiles(target.year))) {
      writeFileSync(join(newsDir, target.year, file), content);
      written.push(`${target.year}/${file}`);
    }
    writeFileSync(join(newsDir, "index.ts"), addYear(readFileSync(join(newsDir, "index.ts"), "utf8"), target.year));
    written.push("index.ts");
  }
  if (!check) {
    const path = join(newsDir, target.path);
    writeFileSync(path, insertRecord(readFileSync(path, "utf8"), record, target.name));
    if (!written.includes(target.path)) written.push(target.path);
  }
  return { record, target: target.path, newYear, written };
}

/** The line saying where the record went (or would go) in src/content/news/. */
export const targetLine = ({ target, newYear }: { target: string; newYear: boolean }, check: boolean) =>
  `${check ? "Would add" : "Added"} the record to src/content/news/${target}` +
  (newYear ? ` (new year: creates news/${target.slice(0, 4)}/)` : "");

// No top-level await: tsx runs the scripts as CommonJS (package.json has no "type": "module").
async function main() {
  const [file] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const check = process.argv.includes("--check");
  if (!file) {
    console.error("Usage: pnpm add-aktualita <record.json | -> [--check]");
    process.exit(2);
  }
  try {
    const input: unknown = JSON.parse(readFileSync(file === "-" ? 0 : file, "utf8"));
    const result = addAktualita(NEWS_DIR, input, { check });
    console.log(targetLine(result, check));
    if (!check) {
      await formatAndTest(
        result.written.map((f) => join(NEWS_DIR, f)),
        "src/content/news",
      );
      await reportCalendar(result.record);
    }
  } catch (error) {
    console.error(`add-aktualita: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Run as a command, not imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) void main();
