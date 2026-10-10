// Adds a change the parish announces for a day after the last ohlášky sheet to src/content/schedule-exceptions.json
// (farnost-create-vyjimka skill), so the next-mass countdown is right before that week's ohlášky arrive. The
// record is one ScheduleException: it replaces its whole day (`services: []` cancels it), so it lists every service of
// that date at the parish churches. A record for a date already there replaces it; the entries stay in date order.
// A date a sheet covers is refused (the sheet is corrected instead), and so is a past one. Prettier formats the file,
// then the ohlášky tests run.
//
// Usage: pnpm add-exception <record.json> | --remove <YYYY-MM-DD> [--check]
// --remove takes the change on that date out (an announcement withdrawn). --check only validates and prints what
// would change, without writing.

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import * as z from "zod";
import type { ScheduleException, ScheduleExceptionsFile } from "@/content/types/services";
import type { IsoDate } from "@/content/types/shared";
import { scheduleExceptionSchema } from "@/lib/services/schema";
import { pragueDate } from "@/lib/shared/prague";
import { errorMessage } from "../command";
import { EXCEPTIONS_FILE, formatAndTest, OHLASKY_FILE, OHLASKY_TESTS, writeContentFile } from "../content-files";
import { readOhlasky, readScheduleExceptions } from "./add-ohlasky";

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
 * written, for a record that breaks the schema, a date on or before the last sheet's `validTo` in `ohlaskyFile`, a
 * past date, or a removal of a date that has no entry.
 */
export function addException(
  { ohlaskyFile, exceptionsFile }: { ohlaskyFile: string; exceptionsFile: string },
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
    const parsed = scheduleExceptionSchema.safeParse(change.add);
    if (!parsed.success) throw new Error(`the record is not valid:\n${z.prettifyError(parsed.error)}`);
    exception = parsed.data;
    date = exception.date;
    const lastDay = readOhlasky(ohlaskyFile).sheets.reduce<IsoDate>((d, s) => (s.validTo > d ? s.validTo : d), "");
    if (date <= lastDay) {
      throw new Error(`a sheet covers ${date} (the last one ends on ${lastDay}): correct that sheet instead`);
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
  if (!exception) return `${check ? "Would remove" : "Removed"} the change on ${date} from ${file}`;
  const verb = replaced ? (check ? "Would replace" : "Replaced") : check ? "Would add" : "Added";
  const reason = exception.reason ? ` (${exception.reason})` : "";
  return `${verb} the change on ${date}${reason} ${replaced ? "in" : "to"} ${file}: ${servicesOf(exception)}`;
}

const USAGE = "Usage: pnpm add-exception <record.json> | --remove <YYYY-MM-DD> [--check]";

/**
 * Reads the command line `args`: the record file (read as JSON) or --remove with its date, and --check. An unknown
 * option throws with the usage, so a typo of --check never writes.
 */
export function parseCommand(args: string[]): { change: ExceptionChange; check: boolean } {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: { remove: { type: "string" }, check: { type: "boolean" } },
    });
  } catch (error) {
    throw new Error(`${errorMessage(error)}\n${USAGE}`);
  }
  const { positionals, values } = parsed;
  const check = values.check ?? false;
  if (values.remove !== undefined) {
    if (positionals.length > 0 || !/^\d{4}-\d{2}-\d{2}$/.test(values.remove)) throw new Error(USAGE);
    return { change: { remove: values.remove }, check };
  }
  if (positionals.length !== 1) throw new Error(USAGE);
  let record: unknown;
  try {
    record = JSON.parse(readFileSync(positionals[0], "utf8"));
  } catch (error) {
    throw new Error(`${positionals[0]} is not a JSON file: ${errorMessage(error)}`);
  }
  return { change: { add: record }, check };
}

/** Runs `pnpm add-exception` (scripts/add-exception.ts). */
export async function execute({ change, check }: { change: ExceptionChange; check: boolean }) {
  const result = addException({ ohlaskyFile: OHLASKY_FILE, exceptionsFile: EXCEPTIONS_FILE }, change, { check });
  console.log(exceptionLine(result, check));
  if (result.written.length > 0) await formatAndTest(result.written, OHLASKY_TESTS);
}
