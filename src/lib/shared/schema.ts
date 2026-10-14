import * as z from "zod";
import { CLOCK } from "./clock";
import { UPLOAD } from "./uploads";

// The content field rules several content schemas share (src/lib/<group>/schema.ts). They live apart from the helpers
// they check (clock.ts, slug.ts, uploads.ts, revision.ts) because browser code imports those helpers, and zod's
// classic API cannot be tree-shaken: a schema next to a helper would ship all of zod to every page that uses it.

/** A content field holding a clock time ("9:30", CLOCK). */
export const clockSchema = z.string().regex(CLOCK, "must be H:MM");

/** A content id: ASCII kebab-case, as slug() makes it ("pout-na-vranov-2026"). */
export const kebabIdSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be ASCII kebab-case");

/** A content field linking an uploaded file (isUpload()). */
export const uploadSchema = z.string().regex(UPLOAD, "must be a /uploads/… file");

/** A stored rev of a corrected upload (revSuffix()): 2 or more, left out for the first PDF. */
export const revSchema = z.int().min(2, "must be 2 or more (the first PDF has no rev)").optional();
