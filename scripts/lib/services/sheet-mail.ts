// Fetches the service sheet e-mails of the parish's mailbox over IMAP (../mail/imap.ts). `fetchSheet` judges every
// unseen message (judgeMessage()), writes the newest sheet's DOCX to a folder and moves nothing; `fileMessages` then
// moves the messages to `Zpracováno` or `Odmítnuto`. Nothing here marks a message seen. The summary lines carry
// dates (Prague time) and kinds only, never a subject, a sender, text or an attachment name.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format } from "date-fns";
import type { DNSResolver } from "mailauth";
import { inPrague } from "@/lib/shared/prague";
import { parseCommandLine } from "../command";
import { fileMessages, imapEnv, imapMailbox, uidList, type Mailbox } from "../mail/imap";
import { judgeMessage, pickNewest, type Verdict } from "./mailbox";

/** The DOCX is written under this fixed ASCII name, whatever the attachment was called. */
export const DOCX_FILE = "porad.docx";

export type MailOutcome = {
  /** The DOCX written, when there is a sheet. */
  docx?: string;
  sheetUid?: number;
  superseded: number[];
  rejected: number[];
  noDocx: number[];
  /** One line per message, in uid order: dates and kinds only. A rejected message has no trustworthy date. */
  summary: string[];
};

const stamp = (date: Date) => format(inPrague(date), "yyyy-MM-dd HH:mm");

function summaryLine(uid: number, verdict: Verdict, { sheet, superseded }: ReturnType<typeof pickNewest>): string {
  if (verdict.kind === "rejected") return `rejected (${verdict.reason})`;
  const when = stamp(verdict.date);
  if (verdict.kind === "no-docx")
    return `${when}: no DOCX (${verdict.count} ${verdict.count === 1 ? "file" : "files"})`;
  if (uid === sheet) return `${when}: sheet (newest)`;
  return superseded.includes(uid) ? `${when}: superseded` : `${when}: sheet`;
}

/**
 * Judges the unseen messages and writes the newest sheet's DOCX as `porad.docx` in `outDir`. Moves nothing: the
 * caller files the messages with fileMessages() when the outcome is done.
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
    summary: verdicts.map(({ uid, verdict }) => summaryLine(uid, verdict, picked)),
  };
  const newest = verdicts.find((v) => v.uid === picked.sheet)?.verdict;
  if (picked.sheet !== undefined && newest?.kind === "sheet") {
    mkdirSync(outDir, { recursive: true });
    outcome.docx = join(outDir, DOCX_FILE);
    outcome.sheetUid = picked.sheet;
    writeFileSync(outcome.docx, newest.docx.content);
  }
  return outcome;
}

export type SheetMailCommand =
  { action: "fetch"; out: string } | { action: "file"; processed: number[]; rejected: number[] };

const USAGE = "Usage: pnpm sheet-mail fetch --out <dir> | file --processed <uid,…> --rejected <uid,…>";

export function parseCommand(args: string[]): SheetMailCommand {
  const { values, positionals } = parseCommandLine(
    args,
    { out: { type: "string" }, processed: { type: "string" }, rejected: { type: "string" } },
    USAGE,
  );
  const [action, ...rest] = positionals;
  if (rest.length) throw new Error(`unexpected argument ${rest[0]}\n${USAGE}`);
  if (action === "fetch") {
    if (!values.out) throw new Error(`fetch needs --out\n${USAGE}`);
    return { action, out: values.out };
  }
  if (action === "file") {
    return { action, processed: uidList(values.processed, USAGE), rejected: uidList(values.rejected, USAGE) };
  }
  throw new Error(USAGE);
}

/** Runs `fetch` (the outcome as one JSON document on stdout) or `file`. */
export async function execute(command: SheetMailCommand): Promise<void> {
  const mailbox = await imapMailbox(imapEnv());
  try {
    if (command.action === "fetch") {
      const outcome = await fetchSheet(mailbox, command.out);
      console.log(JSON.stringify(outcome));
    } else {
      await fileMessages(mailbox, command);
      console.error(`Filed ${command.processed.length} processed and ${command.rejected.length} rejected message(s)`);
    }
  } finally {
    await mailbox.close();
  }
}
