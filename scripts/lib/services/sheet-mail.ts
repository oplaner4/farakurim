// Fetches the service sheet e-mails of the parish's mailbox over IMAP (../mail/imap.ts). `fetchSheet` judges every
// unseen message (judgeMessage()), writes the newest sheet's DOCX and its sender's note (the mail's new text, if any)
// to a folder and moves nothing; `fileMessages` then moves the messages to `Zpracováno` or `Odmítnuto`. Nothing here
// marks a message seen. The week is the one a date in the subject names (sheet-subject.ts), else the DOCX's newest.
// The outcome and its summary lines carry uids, dates (Prague time), weeks and kinds only, never a subject, a sender,
// text or an attachment name.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DNSResolver } from "mailauth";
import { period } from "@/lib/services/service-sheet";
import { parseCommandLine } from "../command";
import { MAILBOX_OPTIONS, mailboxCommand, runMailboxCommand, type MailboxCommand } from "../mail/command";
import type { Mailbox } from "../mail/imap";
import { mailStamp as stamp } from "../mail/stamp";
import { judgeMessage, pickNewest, type Verdict } from "./mailbox";
import { docxWeeks } from "./sheet-docx";
import { subjectDates, weekOf } from "./sheet-subject";
import { newestWeek, type Week } from "./sheet-week";

/** The DOCX is written under this fixed ASCII name, whatever the attachment was called. */
export const DOCX_FILE = "porad.docx";
/** The sender's note, the mail's new text, when it has one. */
export const NOTE_FILE = "note.txt";

export type MailOutcome = {
  /** The DOCX written, when there is a sheet to handle. */
  docx?: string;
  sheetUid?: number;
  /** The week the subject names, when it names one the DOCX has (else the run takes the DOCX's newest week). */
  week?: Week;
  /** The DOCX's newest week, when the subject names another: this run does not handle it. */
  newest?: Week;
  /** The sender's note written, when the sheet's mail has text. */
  note?: string;
  superseded: number[];
  rejected: number[];
  noDocx: number[];
  /** The newest sheet, when its subject names a date that does not exist or that no week of its DOCX holds. */
  noWeek: number[];
  /** The superseded sheets whose subject names another week than the one handled: the sender must send them again. */
  unhandled: number[];
  /** One line per message, in uid order: dates and kinds only. A rejected message has no trustworthy date. */
  summary: string[];
};

function summaryLine(uid: number, verdict: Verdict, { sheet, superseded }: ReturnType<typeof pickNewest>): string {
  if (verdict.kind === "rejected") return `rejected (${verdict.reason})`;
  const when = stamp(verdict.date);
  if (verdict.kind === "no-docx")
    return `${when}: no DOCX (${verdict.count} ${verdict.count === 1 ? "file" : "files"})`;
  if (uid === sheet) return `${when}: sheet (newest)`;
  return superseded.includes(uid) ? `${when}: superseded` : `${when}: sheet`;
}

/** The weeks of the DOCX `file`, or none when it cannot be read (the skills then report the document error). */
const readWeeks = (file: string): Promise<Week[]> => docxWeeks(file).catch(() => []);

/**
 * The week each sheet's subject names, against the weeks of the newest DOCX: `none` without a date, `missing` for a
 * date that does not exist or that no week holds.
 */
type Named = { kind: "none" } | { kind: "week"; week: Week } | { kind: "missing" };

function named(verdict: Extract<Verdict, { kind: "sheet" }>, weeks: Week[]): Named {
  const dates = subjectDates(verdict.subject, verdict.date);
  if (dates.kind === "none") return dates;
  const week = dates.kind === "dates" ? weekOf(weeks, dates) : undefined;
  return week ? { kind: "week", week } : { kind: "missing" };
}

type Sheet = { uid: number; verdict: Extract<Verdict, { kind: "sheet" }> };

/** The superseded sheets whose subject names another week than `handled` (all that name one, without it). */
function namingAnotherWeek(superseded: Sheet[], weeks: Week[], handled: Week | undefined) {
  return superseded.flatMap(({ uid, verdict }) => {
    const theirs = named(verdict, weeks);
    if (theirs.kind === "none") return [];
    if (theirs.kind === "week" && handled && period(theirs.week) === period(handled)) return [];
    const what = theirs.kind === "week" ? `the week ${period(theirs.week)}` : "a week its DOCX does not have";
    return [{ uid, line: `${stamp(verdict.date)}: superseded, its subject names ${what}: not handled` }];
  });
}

/**
 * Writes the newest sheet's DOCX and note to `outDir` and records its week in `outcome`; refuses it (`noWeek`) when
 * its subject names a week the DOCX does not have. Returns the summary lines it changes, by uid.
 */
async function handleNewest(
  newest: Sheet,
  superseded: Sheet[],
  outDir: string,
  outcome: MailOutcome,
): Promise<Map<number, string>> {
  const { uid, verdict } = newest;
  const when = stamp(verdict.date);
  mkdirSync(outDir, { recursive: true });
  const docx = join(outDir, DOCX_FILE);
  writeFileSync(docx, verdict.docx.content);
  // Only a subject with a date needs the DOCX's weeks; without one, the run behaves as before.
  const dated = [newest, ...superseded].some((s) => subjectDates(s.verdict.subject, s.verdict.date).kind !== "none");
  const weeks = dated ? await readWeeks(docx) : [];
  const own = named(verdict, weeks);
  if (own.kind === "missing") {
    rmSync(docx);
    outcome.noWeek.push(uid);
    return new Map([[uid, `${when}: sheet (newest), its subject names no week of its DOCX`]]);
  }
  outcome.docx = docx;
  outcome.sheetUid = uid;
  if (verdict.note) {
    outcome.note = join(outDir, NOTE_FILE);
    writeFileSync(outcome.note, `${verdict.note}\n`);
  }
  const lines = new Map<number, string>();
  if (own.kind === "week") {
    outcome.week = own.week;
    const docxNewest = newestWeek(weeks);
    const other = docxNewest && period(docxNewest) !== period(own.week) ? docxNewest : undefined;
    // The newest week left out is named by a comment on the PR, or by the job summary when nothing changed.
    outcome.newest = other;
    lines.set(uid, `${when}: sheet (newest), the week ${period(own.week)}`);
  }
  for (const other of namingAnotherWeek(superseded, weeks, outcome.week ?? newestWeek(weeks))) {
    outcome.unhandled.push(other.uid);
    lines.set(other.uid, other.line);
  }
  return lines;
}

/**
 * Judges the unseen messages and writes the newest sheet's DOCX as `porad.docx` (and its note as `note.txt`) in
 * `outDir`. Moves nothing: the caller files the messages with fileMessages() when the outcome is done.
 */
export async function fetchSheet(
  mailbox: Mailbox,
  outDir: string,
  { resolver }: { resolver?: DNSResolver } = {},
): Promise<MailOutcome> {
  const verdicts = [];
  for (const { uid, source } of await mailbox.unseen()) {
    verdicts.push({ uid, verdict: await judgeMessage(source, { resolver }) });
  }
  const picked = pickNewest(verdicts);
  const outcome: MailOutcome = {
    superseded: picked.superseded,
    rejected: verdicts.filter((v) => v.verdict.kind === "rejected").map((v) => v.uid),
    noDocx: verdicts.filter((v) => v.verdict.kind === "no-docx").map((v) => v.uid),
    noWeek: [],
    unhandled: [],
    summary: [],
  };
  const sheets = verdicts.flatMap(({ uid, verdict }) => (verdict.kind === "sheet" ? [{ uid, verdict }] : []));
  const newest = sheets.find((s) => s.uid === picked.sheet);
  const superseded = sheets.filter((s) => picked.superseded.includes(s.uid));
  const lines = newest ? await handleNewest(newest, superseded, outDir, outcome) : new Map<number, string>();
  outcome.summary = verdicts.map(({ uid, verdict }) => lines.get(uid) ?? summaryLine(uid, verdict, picked));
  return outcome;
}

export type SheetMailCommand = MailboxCommand;

const USAGE = "Usage: pnpm sheet-mail fetch --out <dir> | file --processed <uid,…> --rejected <uid,…>";

export function parseCommand(args: string[]): SheetMailCommand {
  const { values, positionals } = parseCommandLine(args, MAILBOX_OPTIONS, USAGE);
  const [action, ...rest] = positionals;
  if (rest.length) throw new Error(`unexpected argument ${rest[0]}\n${USAGE}`);
  const command = mailboxCommand(action, values, USAGE);
  if (!command) throw new Error(USAGE);
  return command;
}

/** Runs `fetch` (the outcome as one JSON document on stdout) or `file`. */
export const execute = (command: SheetMailCommand): Promise<void> =>
  runMailboxCommand(command, (mailbox, out) => fetchSheet(mailbox, out));
