// The result file of the service sheet stage runs: each run that drafts or stages a week writes what it did, the last
// one wins, so the file holds the week's final state after any retries.

import { existsSync } from "node:fs";
import { parseOrThrow } from "@/lib/shared/parse";
import { readJsonRecord } from "../command";
import { writeContentFile } from "../content-files";
import { sheetResultSchema, type SheetResult } from "./sheet-result-schema";

/** Writes `result` to `file`, replacing an earlier run's. */
export const writeSheetResult = (file: string, result: SheetResult) => writeContentFile(file, result);

/** The result in `file`; none when no run wrote one. A file that breaks the schema throws, naming it. */
export const readSheetResult = (file: string): SheetResult | undefined =>
  existsSync(file) ? parseOrThrow(sheetResultSchema, readJsonRecord(file), file) : undefined;
