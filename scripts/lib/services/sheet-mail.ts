// Fetches the service sheet e-mails of the parish's mailbox over IMAP and files them afterwards. `fetchSheet` judges
// every unseen message (judgeMessage()), writes the newest sheet's DOCX to a folder and moves nothing; `fileMessages`
// then moves the messages to `Zpracováno` or `Odmítnuto`. Nothing here marks a message seen. The summary lines carry
// dates (Prague time) and kinds only, never a subject, a sender, text or an attachment name.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format } from "date-fns";
import { ImapFlow } from "imapflow";
import type { DNSResolver } from "mailauth";
import { inPrague } from "@/lib/shared/prague";
import { parseCommandLine } from "../command";
import { judgeMessage, pickNewest, type Verdict } from "./mailbox";

/** The folder of the messages that are done and the folder of the ones that are not the parish's sheet. */
export const PROCESSED_FOLDER = "Zpracováno";
export const REJECTED_FOLDER = "Odmítnuto";

/** The DOCX is written under this fixed ASCII name, whatever the attachment was called. */
export const DOCX_FILE = "porad.docx";

export type Mailbox = {
  /** The unseen messages of the inbox with their raw source, oldest first. */
  unseen(): Promise<{ uid: number; source: Buffer }[]>;
  move(uids: number[], folder: string): Promise<void>;
  close(): Promise<void>;
};

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

/** Moves the `processed` messages to Zpracováno and the `rejected` ones to Odmítnuto; an empty list moves nothing. */
export async function fileMessages(
  mailbox: Mailbox,
  { processed, rejected }: { processed: number[]; rejected: number[] },
): Promise<void> {
  if (processed.length) await mailbox.move(processed, PROCESSED_FOLDER);
  if (rejected.length) await mailbox.move(rejected, REJECTED_FOLDER);
}

/**
 * The inbox over IMAP (TLS, port 993). A thin adapter, not unit-tested: it creates the two folders when missing and
 * fetches the sources with BODY.PEEK, so no message is marked seen.
 */
export async function imapMailbox(env: { host: string; user: string; password: string }): Promise<Mailbox> {
  const client = new ImapFlow({
    host: env.host,
    port: 993,
    secure: true,
    auth: { user: env.user, pass: env.password },
    logger: false,
  });
  await client.connect();
  const existing = new Set((await client.list()).map((box) => box.path));
  for (const folder of [PROCESSED_FOLDER, REJECTED_FOLDER]) {
    if (!existing.has(folder)) await client.mailboxCreate(folder);
  }
  const lock = await client.getMailboxLock("INBOX");
  return {
    async unseen() {
      const uids = (await client.search({ seen: false }, { uid: true })) || [];
      if (!uids.length) return [];
      const found: { uid: number; source: Buffer }[] = [];
      for await (const message of client.fetch(uids, { uid: true, source: true }, { uid: true })) {
        if (message.source) found.push({ uid: message.uid, source: message.source });
      }
      return found.sort((a, b) => a.uid - b.uid);
    },
    async move(uids, folder) {
      await client.messageMove(uids, folder, { uid: true });
    },
    async close() {
      lock.release();
      await client.logout();
    },
  };
}

export type SheetMailCommand =
  { action: "fetch"; out: string } | { action: "file"; processed: number[]; rejected: number[] };

const USAGE = "Usage: pnpm sheet-mail fetch --out <dir> | file --processed <uid,…> --rejected <uid,…>";

const uidList = (value: string | undefined): number[] =>
  (value ?? "")
    .split(",")
    .filter(Boolean)
    .map((part) => {
      if (!/^[1-9]\d*$/.test(part)) throw new Error(`"${part}" is not a message uid\n${USAGE}`);
      return Number(part);
    });

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
    return { action, processed: uidList(values.processed), rejected: uidList(values.rejected) };
  }
  throw new Error(USAGE);
}

/** The IMAP login from IMAP_HOST, IMAP_USER and IMAP_PASSWORD; missing ones throw, naming them. */
export function imapEnv(env: Record<string, string | undefined> = process.env) {
  const missing = ["IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD"].filter((name) => !env[name]);
  if (missing.length) throw new Error(`set ${missing.join(", ")}`);
  return { host: env.IMAP_HOST!, user: env.IMAP_USER!, password: env.IMAP_PASSWORD! };
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
