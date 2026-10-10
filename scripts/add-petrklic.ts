// Adds a Petrklíč issue to src/content/petrklic.json for `pnpm stage petrklic` (scripts/stage/petrklic.ts,
// farnost-create-petrklic skill): newest first, before the issues it is not older than; a corrected PDF (`rev`)
// replaces the issue's record where it is. The issue's rules are
// petrklicRecordSchema's (src/lib/petrklic/schema.ts); its id and URLs are computed (toIssue()).

import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import * as z from "zod";
import type { PetrklicFile, PetrklicRecord } from "@/content/types/petrklic";
import { isNewerIssue, issueId, issueLabel } from "@/lib/petrklic/issues";
import { petrklicFileSchema, petrklicRecordSchema } from "@/lib/petrklic/schema";

/** The issues in `file`, checked by petrklicFileSchema; a broken file throws, naming it. */
export function readPetrklic(file: string): PetrklicFile {
  const name = relative(process.cwd(), file);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${name} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }
  const parsed = petrklicFileSchema.safeParse(data);
  if (!parsed.success) throw new Error(`${name} is not valid:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

export type AddPetrklicResult = {
  record: PetrklicRecord;
  id: string;
  /** 1-based, newest first: 1 is the current issue. */
  position: number;
  /** The record replaced the issue's record (a corrected PDF, `rev`). */
  replaced: boolean;
  /** The file written, for formatAndTest; empty with `check`. */
  written: string[];
};

/**
 * Adds `input` (year, number, note, rev, pageCount) to `file` before the first issue it is not older than (a new
 * part goes before the older parts) and returns what it did; `check` only validates. With a `rev` (a corrected PDF)
 * it replaces the issue's record instead, which must be there with no later rev; the same rev again is allowed, for
 * rerunning the command before the release. Throws before writing anything.
 */
export function addPetrklic(file: string, input: unknown, { check = false } = {}): AddPetrklicResult {
  const parsed = petrklicRecordSchema.safeParse(input);
  if (!parsed.success) throw new Error(`the issue is not valid:\n${z.prettifyError(parsed.error)}`);
  const record = parsed.data;
  const id = issueId(record);
  const { issues } = readPetrklic(file);
  const at = issues.findIndex((issue) => issueId(issue) === id);
  let list: PetrklicRecord[];
  if (record.rev === undefined) {
    if (at !== -1) {
      const next = (issues[at].rev ?? 1) + 1;
      throw new Error(`the issue ${id} is already in petrklic.json; for a corrected PDF pass --rev ${next}`);
    }
    const before = issues.findIndex((issue) => !isNewerIssue(issue, record));
    list = before === -1 ? [...issues, record] : issues.toSpliced(before, 0, record);
  } else {
    if (at === -1) throw new Error(`the issue ${id} is not in petrklic.json: --rev is for a corrected PDF of an issue`);
    const current = issues[at].rev ?? 1;
    if (record.rev < current) throw new Error(`the issue ${id} already has rev ${current}: pass --rev ${current + 1}`);
    list = issues.toSpliced(at, 1, record);
  }
  if (!check) writeFileSync(file, `${JSON.stringify({ issues: list } satisfies PetrklicFile, null, 2)}\n`);
  return { record, id, position: list.indexOf(record) + 1, replaced: at !== -1, written: check ? [] : [file] };
}

/** The line the stage command prints for `result`. */
export function petrklicLines({ record, position, replaced }: AddPetrklicResult, check: boolean): string[] {
  const where = position === 1 ? "the current issue" : "not the current issue: newer issues come first";
  const verb = replaced ? (check ? "Would replace" : "Replaced") : check ? "Would add" : "Added";
  const rev = replaced ? ` with rev ${record.rev}` : "";
  return [
    `${verb} ${issueLabel(record)}${rev} (${record.pageCount} pages) at position ${position} in src/content/petrklic.json (${where})`,
  ];
}
