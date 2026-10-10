import "server-only";
import * as z from "zod";
import data from "@/content/ohlasky.json";
import type { ServiceSheet } from "@/content/types/services";
import { ohlaskyFileSchema } from "@/lib/services/schema";
import { toSheet } from "@/lib/services/service-sheet";

// The ohlášky (src/content/ohlasky.json, written by `pnpm stage porad … --record`, farnost-create-porad-bohosluzeb
// skill): the sheets sorted by validFrom (each PDF's URL computed from validFrom and rev), consecutive ones sharing at
// most their boundary day (the newer wins it). The site shows the sheet whose week has started last (currentSheet(),
// in the browser); the changes announced for later are src/content/schedule-exceptions.ts. Checked on import, so a broken file fails the build naming the field.
// Server-only: rows marked not public must never reach a client bundle, so client components get what they need as
// props, never this module.

const parsed = ohlaskyFileSchema.safeParse(data);
if (!parsed.success) throw new Error(`src/content/ohlasky.json is not valid:\n${z.prettifyError(parsed.error)}`);

/** The sheets, with the URLs of their PDFs (toSheet()). */
export const serviceSheets: ServiceSheet[] = parsed.data.sheets.map(toSheet);
