// Adds a change for a day no service sheet covers to the later changes, so the next-mass countdown is right before
// that week's service sheet arrives, or removes one. The record is one ScheduleException: it replaces its whole day
// (`services: []` cancels it); a record for a date already there replaces it, and the entries stay in date order. A
// date a sheet covers is refused (the sheet is corrected instead), and so is a past one. A draft writes the record of a
// date as it stands, to edit: its change, or else its regular services.

import { regularServices } from "@/content/masses";
import type { RegularService, ScheduleException, ScheduleExceptionsFile, ServiceEntry } from "@/content/types/services";
import type { IsoDate } from "@/content/types/shared";
import { servicesOnDate } from "@/lib/services/masses";
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
import { next, refusal } from "../output";
import { readServiceSheets, readScheduleExceptions } from "./add-service-sheet";

export type ExceptionChange = { add: unknown } | { remove: IsoDate };

export type AddExceptionResult = {
  date: IsoDate;
  /** The entry added (or replacing one); none for a removal. */
  exception?: ScheduleException;
  /** For a removal, the regular services the day gets back. */
  regular?: ServiceEntry[];
  /** An entry of the same date was replaced or removed. */
  replaced: boolean;
  /** The file written, for formatAndTest; empty with `check`. */
  written: string[];
};

/** Throws for a date a sheet in `serviceSheetsFile` covers (naming the sheet to correct) or a past one. */
function refuseDate(serviceSheetsFile: string, date: IsoDate, now: Date) {
  const sheet = sheetCovering(readServiceSheets(serviceSheetsFile).sheets, date);
  if (sheet) throw refusal(`the sheet ${period(sheet)} covers ${date}`, next(`correct the sheet ${period(sheet)}`));
  if (date < pragueDate(now)) throw new Error(`${date} is past`);
}

/**
 * Applies `change` to `exceptionsFile` and returns what it did; `check` only validates. Throws, before anything is
 * written, for a record that breaks the schema, a date a sheet in `serviceSheetsFile` covers, a past date, or a removal of
 * a date that has no entry.
 */
export function addException(
  { serviceSheetsFile, exceptionsFile }: { serviceSheetsFile: string; exceptionsFile: string },
  change: ExceptionChange,
  {
    check = false,
    now = new Date(),
    regular = regularServices,
  }: { check?: boolean; now?: Date; regular?: RegularService[] } = {},
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
    refuseDate(serviceSheetsFile, date, now);
  }
  const replaced = exceptions.some((x) => x.date === date);
  const written: string[] = [];
  if (!check) {
    const kept = exceptions.filter((x) => x.date !== date);
    const list = exception ? [...kept, exception].sort((a, b) => (a.date < b.date ? -1 : 1)) : kept;
    writeContentFile(exceptionsFile, { exceptions: list } satisfies ScheduleExceptionsFile);
    written.push(exceptionsFile);
  }
  const back = exception ? undefined : servicesOnDate(date, { regular, exceptions: [] });
  return { date, exception, ...(back && { regular: back }), replaced, written };
}

export type DraftExceptionResult = {
  draft: ScheduleException;
  /** The draft is the date's change; otherwise it holds the regular services. */
  fromChange: boolean;
  out: string;
};

/**
 * Writes the record of `date` as it stands to `out`, to edit and add: the change on it, or else a record of its regular
 * services (with no reason). Throws, before writing, for a date a sheet covers or a past one.
 */
export function draftException(
  { serviceSheetsFile, exceptionsFile }: { serviceSheetsFile: string; exceptionsFile: string },
  { date, out }: { date: IsoDate; out: string },
  { now = new Date(), regular = regularServices }: { now?: Date; regular?: RegularService[] } = {},
): DraftExceptionResult {
  refuseDate(serviceSheetsFile, date, now);
  const change = readScheduleExceptions(exceptionsFile).exceptions.find((x) => x.date === date);
  const draft = change ?? { date, services: servicesOnDate(date, { regular, exceptions: [] }) };
  writeContentFile(out, draft);
  return { draft, fromChange: change !== undefined, out };
}

/** "3 services: 8:00 kurim, …" or "no services", for the lines. */
const servicesOf = (services: ServiceEntry[]) =>
  services.length === 0
    ? "no services"
    : `${services.length} ${services.length === 1 ? "service" : "services"}: ${services
        .map((s) => `${s.time} ${s.place}${s.title ? ` ${s.title}` : ""}`)
        .join(", ")}`;

/** The line saying what addException() did (or would do, with `check`). */
export function exceptionLine({ date, exception, regular, replaced }: AddExceptionResult, check: boolean): string {
  if (!exception) {
    const back = regular ? `; the day gets back its regular ${servicesOf(regular)}` : "";
    return `${actionVerb(check, "remove")} the change on ${date}${back}`;
  }
  const verb = actionVerb(check, replaced ? "replace" : "add");
  const reason = exception.reason ? ` (${exception.reason})` : "";
  return `${verb} the change on ${date}${reason}: ${servicesOf(exception.services)}`;
}

/** The line saying what draftException() wrote. */
export function draftLine({ draft, fromChange, out }: DraftExceptionResult): string {
  const source = fromChange ? "its change" : "the regular schedule";
  return `Wrote the draft record of ${draft.date} (${source}) to ${out}: ${servicesOf(draft.services)}`;
}

const USAGE =
  "Usage: pnpm add-exception <record.json> | --remove <YYYY-MM-DD> [--check] | --draft <YYYY-MM-DD> --out <record.json>";

export type ExceptionCommand = { change: ExceptionChange; check: boolean } | { draft: IsoDate; out: string };

const isDate = (value: string) => scheduleExceptionSchema.shape.date.safeParse(value).success;

/**
 * Reads the command line `args`: the record file (read as JSON) or --remove with its date, and --check; or --draft
 * with its date and --out. An unknown option throws with the usage, so a typo of --check never writes.
 */
export function parseCommand(args: string[]): ExceptionCommand {
  const options = {
    remove: { type: "string" },
    check: { type: "boolean" },
    draft: { type: "string" },
    out: { type: "string" },
  } as const;
  const { positionals, values } = parseCommandLine(args, options, USAGE);
  if (values.draft !== undefined || values.out !== undefined) {
    const { draft, out } = values;
    const extra = positionals.length > 0 || values.remove !== undefined || values.check !== undefined;
    if (extra || draft === undefined || !isDate(draft) || !out) throw new Error(USAGE);
    return { draft, out };
  }
  const check = values.check ?? false;
  if (values.remove !== undefined) {
    if (positionals.length > 0 || !isDate(values.remove)) throw new Error(USAGE);
    return { change: { remove: values.remove }, check };
  }
  if (positionals.length !== 1) throw new Error(USAGE);
  return { change: { add: readJsonRecord(positionals[0]) }, check };
}

/** Writes the draft, or adds or removes the change, and prints it; then formats and tests the file written. */
export async function execute(command: ExceptionCommand) {
  const files = { serviceSheetsFile: SERVICE_SHEETS_FILE, exceptionsFile: EXCEPTIONS_FILE };
  if ("draft" in command) {
    console.log(draftLine(draftException(files, { date: command.draft, out: command.out })));
    return;
  }
  const { change, check } = command;
  const result = addException(files, change, { check });
  console.log(exceptionLine(result, check));
  if (result.written.length > 0) await formatAndTest(result.written, SERVICE_SHEETS_TESTS);
}
