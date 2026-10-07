// Adds a confirmed aktualita to src/content/news/ (farnost-create-aktualita skill): the record goes into the file
// of its start month, in start-date order, with `published` set to today in Prague. The first event of a new year
// creates its folder (twelve month files and index.ts) and adds the year to news/index.ts. Prettier formats the
// touched files, then the news tests run. The record's rules are newsEventSchema's (src/lib/news/schema.ts).
//
// Usage: pnpm add-aktualita <record.json | -> [--check]
// The record is a NewsEvent as JSON; upload paths are root-relative ("/uploads/aktuality/x.webp") and become
// `${UPLOADS}/x.webp`. --check only validates the record and prints the target file, without writing.
// `pnpm stage aktualita … --record <file>` adds the staged poster and attachments and runs this.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod";
import type { NewsEvent } from "@/content/types/news";
import { NEWS_EVENT_FIELDS, newsEventSchema } from "@/lib/news/schema";
import { pragueDate } from "@/lib/shared/prague";

export const MONTHS = [
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

const UPLOADS_PATH = "/uploads/aktuality/";
const UPLOADS_IMPORT = 'import { UPLOADS } from "../uploads";';

/** A JS expression for `value`: plain object keys, upload paths as `${UPLOADS}/…`. Prettier formats it later. */
export function toSource(value: unknown): string {
  if (typeof value === "string") {
    const file = value.startsWith(UPLOADS_PATH) ? value.slice(UPLOADS_PATH.length) : null;
    return file !== null && /^[\w.-]+$/.test(file) ? `\`\${UPLOADS}/${file}\`` : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(toSource).join(", ")}]`;
  if (value !== null && typeof value === "object") return `{ ${entries(value as Record<string, unknown>).join(", ")} }`;
  return JSON.stringify(value);
}

/** The `key: value` sources of an object's defined fields, in `keys` order. */
const entries = (object: Record<string, unknown>, keys = Object.keys(object)) =>
  keys
    .filter((key) => object[key] !== undefined)
    .map((key) => `${/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: ${toSource(object[key])}`);

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

/** The IDs of every record in the news files' sources. */
export function existingIds(sources: string[]): Set<string> {
  return new Set(sources.flatMap((source) => [...source.matchAll(/^\s+id: "([^"]+)",$/gm)].map((m) => m[1])));
}

/** Every content .ts file under `dir`, recursively. */
const tsFiles = (dir: string) =>
  readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .map((file) => join(dir, file));

/**
 * Adds `input` to the news folder `newsDir` and returns the files it wrote (relative to newsDir); `check` only
 * validates. Throws with every problem found.
 */
export function addAktualita(newsDir: string, input: unknown, { check = false, now = new Date() } = {}) {
  const withDate = input !== null && typeof input === "object" ? { published: pragueDate(now), ...input } : input;
  const parsed = newsEventSchema.safeParse(withDate);
  if (!parsed.success) throw new Error(`the record is not valid:\n${z.prettifyError(parsed.error)}`);
  const record = parsed.data;
  if (existingIds(tsFiles(newsDir).map((f) => readFileSync(f, "utf8"))).has(record.id)) {
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

// Run as a command, not imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const check = process.argv.includes("--check");
  if (!file) {
    console.error("Usage: pnpm add-aktualita <record.json | -> [--check]");
    process.exit(2);
  }
  const root = fileURLToPath(new URL("..", import.meta.url));
  const newsDir = join(root, "src/content/news");
  try {
    const input: unknown = JSON.parse(readFileSync(file === "-" ? 0 : file, "utf8"));
    const { target, newYear, written } = addAktualita(newsDir, input, { check });
    const year = newYear ? ` (new year: creates news/${target.slice(0, 4)}/)` : "";
    if (check) {
      console.log(`Would add the record to src/content/news/${target}${year}`);
    } else {
      const paths = written.map((f) => join("src/content/news", f));
      execFileSync("pnpm", ["exec", "prettier", "--write", ...paths], { cwd: root, stdio: "ignore" });
      console.log(`Added the record to src/content/news/${target}${year}`);
      execFileSync("pnpm", ["exec", "vitest", "run", "src/content/news"], { cwd: root, stdio: "inherit" });
    }
  } catch (error) {
    console.error(`add-aktualita: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
