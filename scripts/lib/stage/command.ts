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
import { draftSheet, replaceSheetRecord, stageSheet } from "./sheet";

const USAGE = `Usage: pnpm stage event <id> <source> <label> [<source> <label> …] [--no-poster] [--corrected] [--record <json>] [--check]
       pnpm stage sheet <pdf|docx> [--from YYYY-MM-DD --to YYYY-MM-DD] [--corrected] [--record <json>] [--check]
       pnpm stage sheet draft <docx> --out <json> [--from YYYY-MM-DD --to YYYY-MM-DD] [--corrected]
       pnpm stage sheet replace --from YYYY-MM-DD --to YYYY-MM-DD --record <json> [--check]
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

/** Each command's count of positional arguments and its options; `sheet draft` and `sheet replace` are their own. */
const COMMANDS: Record<string, { positionals: (count: number) => boolean; options: string[] }> = {
  // The id, then source and label pairs.
  event: { positionals: (n) => n >= 3 && n % 2 === 1, options: ["poster", "corrected", "record", "check"] },
  // The PDF or DOCX.
  sheet: { positionals: (n) => n === 1, options: ["from", "to", "corrected", "record", "check"] },
  // The DOCX.
  "sheet draft": { positionals: (n) => n === 1, options: ["from", "to", "corrected", "out"] },
  // No source: the record of the sheet --from and --to name.
  "sheet replace": { positionals: (n) => n === 0, options: ["from", "to", "record", "check"] },
  // The PDF, or none with --from (the issue's own PDF).
  petrklic: { positionals: (n) => n <= 1, options: ["year", "number", "note", "corrected", "from", "check"] },
};

/** The arguments of `sheet replace`, which needs --from, --to and --record. */
function sheetToReplace(validFrom?: string, validTo?: string, record?: Record<string, unknown>, check = false) {
  if (!validFrom || !validTo || !record) {
    throw new Error(`wrong arguments: sheet replace needs --from, --to and --record\n${USAGE}`);
  }
  return { validFrom, validTo, record, check };
}

/** The command a command line names (`sheet draft` and `sheet replace` take two words) and its arguments. */
function commandOf([name = "", ...rest]: string[]): { command: string; args: string[] } {
  const sub = name === "sheet" && (rest[0] === "draft" || rest[0] === "replace");
  return sub ? { command: `${name} ${rest[0]}`, args: rest.slice(1) } : { command: name, args: rest };
}

type StageResult = { lines: string[]; format?: { files: string[]; tests: string | string[] } };

/** Runs `sheet`, `sheet draft` or `sheet replace` with their checked arguments. */
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
  const { lines, written } =
    command === "sheet replace"
      ? replaceSheetRecord(env, sheetToReplace(validFrom, validTo, record, check))
      : await stageSheet(env, { source, validFrom, validTo, corrected, record, check });
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
    const [id, ...pairs] = args;
    const result = await stageEvent(env, {
      id,
      files: Array.from({ length: pairs.length / 2 }, (_, i) => ({ source: pairs[2 * i], label: pairs[2 * i + 1] })),
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
