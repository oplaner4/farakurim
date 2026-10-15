// The revision of a corrected upload: a Petrklíč issue (issueFolder()) or a service sheet (sheetPdfFile()). An uploaded
// file is never replaced once released, so a corrected PDF gets a new name ending in -r2, -r3, …, which
// `pnpm stage … --corrected` picks and stores as `rev` in the record (revSchema in schema.ts).

/** "-r2" for rev 2, "" for the first PDF. */
export const revSuffix = (rev?: number) => (rev ? `-r${rev}` : "");

/** The rev in an uploaded file's name, after revSuffix(): "/uploads/aktuality/x-plakat-r2.pdf" → 2. */
export function fileRev(file: string): number | undefined {
  const rev = /-r(\d+)\.[^./]+$/.exec(file)?.[1];
  return rev ? Number(rev) : undefined;
}
