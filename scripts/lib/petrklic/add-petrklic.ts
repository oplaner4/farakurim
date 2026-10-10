// Adds a Petrklíč issue to src/content/petrklic.json for `pnpm stage petrklic` (scripts/lib/stage/petrklic.ts,
// farnost-create-petrklic skill): newest first, before the issues it is not older than; a corrected PDF replaces
// the issue's record where it is. The issue's rules are
// petrklicRecordSchema's (src/lib/petrklic/schema.ts); its id and URLs are computed (toIssue()).

import * as z from "zod";
import type { PetrklicFile, PetrklicRecord } from "@/content/types/petrklic";
import { isNewerIssue, issueId, issueLabel } from "@/lib/petrklic/issues";
import { petrklicFileSchema, petrklicRecordSchema } from "@/lib/petrklic/schema";
import { readJsonFile } from "@/lib/shared/json-file";
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
  /** The file written, for formatAndTest; empty with `check`. */
  written: string[];
};

/**
 * Adds `input` (year, number, note, rev, pageCount) to `file` before the first issue it is not older than (a new
 * part goes before the older parts) and returns what it did; `check` only validates. With `replace` (a corrected
 * PDF) it replaces the issue's record instead, which must be there. Throws before writing anything.
 */
export function addPetrklic(file: string, input: unknown, { check = false, replace = false } = {}): AddPetrklicResult {
  const parsed = petrklicRecordSchema.safeParse(input);
  if (!parsed.success) throw new Error(`the issue is not valid:\n${z.prettifyError(parsed.error)}`);
  const record = parsed.data;
  const id = issueId(record);
  const { issues } = readPetrklic(file);
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
  return { record, id, position: list.indexOf(record) + 1, replaced: replace, written: check ? [] : [file] };
}

/** The line the stage command prints for `result`. */
export function petrklicLines({ record, position, replaced }: AddPetrklicResult, check: boolean): string[] {
  const where = position === 1 ? "the current issue" : "not the current issue: newer issues come first";
  const verb = replaced ? (check ? "Would replace" : "Replaced") : check ? "Would add" : "Added";
  const rev = replaced && record.rev ? ` with rev ${record.rev}` : "";
  return [
    `${verb} ${issueLabel(record)}${rev} (${record.pageCount} pages) at position ${position} in src/content/petrklic.json (${where})`,
  ];
}
