import "server-only";
import data from "@/content/service-sheets.json";
import type { ServiceSheet } from "@/content/types/services";
import { serviceSheetsFileSchema } from "@/lib/services/schema";
import { parseOrThrow } from "@/lib/shared/parse";
import { toSheet } from "@/lib/services/service-sheet";

// The service sheets (src/content/service-sheets.json, written by `pnpm stage-content sheet … --record`,
// parish-create-service-sheet skill): the sheets sorted by validFrom (each PDF's URL computed from validFrom and rev),
// consecutive ones sharing at most their boundary day (the newer wins it). The site shows the sheet whose week has
// started last (currentSheet(), in the browser); the changes announced for later are
// src/content/schedule-exceptions.ts. Checked on import, so a broken file fails the build naming the field.
// Server-only: the whole file must not reach a client bundle, so client components get what they need as props, never
// this module.

const parsed = parseOrThrow(serviceSheetsFileSchema, data, "src/content/service-sheets.json");

/** The sheets, with the URLs of their PDFs (toSheet()). */
export const serviceSheets: ServiceSheet[] = parsed.sheets.map(toSheet);
