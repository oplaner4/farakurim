// Replaces the record of a service sheet already in src/content/service-sheets.json, keeping its PDF and rev: a
// correction of the record alone, which stages nothing. It prints what differs from the sheet (`Changed: …`).

import * as z from "zod";
import { period } from "@/lib/services/service-sheet";
import { addServiceSheet, readServiceSheets, serviceSheetLines, type SheetFiles } from "./add-service-sheet";
import { sheetChanges } from "./sheet-changes";
import { changedLine } from "../changes";
import { parseCommandLine, readJsonRecord } from "../command";
import { EXCEPTIONS_FILE, formatAndTest, NEWS_DIR, SERVICE_SHEETS_FILE, SERVICE_SHEETS_TESTS } from "../content-files";

export type ReplaceSheetOptions = {
  validFrom: string;
  validTo: string;
  /** The sheet's corrected record (days and announcements). */
  record: unknown;
  check?: boolean;
};

/**
 * Replaces the record of the sheet of `validFrom` to `validTo`, keeping its PDF and rev; `check` only validates.
 * Returns the lines to print (ending with what changed) and the files written.
 */
export function replaceSheet(files: SheetFiles, { validFrom, validTo, record, check = false }: ReplaceSheetOptions) {
  const current = readServiceSheets(files.serviceSheetsFile).sheets.find(
    (sheet) => sheet.validFrom === validFrom && sheet.validTo === validTo,
  );
  if (!current) throw new Error(`no sheet of ${period({ validFrom, validTo })} is added`);
  const week = { validFrom, validTo, ...(current.rev !== undefined && { rev: current.rev }) };
  const result = addServiceSheet(files, record, week, { check });
  const changed = changedLine(sheetChanges(current, result.sheet));
  return { lines: [...serviceSheetLines(result, check), changed], written: result.written };
}

const USAGE = "Usage: pnpm replace-sheet <record.json | -> --from YYYY-MM-DD --to YYYY-MM-DD [--check]";

/** Reads the command line `args`: the record file (`-` for stdin), the sheet's --from and --to, and --check. */
export function parseCommand(args: string[]): ReplaceSheetOptions {
  const options = { from: { type: "string" }, to: { type: "string" }, check: { type: "boolean" } } as const;
  const { positionals, values } = parseCommandLine(args, options, USAGE);
  const week = z.object({ from: z.iso.date(), to: z.iso.date() }).safeParse(values);
  if (positionals.length !== 1 || !week.success) throw new Error(USAGE);
  const { from: validFrom, to: validTo } = week.data;
  return { validFrom, validTo, record: readJsonRecord(positionals[0]), check: values.check ?? false };
}

/** Replaces the sheet's record and prints what changed; then formats and tests the file written. */
export async function execute(options: ReplaceSheetOptions) {
  const files = { serviceSheetsFile: SERVICE_SHEETS_FILE, exceptionsFile: EXCEPTIONS_FILE, newsDir: NEWS_DIR };
  const { lines, written } = replaceSheet(files, options);
  console.log(lines.join("\n"));
  if (written.length > 0) await formatAndTest(written, SERVICE_SHEETS_TESTS);
}
