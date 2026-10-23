// The "Mirror in the calendar" list of a service sheet PR: one Czech line per day of each sheet that is new or
// changed against a base service-sheets.json, its services without the intentions, to check against the
// "Bohoslužby" calendar. Built from the sheets, so it shows exactly what is published.

import { isDeepStrictEqual } from "node:util";
import { places } from "@/content/masses";
import { PLACE_IDS, type PlaceId, type ServiceSheetRecord, type SheetDay } from "@/content/types/services";
import { formatWeekdayDate } from "@/lib/shared/czech";
import { parseCommandLine } from "../command";
import { SERVICE_SHEETS_FILE } from "../content-files";
import { readServiceSheets } from "./add-service-sheet";

const MIRROR_HEADING = "## Mirror in the calendar";

const placeName = (place: string) => (PLACE_IDS.includes(place as PlaceId) ? places[place as PlaceId].name : place);

/** "Ne 18. 10. (Slavnost posvěcení kostela): 8:00 Kuřim – Mše sv.; 11:00 Moravské Knínice – Mše sv." */
export function dayLine({ date, feast, rows }: SheetDay): string {
  const services = rows.map(({ time, place, title }) => `${time} ${placeName(place)} – ${title}`).join("; ");
  return `- ${formatWeekdayDate(date)}${feast ? ` (${feast})` : ""}: ${services || "bez bohoslužeb"}`;
}

/** The sheets of `sheets` that `base` lacks or holds otherwise, in `sheets`' order. */
export const changedSheets = (sheets: ServiceSheetRecord[], base: ServiceSheetRecord[]) =>
  sheets.filter((sheet) => !base.some((other) => isDeepStrictEqual(sheet, other)));

/** The section, heading first; empty when no sheet changed. */
export function mirrorSection(sheets: ServiceSheetRecord[], base: ServiceSheetRecord[]): string {
  const days = changedSheets(sheets, base).flatMap((sheet) => sheet.days);
  return days.length === 0 ? "" : [MIRROR_HEADING, "", ...days.map(dayLine)].join("\n");
}

const USAGE = "Usage: pnpm --silent sheet-mirror <base service-sheets.json>";

/** Reads the command line `args`: the base file. */
export function parseCommand(args: string[]): { baseFile: string } {
  const { positionals } = parseCommandLine(args, {}, USAGE);
  if (positionals.length !== 1) throw new Error(USAGE);
  return { baseFile: positionals[0] };
}

/** Prints the section for src/content/service-sheets.json against `baseFile`. */
export function execute({ baseFile }: { baseFile: string }) {
  const section = mirrorSection(readServiceSheets(SERVICE_SHEETS_FILE).sheets, readServiceSheets(baseFile).sheets);
  if (section) console.log(section);
}
