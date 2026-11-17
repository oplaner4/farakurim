// Stages a service sheet PDF as porady_bohosluzeb/<validFrom>-porad-bohosluzeb[-r<rev>].pdf, with the week read from
// its source (sheet-source.ts: the PDF's heading, or the week's page of the parish's DOCX of the whole year), and adds
// the sheet (the record) to src/content/service-sheets.json (addServiceSheet()). The week is checked against the
// sheets first: one before the current sheet or overlapping another is refused. The sheet stores the rev, so a rerun
// keeps it and a corrected PDF gets the next one.
// draftSheet() runs the same checks without a record and stages nothing: it writes the week's draft record, names a
// week already there and lists the events an announcement can link, so the newsIds need no search of the news.
// With a result file (StageEnv.result), a draft or staging run writes what it did with its week (sheet-result.ts):
// drafted, staged, refused, or a document error when the parish's DOCX cannot be read.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addDays } from "date-fns";
import { readEvents } from "@/content/news";
import type { IsoDate } from "@/content/types/shared";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";
import { sheetPdfFile } from "@/lib/services/service-sheet";
import {
  addServiceSheet,
  placeSheet,
  serviceSheetLines,
  readServiceSheets,
  type SheetWeek,
} from "../services/add-service-sheet";
import { writeSheetResult } from "./sheet-result";
import type { SheetResult } from "./sheet-result-schema";
import { DocumentError, sourceWeek, type Known, type Week } from "./sheet-source";
import { eventLine, notEndedBy } from "../news/upcoming-events";
import { next, refusal, refusalReason, state } from "../output";
import { correctedHint, correctedRev, MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";

export type SheetOptions = {
  /** The PDF or DOCX. */
  source: string;
  validFrom?: string;
  validTo?: string;
  /** A corrected PDF of a week already in service-sheets.json. */
  corrected?: boolean;
  /** The confirmed sheet record (days and announcements), added to src/content/service-sheets.json. */
  record?: Record<string, unknown>;
  check?: boolean;
};

export type DraftOptions = Omit<SheetOptions, "record" | "check"> & {
  /** Where to write the week's draft record. */
  out: string;
};

/** A run of stageSheet() or draftSheet(): with `draft`, it writes the draft record there and stages nothing. */
type RunOptions = SheetOptions & { draft?: string };

/** The rev of the week's PDF: the sheet's, or with `corrected` the next one once the sheet's PDF is on the server. */
async function sheetRev(env: StageEnv, validFrom: string, corrected: boolean): Promise<number | undefined> {
  const current = readServiceSheets(env.serviceSheetsFile).sheets.find((sheet) => sheet.validFrom === validFrom);
  if (!corrected) return current?.rev;
  if (!current) throw refusal(`no sheet of ${validFrom} is added`, next("leave out --corrected for a new week"));
  return correctedRev(env, current.rev, (r) => sheetPdfFile({ validFrom, rev: r }));
}

/** How long before the week an event may have ended and still be announced (a thanks for it). */
const NEWS_DAYS_BEFORE = 14;

/** The lines listing the events an announcement of the week can link (`newsId`): those not ended 14 days before it. */
function newsLines(newsDir: string, validFrom: IsoDate): string[] {
  const from = pragueDate(addDays(pragueDateTime(validFrom, "12:00"), -NEWS_DAYS_BEFORE, { in: inPrague }));
  const events = notEndedBy(readEvents(newsDir), from).toSorted((a, b) => a.start.localeCompare(b.start));
  return [
    `Events for newsId (not ended by ${from}):`,
    ...(events.length ? events.map((e) => `  ${eventLine(e)}`) : ["  none"]),
  ];
}

/**
 * Writes the week's draft record to `out`: the DOCX's week (its newest, or the one --from and --to name) read from its
 * table and announcements, or the PDF's week without services. Checks the week as staging does, stages nothing and
 * prints the events its announcements can link. Returns the lines to print.
 */
export async function draftSheet(env: StageEnv, { out, ...options }: DraftOptions) {
  return runSheet(env, { ...options, draft: out, check: true });
}

/**
 * Stages the weekly PDF (or the week's page of the DOCX) and adds its sheet (the record); with `check` it only
 * validates the record. Returns the lines to print and the files written.
 */
export async function stageSheet(env: StageEnv, options: SheetOptions) {
  // A PDF staged without its sheet would go to the server with nothing linking it, and take the week's name there.
  if (!options.record) {
    throw refusal(
      "--record is required, also with --check",
      next("write the draft record with `pnpm stage-content sheet draft` first"),
    );
  }
  return runSheet(env, options);
}

/** The result of a run that failed with `error`: a document error or a refusal, with its first line and the week. */
function failedResult(error: unknown, week: Week | undefined): SheetResult {
  const reason = refusalReason(error instanceof Error ? error.message : String(error));
  return { ...week, result: error instanceof DocumentError ? "document-error" : "refused", reason };
}

/**
 * Runs the sheet command and, for a draft or a staging run (not a check), writes its result to `env.result`: drafted
 * or staged, or why it failed. A refusal is printed with the notes of the run, keeping its kind.
 */
async function runSheet(env: StageEnv, options: RunOptions) {
  const recorded = env.result !== undefined && (options.draft !== undefined || (!!options.record && !options.check));
  const record = (result: SheetResult) => {
    if (recorded) writeSheetResult(env.result!, result);
  };
  const known: Known = { notes: [] };
  try {
    const done = await runSheetWeek(env, options, known);
    record({ ...known.week!, result: options.draft !== undefined ? "drafted" : "staged" });
    return done;
  } catch (error) {
    record(failedResult(error, known.week));
    if (known.notes.length === 0 || !(error instanceof Error)) throw error;
    // The same error, so a DocumentError stays one; the message holds the refusal, the notes follow it.
    error.message = `${error.message}\n${known.notes.join("\n")}`;
    throw error;
  }
}

async function runSheetWeek(env: StageEnv, options: RunOptions, known: Known) {
  const { corrected = false, check = false } = options;
  const src = sourceFile(options.source, MAX_MB.sheet, env.home);
  const dir = mkdtempSync(join(tmpdir(), "sheet-"));
  try {
    const { pdf, week, lines } = await sourceWeek(env, src, options, dir, known);
    const { validFrom, validTo } = week;
    // Refuses a week before the current sheet or overlapping another before anything else, also for a draft.
    const there = placeSheet<SheetWeek>(readServiceSheets(env.serviceSheetsFile).sheets, week).replaced;
    const rev = await sheetRev(env, validFrom, corrected);
    const rel = sheetPdfFile({ validFrom, rev });
    const sheet = { validFrom, validTo, ...(rev !== undefined && { rev }) };
    // Validate before anything is copied, so a bad record leaves nothing staged.
    if (options.record) {
      const checked = addServiceSheet(env, options.record, sheet, { check: true });
      if (check) lines.push(...serviceSheetLines(checked, true));
    }
    // Each conversion writes a new file, so a DOCX's page replaces the one staged before (never one on the server).
    await stage(env, pdf, rel, check, correctedHint(), corrected || pdf !== src);
    if (options.draft !== undefined) {
      // Past the server check, so the week is not released: a record replaces its sheet, as a correction does.
      const note =
        there && !corrected
          ? [state("staged"), next("start the record from the staged sheet to keep its fixes; --record replaces it")]
          : [];
      return { lines: [...lines, ...newsLines(env.newsDir, validFrom), ...note], written: [] };
    }
    lines.push(stagedLine(check, rel));
    if (check) return { lines, written: [] };
    const result = addServiceSheet(env, options.record, sheet);
    lines.push(...serviceSheetLines(result, false));
    return { lines, written: result.written };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
