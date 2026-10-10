import * as z from "zod";

// The revision of a corrected upload: a Petrklíč issue (issueFolder()) or an ohlášky sheet (sheetPdfFile()). Files on
// the server are never overwritten, so a corrected PDF gets a new name ending in -r2, -r3, …, which
// `pnpm stage … --corrected` picks and stores as `rev` in the record.

/** A stored rev: 2 or more, left out for the first PDF. */
export const revSchema = z.int().min(2, "must be 2 or more (the first PDF has no rev)").optional();

/** "-r2" for rev 2, "" for the first PDF. */
export const revSuffix = (rev?: number) => (rev ? `-r${rev}` : "");
