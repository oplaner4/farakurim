// Adds a change for a day no service sheet covers to the later changes, so the next-mass countdown is right before
// that week's service sheet arrives, or removes one. The record is one ScheduleException: it replaces its whole day
// (`services: []` cancels it); a record for a date already there replaces it, and the entries stay in date order. A
// date a sheet covers is refused (the sheet is corrected instead), and so is a past one.

import type { ScheduleException, ScheduleExceptionsFile } from "@/content/types/services";
import type { IsoDate } from "@/content/types/shared";
import { scheduleExceptionSchema } from "@/lib/services/schema";
import { period, sheetCovering } from "@/lib/services/service-sheet";
import { parseOrThrow } from "@/lib/shared/json-file";
import { pragueDate } from "@/lib/shared/prague";
import { actionVerb, parseCommandLine, readJsonRecord } from "../command";
import {
  EXCEPTIONS_FILE,
  formatAndTest,
  SERVICE_SHEETS_FILE,
  SERVICE_SHEETS_TESTS,
  writeContentFile,
} from "../content-files";
import { readServiceSheets, readScheduleExceptions } from "./add-service-sheet";

export type ExceptionChange = { add: unknown } | { remove: IsoDate };

export type AddExceptionResult = {
  date: IsoDate;
  /** The entry added (or replacing one); none for a removal. */
  exception?: ScheduleException;
  /** An entry of the same date was replaced or removed. */
  replaced: boolean;
  /** The file written, for formatAndTest; empty with `check`. */
  written: string[];
};

/**
 * Applies `change` to `exceptionsFile` and returns what it did; `check` only validates. Throws, before anything is
 * written, for a record that breaks the schema, a date a sheet in `serviceSheetsFile` covers, a past date, or a removal of
 * a date that has no entry.
 */
export function addException(
  { serviceSheetsFile, exceptionsFile }: { serviceSheetsFile: string; exceptionsFile: string },
  change: ExceptionChange,
  { check = false, now = new Date() } = {},
): AddExceptionResult {
  const { exceptions } = readScheduleExceptions(exceptionsFile);
  let exception: ScheduleException | undefined;
  let date: IsoDate;
  if ("remove" in change) {
    date = change.remove;
    if (!exceptions.some((x) => x.date === date)) throw new Error(`there is no change on ${date} to remove`);
  } else {
    exception = parseOrThrow(scheduleExceptionSchema, change.add, "the record");
    date = exception.date;
    const sheet = sheetCovering(readServiceSheets(serviceSheetsFile).sheets, date);
    if (sheet) {
      throw new Error(`the sheet ${period(sheet)} covers ${date}: correct that sheet instead`);
    }
    if (date < pragueDate(now)) throw new Error(`${date} is past`);
  }
  const replaced = exceptions.some((x) => x.date === date);
  const written: string[] = [];
  if (!check) {
    const kept = exceptions.filter((x) => x.date !== date);
    const list = exception ? [...kept, exception].sort((a, b) => (a.date < b.date ? -1 : 1)) : kept;
    writeContentFile(exceptionsFile, { exceptions: list } satisfies ScheduleExceptionsFile);
    written.push(exceptionsFile);
  }
  return { date, exception, replaced, written };
}

/** "3 services: 8:00 kurim, …" or "no services", for the lines. */
const servicesOf = ({ services }: ScheduleException) =>
  services.length === 0
    ? "no services"
    : `${services.length} ${services.length === 1 ? "service" : "services"}: ${services
        .map((s) => `${s.time} ${s.place}${s.title ? ` ${s.title}` : ""}`)
        .join(", ")}`;

/** The line saying what addException() did (or would do, with `check`). */
export function exceptionLine({ date, exception, replaced }: AddExceptionResult, check: boolean): string {
  const file = "src/content/schedule-exceptions.json";
  if (!exception) return `${actionVerb(check, "remove")} the change on ${date} from ${file}`;
  const verb = actionVerb(check, replaced ? "replace" : "add");
  const reason = exception.reason ? ` (${exception.reason})` : "";
  return `${verb} the change on ${date}${reason} ${replaced ? "in" : "to"} ${file}: ${servicesOf(exception)}`;
}

const USAGE = "Usage: pnpm add-exception <record.json> | --remove <YYYY-MM-DD> [--check]";

/**
 * Reads the command line `args`: the record file (read as JSON) or --remove with its date, and --check. An unknown
 * option throws with the usage, so a typo of --check never writes.
 */
export function parseCommand(args: string[]): { change: ExceptionChange; check: boolean } {
  const options = { remove: { type: "string" }, check: { type: "boolean" } } as const;
  const { positionals, values } = parseCommandLine(args, options, USAGE);
  const check = values.check ?? false;
  if (values.remove !== undefined) {
    if (positionals.length > 0 || !scheduleExceptionSchema.shape.date.safeParse(values.remove).success) {
      throw new Error(USAGE);
    }
    return { change: { remove: values.remove }, check };
  }
  if (positionals.length !== 1) throw new Error(USAGE);
  return { change: { add: readJsonRecord(positionals[0]) }, check };
}

/** Adds or removes the change and prints it; then formats and tests the file written. */
export async function execute({ change, check }: { change: ExceptionChange; check: boolean }) {
  const result = addException({ serviceSheetsFile: SERVICE_SHEETS_FILE, exceptionsFile: EXCEPTIONS_FILE }, change, {
    check,
  });
  console.log(exceptionLine(result, check));
  if (result.written.length > 0) await formatAndTest(result.written, SERVICE_SHEETS_TESTS);
}
