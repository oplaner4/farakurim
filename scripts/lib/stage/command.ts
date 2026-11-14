// Reads a stage command line and runs its command: each lives in its own file in this folder (event.ts, sheet.ts,
// petrklic.ts), and the staging they share in core.ts.

import { join } from "node:path";
import { parseArgs } from "node:util";
import * as z from "zod";
import { readJsonRecord } from "../command";
import { formatAndTest, SERVICE_SHEETS_TESTS } from "../content-files";
import { stageEvent } from "./event";
import { defaultEnv, MAX_MB, type StageEnv } from "./core";
import { stagePetrklic } from "./petrklic";
import { draftSheet, stageSheet } from "./sheet";

const USAGE = `Usage: pnpm stage event --record <json> <source> <label> [<source> <label> …] [--no-poster] [--check]
       pnpm stage event --corrected (--record <json> | --id <id>) <source> <label> [<source> <label> …] [--check]
       pnpm stage sheet <pdf|docx> [--from YYYY-MM-DD --to YYYY-MM-DD] [--corrected] [--record <json>] [--check]
       pnpm stage sheet draft <docx> --out <json> [--from YYYY-MM-DD --to YYYY-MM-DD] [--corrected]
       pnpm stage petrklic <pdf> --year <year> --number <number> [--note "<note>"] [--corrected] [--check]
       pnpm stage petrklic --from <id> --year <year> --number <number> [--note "<note>"] [--check]
Largest source file: ${Object.entries(MAX_MB)
  .map(([command, mb]) => `${command} ${mb} MB`)
  .join(", ")}`;

// Digits only, not z.coerce.number(): Number() reads "" and " " as 0 and "0x7EA" as 2026. The range (from 2006,
// from 1) is petrklicRecordSchema's, checked by addPetrklic().
const digits = z.string().regex(/^\d+$/).transform(Number);
/** The --year and --number of `stage petrklic`. */
const petrklicArgsSchema = z.object({ year: digits, number: digits });
/** The --from and --to of `stage sheet`: real dates, both or neither (one alone would be ignored for the heading). */
const sheetWeekSchema = z
  .object({ from: z.iso.date().optional(), to: z.iso.date().optional() })
  .refine(({ from, to }) => (from === undefined) === (to === undefined));

/** Each command's count of positional arguments and its options; `sheet draft` is its own. */
const COMMANDS: Record<string, { positionals: (count: number) => boolean; options: string[] }> = {
  // Source and label pairs.
  event: { positionals: (n) => n >= 2 && n % 2 === 0, options: ["poster", "corrected", "record", "id", "check"] },
  // The PDF or DOCX.
  sheet: { positionals: (n) => n === 1, options: ["from", "to", "corrected", "record", "check"] },
  // The DOCX.
  "sheet draft": { positionals: (n) => n === 1, options: ["from", "to", "corrected", "out"] },
  // The PDF, or none with --from (the issue's own PDF).
  petrklic: { positionals: (n) => n <= 1, options: ["year", "number", "note", "corrected", "from", "check"] },
};

/** The command a command line names (`sheet draft` takes two words) and its arguments. */
function commandOf([name = "", ...rest]: string[]): { command: string; args: string[] } {
  const sub = name === "sheet" && rest[0] === "draft";
  return sub ? { command: `${name} ${rest[0]}`, args: rest.slice(1) } : { command: name, args: rest };
}

/**
 * The id of the event to stage for: its record's, else (only with --corrected, the record on the site) --id. Throws
 * for both, for a new event without its record and for a record without an id.
 */
function eventId(id: string | undefined, record: Record<string, unknown> | undefined, corrected: boolean): string {
  if (id !== undefined && record)
    throw new Error(`wrong arguments: --id or --record, not both: the record holds the id\n${USAGE}`);
  if (record) {
    if (typeof record.id !== "string") throw new Error("the record has no id");
    return record.id;
  }
  if (!corrected) {
    throw new Error(`wrong arguments: a new event needs --record (also with --check), which holds its id\n${USAGE}`);
  }
  if (id === undefined) throw new Error(`wrong arguments: --corrected needs --record or --id\n${USAGE}`);
  return id;
}

type StageResult = { lines: string[]; format?: { files: string[]; tests: string | string[] } };

/** Runs `sheet` or `sheet draft` with their checked arguments. */
async function runSheetCommand(
  env: StageEnv,
  command: string,
  source: string,
  values: { from?: string; to?: string; out?: string; corrected?: boolean },
  record: Record<string, unknown> | undefined,
  check: boolean,
): Promise<StageResult> {
  const week = sheetWeekSchema.safeParse(values);
  if (!week.success) {
    throw new Error(`wrong arguments: --from and --to are YYYY-MM-DD dates, both or neither\n${USAGE}`);
  }
  const { from: validFrom, to: validTo } = week.data;
  const { corrected } = values;
  if (command === "sheet draft") {
    if (!values.out) throw new Error(`wrong arguments: sheet draft needs --out <json>\n${USAGE}`);
    return { lines: (await draftSheet(env, { source, validFrom, validTo, corrected, out: values.out })).lines };
  }
  const { lines, written } = await stageSheet(env, { source, validFrom, validTo, corrected, record, check });
  return { lines, format: written.length > 0 ? { files: written, tests: SERVICE_SHEETS_TESTS } : undefined };
}

/** Runs a command line (without the program); returns the lines to print and the files to format. */
export async function runStage(env: StageEnv, argv: string[]): Promise<StageResult> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    allowNegative: true,
    options: {
      poster: { type: "boolean" },
      record: { type: "string" },
      id: { type: "string" },
      out: { type: "string" },
      from: { type: "string" },
      to: { type: "string" },
      year: { type: "string" },
      number: { type: "string" },
      note: { type: "string" },
      corrected: { type: "boolean" },
      check: { type: "boolean" },
    },
  });
  const { command, args } = commandOf(positionals);
  const spec = COMMANDS[command];
  const unknown = Object.keys(values).filter((option) => !spec?.options.includes(option));
  // --poster is accepted only as --no-poster: the first file is the poster by default.
  if (!spec || !spec.positionals(args.length) || unknown.length > 0 || values.poster === true) {
    throw new Error(`wrong arguments\n${USAGE}`);
  }
  const check = values.check ?? false;
  const record = values.record ? (readJsonRecord(values.record) as Record<string, unknown>) : undefined;
  if (command === "event") {
    const result = await stageEvent(env, {
      id: eventId(values.id, record, values.corrected ?? false),
      files: Array.from({ length: args.length / 2 }, (_, i) => ({ source: args[2 * i], label: args[2 * i + 1] })),
      noPoster: values.poster === false,
      corrected: values.corrected,
      record,
      check,
    });
    const files = result.written.map((f) => join(env.newsDir, f));
    return { ...result, format: files.length > 0 ? { files, tests: "src/content/news" } : undefined };
  }
  if (command.startsWith("sheet")) return runSheetCommand(env, command, args[0], values, record, check);
  // --from names a sheet's first day for `stage sheet` and an issue's old id here.
  if ((values.from === undefined) === (args.length === 0)) throw new Error(`wrong arguments\n${USAGE}`);
  const issue = petrklicArgsSchema.safeParse(values);
  if (!issue.success) throw new Error(`wrong arguments: --year and --number are whole numbers\n${USAGE}`);
  const { year, number } = issue.data;
  const { lines, written } = await stagePetrklic(env, {
    source: args[0],
    year,
    number,
    note: values.note,
    corrected: values.corrected,
    from: values.from,
    check,
  });
  return { lines, format: written.length > 0 ? { files: written, tests: "src/content/petrklic.test.ts" } : undefined };
}

/** Stages from the command line `args` and prints the lines; then formats and tests the files. */
export async function execute(args: string[]) {
  const { lines, format } = await runStage(defaultEnv(), args);
  console.log(lines.join("\n"));
  if (format) await formatAndTest(format.files, format.tests);
}
