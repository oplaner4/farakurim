// Adds a Petrklíč issue to src/content/petrklic.json: newest first, before the issues it is not older than; a
// corrected PDF replaces the issue's record where it is, and an issue whose year, number or note was wrong moves to
// its new place. The issue's rules are petrklicRecordSchema's
// (src/lib/petrklic/schema.ts); its id and URLs are computed (toIssue()).

import type { PetrklicFile, PetrklicRecord } from "@/content/types/petrklic";
import { isNewerIssue, issueId, issueLabel } from "@/lib/petrklic/issues";
import { petrklicFileSchema, petrklicRecordSchema } from "@/lib/petrklic/schema";
import { parseOrThrow, readJsonFile } from "@/lib/shared/json-file";
import { actionVerb } from "../command";
import { writeContentFile } from "../content-files";

/** The issues in `file`, checked by petrklicFileSchema; a broken file throws, naming it. */
export const readPetrklic = (file: string): PetrklicFile => readJsonFile(file, petrklicFileSchema);

export type AddPetrklicResult = {
  record: PetrklicRecord;
  id: string;
  /** 1-based, newest first: 1 is the current issue. */
  position: number;
  /** The record replaced the issue's record (a corrected PDF). */
  replaced: boolean;
  /** The id of the issue the record replaced under a new id (a wrong year, number or note). */
  from?: string;
  /** The file written, for formatAndTest; empty with `check`. */
  written: string[];
};

/**
 * Adds `input` (year, number, note, rev, pageCount) to `file` before the first issue it is not older than (a new
 * part goes before the older parts) and returns what it did; `check` only validates. With `replace` (a corrected
 * PDF) it replaces the issue's record instead, which must be there; with `from` (an issue's old id) the record takes
 * that issue's place under its new id, sorted again. Throws before writing anything.
 */
export function addPetrklic(
  file: string,
  input: unknown,
  { check = false, replace = false, from }: { check?: boolean; replace?: boolean; from?: string } = {},
): AddPetrklicResult {
  const record = parseOrThrow(petrklicRecordSchema, input, "the issue");
  const id = issueId(record);
  let { issues } = readPetrklic(file);
  if (from !== undefined) {
    if (from === id) throw new Error(`the issue keeps its id ${id}: --from is for a new year, number or note`);
    const old = issues.findIndex((issue) => issueId(issue) === from);
    if (old === -1) throw new Error(`the issue ${from} is not in petrklic.json`);
    issues = issues.toSpliced(old, 1);
  }
  const at = issues.findIndex((issue) => issueId(issue) === id);
  let list: PetrklicRecord[];
  if (replace) {
    if (at === -1)
      throw new Error(`the issue ${id} is not in petrklic.json: --corrected is for an issue already there`);
    list = issues.toSpliced(at, 1, record);
  } else {
    if (at !== -1) throw new Error(`the issue ${id} is already in petrklic.json; for a corrected PDF pass --corrected`);
    const before = issues.findIndex((issue) => !isNewerIssue(issue, record));
    list = before === -1 ? [...issues, record] : issues.toSpliced(before, 0, record);
  }
  if (!check) writeContentFile(file, { issues: list } satisfies PetrklicFile);
  return {
    record,
    id,
    position: list.indexOf(record) + 1,
    replaced: replace,
    ...(from !== undefined && { from }),
    written: check ? [] : [file],
  };
}

/** The line the stage command prints for `result`. */
export function petrklicLines({ record, position, replaced, from }: AddPetrklicResult, check: boolean): string[] {
  const where = position === 1 ? "the current issue" : "not the current issue: newer issues come first";
  const verb =
    from !== undefined
      ? `${actionVerb(check, "replace")} ${from} with`
      : actionVerb(check, replaced ? "replace" : "add");
  const rev = replaced && record.rev ? ` with rev ${record.rev}` : "";
  return [
    `${verb} ${issueLabel(record)}${rev} (${record.pageCount} pages) at position ${position} in src/content/petrklic.json (${where})`,
  ];
}
