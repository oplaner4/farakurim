// Stages a content file in uploads/ for /uploads/ on the server and prints the lines for src/content/
// (farnost-create-aktualita, farnost-create-porad-bohosluzeb and farnost-create-petrklic skills).
// Every command checks the name is still free on the site (files on the server are never overwritten), copies the
// file under its ASCII name and renders the images (images.ts). --check only validates and prints,
// without copying or rendering: use it before the user confirms, so nothing unconfirmed is left in uploads/ for the
// next release. This file parses the command line; each command lives in its own file in scripts/stage/ and
// the staging they share in core.ts.
//
// Usage: pnpm stage <command> ... [--check]
//   aktualita <source> <id> <label> [--title "<title>"] [--poster | --no-poster] [--record <record.json>]
//       uploads/aktuality/<id>-<label in ASCII>.<ext>, plus .webp (page 1 / scaled image) for an image or PDF
//       unless --no-poster; prints the `poster` and `attachments` lines. --record adds them to the confirmed
//       NewsEvent in the JSON file and adds it to src/content/news/ (scripts/add-aktualita.ts; with --check it only
//       validates the record). A pinned record takes the pin from the record pinned before (named in the output).
//   porad <pdf> [--from YYYY-MM-DD --to YYYY-MM-DD] [--corrected] [--record <record.json>]
//       reads the week from the heading ("od 4. 10. 2026 do 11. 10. 2026"), stages
//       uploads/porady_bohosluzeb/<validFrom>-porad-bohosluzeb[-r<rev>].pdf and adds the confirmed sheet (--record:
//       days and announcements as JSON) to src/content/ohlasky.json, removing the outdated sheets and the covered
//       laterExceptions (scripts/add-ohlasky.ts). --record is required, except with --check, which then prints the
//       week and its days (with a record, --check only validates it). --corrected stages a corrected PDF of a week
//       already there, in the next -r<rev> once the week is on the server, else under its name.
//   petrklic <pdf> --year <year> --number <number> [--note "<note>"] [--corrected]
//       checks the issue, stages uploads/petrklic/<id>/petrklic-<id>.pdf with cover.webp and pages/ and adds the
//       issue to src/content/petrklic.json (scripts/add-petrklic.ts; with --check it only validates). --corrected
//       stages a corrected PDF of an issue already there and replaces its record: in the next uploads/petrklic/
//       <id>-r<rev>/ once the issue is on the server, else in its folder.
// A source without a folder is also looked for in ~/Downloads/.
// Requires pdftoppm, pdfinfo and pdftotext (poppler-utils) for PDFs.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import * as z from "zod";
import type { NewsEvent } from "@/content/types/news";
import { reportCalendar } from "../aktualita-calendar";
import { runCommand } from "../command";
import { formatAndTest } from "../content-files";
import { stageAktualita } from "./aktualita";
import { defaultEnv, MAX_MB, type StageEnv } from "./core";
import { stagePetrklic } from "./petrklic";
import { stagePorad } from "./porad";

const USAGE = `Usage: pnpm stage aktualita <source> <id> <label> [--title "<title>"] [--poster | --no-poster] [--record <json>] [--check]
       pnpm stage porad <pdf> [--from YYYY-MM-DD --to YYYY-MM-DD] [--corrected] [--record <json>] [--check]
       pnpm stage petrklic <pdf> --year <year> --number <number> [--note "<note>"] [--corrected] [--check]
Largest source file: ${Object.entries(MAX_MB)
  .map(([command, mb]) => `${command} ${mb} MB`)
  .join(", ")}`;

// Digits only, not z.coerce.number(): Number() reads "" and " " as 0 and "0x7EA" as 2026. The range (from 2006,
// from 1) is petrklicRecordSchema's, checked by addPetrklic().
const digits = z.string().regex(/^\d+$/).transform(Number);
/** The --year and --number of `stage petrklic`. */
const petrklicArgsSchema = z.object({ year: digits, number: digits });
/** The --from and --to of `stage porad`: real dates, both or neither (one alone would be ignored for the heading). */
const poradWeekSchema = z
  .object({ from: z.iso.date().optional(), to: z.iso.date().optional() })
  .refine(({ from, to }) => (from === undefined) === (to === undefined));

/** Each command's positional arguments and options. */
const COMMANDS: Record<string, { positionals: number; options: string[] }> = {
  aktualita: { positionals: 3, options: ["title", "poster", "record", "check"] },
  porad: { positionals: 1, options: ["from", "to", "corrected", "record", "check"] },
  petrklic: { positionals: 1, options: ["year", "number", "note", "corrected", "check"] },
};

/** Runs a command line (without the program); returns the lines to print, the files to format and the added event. */
export async function runStage(
  env: StageEnv,
  argv: string[],
): Promise<{ lines: string[]; format?: { files: string[]; tests: string }; event?: NewsEvent }> {
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
      year: { type: "string" },
      number: { type: "string" },
      note: { type: "string" },
      corrected: { type: "boolean" },
      check: { type: "boolean" },
    },
  });
  const [command, ...args] = positionals;
  const spec = COMMANDS[command];
  const unknown = Object.keys(values).filter((option) => !spec?.options.includes(option));
  if (!spec || args.length !== spec.positionals || unknown.length > 0) throw new Error(`wrong arguments\n${USAGE}`);
  const check = values.check ?? false;
  const record = values.record
    ? (JSON.parse(readFileSync(values.record, "utf8")) as Record<string, unknown>)
    : undefined;
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
    const week = poradWeekSchema.safeParse(values);
    if (!week.success) {
      throw new Error(`wrong arguments: --from and --to are YYYY-MM-DD dates, both or neither\n${USAGE}`);
    }
    const { lines, written } = await stagePorad(env, {
      source: args[0],
      validFrom: week.data.from,
      validTo: week.data.to,
      corrected: values.corrected,
      record,
      check,
    });
    return { lines, format: written.length > 0 ? { files: written, tests: "src/content/ohlasky.test.ts" } : undefined };
  }
  const issue = petrklicArgsSchema.safeParse(values);
  if (!issue.success) throw new Error(`wrong arguments: --year and --number are whole numbers\n${USAGE}`);
  const { year, number } = issue.data;
  const { lines, written } = await stagePetrklic(env, {
    source: args[0],
    year,
    number,
    note: values.note,
    corrected: values.corrected,
    check,
  });
  return { lines, format: written.length > 0 ? { files: written, tests: "src/content/petrklic.test.ts" } : undefined };
}

runCommand(
  "stage",
  import.meta.url,
  (args) => args,
  async (args) => {
    const { lines, format, event } = await runStage(defaultEnv(), args);
    console.log(lines.join("\n"));
    if (format) await formatAndTest(format.files, format.tests);
    if (event) await reportCalendar(event);
  },
);
