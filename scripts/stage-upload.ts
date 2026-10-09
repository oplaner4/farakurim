// Stages a content file in uploads/ for /uploads/ on the server and prints the lines for src/content/
// (farnost-create-aktualita, farnost-create-porad-bohosluzeb and farnost-create-petrklic skills).
// Every command checks the name is still free on the site (files on the server are never overwritten), copies the
// file under its ASCII name and renders the images (scripts/upload-images.ts). --check only validates and prints,
// without copying or rendering: use it before the user confirms, so nothing unconfirmed is left in uploads/ for the
// next release.
//
// Usage: pnpm stage <command> ... [--check]
//   aktualita <source> <id> <label> [--title "<title>"] [--poster | --no-poster] [--record <record.json>]
//       uploads/aktuality/<id>-<label>.<ext>, plus <id>-<label>.webp (page 1 / scaled image) for a visual label
//       (Plakát, Pozvánka, Leták); prints the `poster` and `attachments` lines. --record adds them to the confirmed
//       NewsEvent in the JSON file and adds it to src/content/news/ (scripts/add-aktualita.ts; with --check it only
//       validates the record).
//   porad <pdf> [--from YYYY-MM-DD --to YYYY-MM-DD] [--rev N]
//       reads the week from the heading ("od 4. 10. 2026 do 11. 10. 2026"), stages
//       uploads/porady_bohosluzeb/<validFrom>-porad-bohosluzeb[-<N>].pdf; prints pdfUrl, the week and its days.
//       --rev 2 names a corrected PDF of a week already on the server.
//   petrklic <pdf> <id> [--note "<note>"]
//       uploads/petrklic/<id>/petrklic-<id>.pdf with cover.webp and pages/; prints the `issue(...)` line.
// A source without a folder is also looked for in ~/Downloads/.
// Requires pdftoppm, pdfinfo and pdftotext (poppler-utils) for PDFs.

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { addDays, differenceInCalendarDays, format, getISODay } from "date-fns";
import { addAktualita, formatAndTest, NEWS_DIR, targetLine } from "./add-aktualita";
import { pdfFirstPageText, pdfPageCount, renderPetrklic, renderPoster } from "./upload-images";

const root = fileURLToPath(new URL("..", import.meta.url));
const MB = 1024 * 1024;

/** Attachment label → file name suffix; the visual ones also become the event's poster. */
export const LABELS = {
  Plakát: "plakat",
  Pozvánka: "pozvanka",
  Program: "program",
  Leták: "letak",
  Informace: "informace",
  Oznámení: "oznameni",
} as const;
export type Label = keyof typeof LABELS;
const VISUAL = new Set<string>(["Plakát", "Pozvánka", "Leták"]);
const EXTENSIONS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".webp",
  ".gif",
  ".mp3",
  ".m4a",
  ".ogg",
  ".wav",
  ".mp4",
  ".webm",
  ".mov",
]);
const POSTER_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".webp", ".gif"]);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const WEEKDAYS = ["po", "út", "st", "čt", "pá", "so", "ne"];

/** Where a command stages and adds content, and how it asks the server; the tests point it at a temp folder. */
export interface StageEnv {
  uploadsDir: string;
  newsDir: string;
  /** The site's address, e.g. https://farakurim.cz. */
  site: string;
  /** Asks whether a URL exists (a HEAD request); a stub in the tests. */
  fetch: typeof fetch;
  /** The home folder whose Downloads/ holds sources given without a folder. */
  home: string;
}

/** The site's address from scripts/deploy.sh (`SITE=…`), where the server details live. */
export function siteFromDeployScript(script: string): string {
  const site = /^SITE=(\S+)/m.exec(script)?.[1];
  if (!site) throw new Error("no SITE=… in scripts/deploy.sh");
  return site;
}

export const defaultEnv = (): StageEnv => ({
  uploadsDir: join(root, "uploads"),
  newsDir: NEWS_DIR,
  site: siteFromDeployScript(readFileSync(join(root, "scripts/deploy.sh"), "utf8")),
  fetch,
  home: homedir(),
});

/** The label given by its name or its suffix ("Plakát" or "plakat"). */
export function parseLabel(value: string): Label {
  const label = (Object.keys(LABELS) as Label[]).find((l) => value === l || value === LABELS[l]);
  if (!label) throw new Error(`unknown label "${value}": one of ${Object.keys(LABELS).join(", ")}`);
  return label;
}

/** The source file: `path` (with ~ for the home folder), or a bare file name in ~/Downloads/; at most `maxMb`. */
export function sourceFile(path: string, maxMb: number, home: string): string {
  let src = /^~([/\\]|$)/.test(path) ? join(home, path.slice(2)) : path;
  if (!existsSync(src) && dirname(src) === ".") src = join(home, "Downloads", src);
  if (!existsSync(src) || !statSync(src).isFile()) throw new Error(`${path} not found (also looked in ~/Downloads/)`);
  const { size } = statSync(src);
  if (size > maxMb * MB) {
    throw new Error(
      `${basename(src)} is ${(size / MB).toFixed(1)} MB, over ${maxMb} MB: ask the user for a smaller file`,
    );
  }
  return src;
}

/** Refuses a name that is already on the server. */
async function checkFree(env: StageEnv, rel: string, takenHint: string) {
  const url = `${env.site}/uploads/${rel}`;
  let status: number;
  try {
    ({ status } = await env.fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15_000) }));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`cannot reach ${env.site} (${reason}): cannot tell whether the name is free`);
  }
  if (status < 400) throw new Error(`${url} already exists on the server: ${takenHint}`);
  if (status !== 404) throw new Error(`${url} answered ${status}: cannot tell whether the name is free`);
}

/**
 * Copies `src` to uploads/`rel` unless `check`, after making sure the name is free on the server. Staging the same
 * file again is allowed. Returns the staged path.
 */
async function stage(env: StageEnv, src: string, rel: string, check: boolean, takenHint = "pick another id") {
  const dest = join(env.uploadsDir, rel);
  if (existsSync(dest) && !readFileSync(dest).equals(readFileSync(src))) {
    throw new Error(`uploads/${rel} is already staged with other content`);
  }
  await checkFree(env, rel, takenHint);
  if (!check) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  return dest;
}

const stagedLine = (check: boolean, what: string) => `${check ? "Would stage" : "Staged"} ${what}`;

export interface AktualitaOptions {
  source: string;
  id: string;
  label: string;
  title?: string;
  /** Renders a poster WebP; by default for the visual labels. */
  poster?: boolean;
  /** The confirmed NewsEvent (without the files), added to src/content/news/. */
  record?: Record<string, unknown>;
  check?: boolean;
}

/**
 * Stages an aktualita's file (and its poster WebP) and, with a record, adds the record with the files. Returns the
 * lines to print and the news files written (for formatAndTest).
 */
export async function stageAktualita(env: StageEnv, options: AktualitaOptions) {
  const { id, record: input, check = false } = options;
  const label = parseLabel(options.label);
  if (!KEBAB.test(id)) throw new Error(`"${id}" is not an ASCII kebab-case id`);
  const src = sourceFile(options.source, 10, env.home);
  const ext = extname(src).toLowerCase().replace(".jpeg", ".jpg");
  if (!EXTENSIONS.has(ext)) throw new Error(`${extname(src)} is not an image, PDF, audio or video file`);
  const name = `${id}-${LABELS[label]}`;
  const poster = options.poster ?? VISUAL.has(label);
  if (poster && !POSTER_EXTENSIONS.has(ext)) throw new Error(`a ${ext} file cannot be a poster: pass --no-poster`);
  const { size } = statSync(src);
  const title = options.title ?? (input?.title as string | undefined) ?? "<title>";
  const lines: string[] = [];
  let record: Record<string, unknown> | undefined;
  if (input) {
    if (input.id !== id) throw new Error(`the record's id ${JSON.stringify(input.id)} is not "${id}"`);
    record = { ...input };
    if (poster) {
      // Keep an alt text the record already has (it may add the date); the src is always the staged WebP.
      const alt = (input.poster as { alt?: string } | undefined)?.alt ?? `${label}: ${title}`;
      record.poster = { src: `/uploads/aktuality/${name}.webp`, alt };
    }
    record.attachments = [{ label, file: `/uploads/aktuality/${name}${ext}`, size }];
    // Validate before anything is copied, so a bad record leaves nothing staged.
    const target = addAktualita(env.newsDir, record, { check: true });
    if (check) lines.push(targetLine(target, true));
  }
  const dest = await stage(env, src, `aktuality/${name}${ext}`, check);
  if (poster && !check) await renderPoster(dest, dest.slice(0, -ext.length) + ".webp");
  lines.push(stagedLine(check, `uploads/aktuality/${name}${ext}`) + (poster ? " and .webp" : ""));
  if (!record) {
    const alt = JSON.stringify(`${label}: ${title}`);
    if (poster) lines.push(`    poster: { src: \`\${UPLOADS}/${name}.webp\`, alt: ${alt} },`);
    lines.push(`    attachments: [{ label: "${label}", file: \`\${UPLOADS}/${name}${ext}\`, size: ${size} }],`);
    return { lines, written: [] };
  }
  if (check) return { lines, written: [] };
  const result = addAktualita(env.newsDir, record);
  lines.push(targetLine(result, false));
  return { lines, written: result.written };
}

/** An ISO date of a valid day, month and year; throws for 31. 2. */
function isoDate(day: number, month: number, year: number): string {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`${day}. ${month}. ${year} is not a date`);
  }
  return format(date, "yyyy-MM-dd");
}

/** A local date of an ISO date, for the day arithmetic. */
const localDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * The week of a pořad bohoslužeb from its heading: "od 30. 11. 2025 do 7. 12. 2025", or without the first year
 * ("od 30. 11. do 7. 12. 2025", the year before when the week crosses New Year). Null without a heading.
 */
export function parseWeek(text: string): { validFrom: string; validTo: string } | null {
  const m = /od (\d{1,2})\. ?(\d{1,2})\. ?(\d{4})? ?do (\d{1,2})\. ?(\d{1,2})\. ?(\d{4})/i.exec(
    text.replace(/\s+/g, " "),
  );
  if (!m) return null;
  const [day, month, endDay, endMonth, endYear] = [m[1], m[2], m[4], m[5], m[6]].map(Number);
  const year = m[3] ? Number(m[3]) : month > endMonth ? endYear - 1 : endYear;
  return { validFrom: isoDate(day, month, year), validTo: isoDate(endDay, endMonth, endYear) };
}

/** Every date from `validFrom` to `validTo` with its Czech weekday: "so 2026-10-03". */
export const weekDays = (validFrom: string, validTo: string) =>
  Array.from({ length: differenceInCalendarDays(localDate(validTo), localDate(validFrom)) + 1 }, (_, i) => {
    const date = addDays(localDate(validFrom), i);
    return `${WEEKDAYS[getISODay(date) - 1]} ${format(date, "yyyy-MM-dd")}`;
  });

export interface PoradOptions {
  source: string;
  validFrom?: string;
  validTo?: string;
  rev?: number;
  check?: boolean;
}

/** Stages the weekly PDF; returns the lines to print (pdfUrl, the week and its days). */
export async function stagePorad(env: StageEnv, options: PoradOptions) {
  const { rev, check = false } = options;
  const src = sourceFile(options.source, 20, env.home);
  if (extname(src).toLowerCase() !== ".pdf") throw new Error("the pořad bohoslužeb is a PDF");
  let week: { validFrom: string; validTo: string } | null = null;
  if (options.validFrom && options.validTo) {
    week = { validFrom: options.validFrom, validTo: options.validTo };
    for (const date of [week.validFrom, week.validTo]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${date} is not a YYYY-MM-DD date`);
      const [year, month, day] = date.split("-").map(Number);
      isoDate(day, month, year);
    }
  } else {
    week = parseWeek(pdfFirstPageText(src));
    if (!week) throw new Error("no 'od … do …' week in the PDF heading: pass --from and --to");
  }
  const { validFrom, validTo } = week;
  // One week, or two around holidays (Sunday to Sunday is 14 days); anything longer is a misread heading.
  const days = differenceInCalendarDays(localDate(validTo), localDate(validFrom));
  if (days <= 0 || days > 21) throw new Error(`the period ${validFrom} – ${validTo} looks wrong: pass --from and --to`);
  const rel = `porady_bohosluzeb/${validFrom}-porad-bohosluzeb${rev ? `-${rev}` : ""}.pdf`;
  const hint = `this week is already published; for a corrected PDF pass --rev ${(rev ?? 1) + 1}`;
  await stage(env, src, rel, check, hint);
  return [
    stagedLine(check, `uploads/${rel}`),
    `  pdfUrl: "/uploads/${rel}",\n  validFrom: "${validFrom}",\n  validTo: "${validTo}",`,
    `days: ${weekDays(validFrom, validTo).join(", ")}`,
  ];
}

/** The year and number of a Petrklíč id: `2026-2`, or `2026-3-mimoradne` with a note. */
export function parsePetrklicId(id: string): { year: number; number: number } {
  const m = /^(\d{4})-(\d{1,2})(-[a-z0-9]+(-[a-z0-9]+)*)?$/.exec(id);
  if (!m) throw new Error(`"${id}" is not <year>-<number>[-<note>], e.g. 2026-2 or 2026-3-mimoradne`);
  return { year: Number(m[1]), number: Number(m[2]) };
}

export interface PetrklicOptions {
  source: string;
  id: string;
  note?: string;
  check?: boolean;
}

/** Stages a Petrklíč PDF and renders its cover and pages; returns the lines to print (with the `issue()` line). */
export async function stagePetrklic(env: StageEnv, options: PetrklicOptions) {
  const { id, note, check = false } = options;
  const { year, number } = parsePetrklicId(id);
  const src = sourceFile(options.source, 40, env.home);
  if (extname(src).toLowerCase() !== ".pdf") throw new Error("the Petrklíč is a PDF");
  const dest = await stage(env, src, `petrklic/${id}/petrklic-${id}.pdf`, check);
  const pages = check ? pdfPageCount(src) : await renderPetrklic(dirname(dest), { pages: true });
  const extra = note ? `, { note: ${JSON.stringify(note)} }` : "";
  return [
    stagedLine(check, `uploads/petrklic/${id}/ (PDF${check ? "" : ", cover.webp, pages/"}), ${pages} pages`),
    `  issue("${id}", ${year}, ${number}, ${pages}${extra}),`,
  ];
}

const USAGE = `Usage: pnpm stage aktualita <source> <id> <label> [--title "<title>"] [--poster | --no-poster] [--record <json>] [--check]
       pnpm stage porad <pdf> [--from YYYY-MM-DD --to YYYY-MM-DD] [--rev N] [--check]
       pnpm stage petrklic <pdf> <id> [--note "<note>"] [--check]`;

/** Each command's positional arguments and options. */
const COMMANDS: Record<string, { positionals: number; options: string[] }> = {
  aktualita: { positionals: 3, options: ["title", "poster", "record", "check"] },
  porad: { positionals: 1, options: ["from", "to", "rev", "check"] },
  petrklic: { positionals: 2, options: ["note", "check"] },
};

/** Runs a command line (without the program); returns the lines to print. */
export async function runCommand(env: StageEnv, argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    allowNegative: true,
    options: {
      title: { type: "string" },
      poster: { type: "boolean" },
      record: { type: "string" },
      from: { type: "string" },
      to: { type: "string" },
      rev: { type: "string" },
      note: { type: "string" },
      check: { type: "boolean" },
    },
  });
  const [command, ...args] = positionals;
  const spec = COMMANDS[command];
  const unknown = Object.keys(values).filter((option) => !spec?.options.includes(option));
  if (!spec || args.length !== spec.positionals || unknown.length > 0) throw new Error(`wrong arguments\n${USAGE}`);
  const check = values.check ?? false;
  if (command === "aktualita") {
    const [source, id, label] = args;
    const record = values.record
      ? (JSON.parse(readFileSync(values.record, "utf8")) as Record<string, unknown>)
      : undefined;
    return stageAktualita(env, { source, id, label, title: values.title, poster: values.poster, record, check });
  }
  if (command === "porad") {
    const rev = values.rev === undefined ? undefined : Number(values.rev);
    if (rev !== undefined && !(Number.isInteger(rev) && rev > 1)) throw new Error("--rev is a number from 2");
    const lines = await stagePorad(env, { source: args[0], validFrom: values.from, validTo: values.to, rev, check });
    return { lines, written: [] };
  }
  const lines = await stagePetrklic(env, { source: args[0], id: args[1], note: values.note, check });
  return { lines, written: [] };
}

// No top-level await: tsx runs the scripts as CommonJS (package.json has no "type": "module").
async function main() {
  try {
    const { lines, written } = await runCommand(defaultEnv(), process.argv.slice(2));
    console.log(lines.join("\n"));
    if (written.length > 0) await formatAndTest(written);
  } catch (error) {
    console.error(`stage-upload: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Run as a command, not imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) void main();
