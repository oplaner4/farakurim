// Fetches the event e-mails of the events mailbox over IMAP (../mail/imap.ts), one mail at a time: `fetchEventMail`
// judges every unseen message, writes the oldest event mail's subject, text and attachments to a folder for the
// unattended parish-create-event run and moves nothing; `fileMessages` then files the messages. An event mail comes
// from one of EVENT_SENDERS with its provider's DKIM signature and holds an attachment a poster can be made from, or
// else both a subject and a text. The outcome carries uids, dates, kinds and the addresses of known senders only,
// never a subject, a text, an attachment name or a stranger's address.

import { mkdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { format } from "date-fns";
import type { DNSResolver } from "mailauth";
import { simpleParser } from "mailparser";
import { readEvents } from "@/content/news";
import { inPrague, pragueDate } from "@/lib/shared/prague";
import { slug } from "@/lib/shared/slug";
import { parseCommandLine, readJsonRecord } from "../command";
import { NEWS_DIR } from "../content-files";
import { fileMessages, imapEnv, imapMailbox, uidList, type Mailbox } from "../mail/imap";
import { EVENT_SENDERS, judgeSender, type SenderVerdict } from "../mail/senders";
import { addedIds, knownJson, loadKnownEvents, takenIds, type KnownEvent } from "./known-events";

/** The attachment types handed on, each with the extension it is written under. */
const ATTACHMENT_TYPES: Readonly<Record<string, string>> = {
  ".pdf": ".pdf",
  ".png": ".png",
  ".jpg": ".jpg",
  ".jpeg": ".jpg",
  ".webp": ".webp",
};

export type EventMailVerdict =
  | {
      kind: "event";
      date: Date;
      subject: string;
      body: string;
      attachments: { name: string; content: Buffer }[];
    }
  | { kind: "incomplete"; date: Date }
  | Extract<SenderVerdict, { kind: "rejected" }>;

/** A line from which on a reply quotes or a mail forwards an earlier message, or the signature starts. */
const CUT = [/^-- ?$/, /^Dne .+ napsal\(a\):$/, /^On .+ wrote:$/, /^-{3,} ?(Původní|Přeposlaná|Original|Forwarded) /i];

/** The new text of a mail: without quoted lines, a quoted or forwarded earlier message and the signature. */
export function mailText(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const end = lines.findIndex((line) => CUT.some((cut) => cut.test(line.trim())));
  return (end === -1 ? lines : lines.slice(0, end))
    .filter((line) => !line.startsWith(">"))
    .join("\n")
    .trim();
}

/** Judges one raw message of the events mailbox; `resolver` answers the DKIM key lookups (real DNS by default). */
export async function judgeEventMail(
  raw: Buffer,
  { resolver }: { resolver?: DNSResolver } = {},
): Promise<EventMailVerdict> {
  const sender = await judgeSender(raw, EVENT_SENDERS, { resolver });
  if (sender.kind === "rejected") return sender;
  const mail = await simpleParser(raw);
  const date = mail.date ?? new Date(0);
  const subject = (mail.subject ?? "").trim();
  const body = mailText(mail.text ?? "");
  const attachments = mail.attachments
    .filter((a) => extname(a.filename ?? "").toLowerCase() in ATTACHMENT_TYPES)
    .map((a) => ({ name: a.filename ?? "", content: a.content }));
  if (!attachments.length && (!subject || !body)) return { kind: "incomplete", date };
  return { kind: "event", date, subject, body, attachments };
}

export type EventMailOutcome = {
  /** The event mail written, the oldest one. */
  mailUid?: number;
  /** Its date in Prague (yyyy-MM-dd), for the PR branch. */
  date?: string;
  /** Filed in Odmítnuto: strangers, failed DKIM checks and incomplete mails. */
  rejected: number[];
  incomplete: number[];
  /** The known senders whose DKIM check failed. */
  knownDkim: string[];
  /** The other event mails, left unread for the next run. */
  remaining: number;
  /** One line per message, in uid order: dates, kinds and known senders only. */
  summary: string[];
};

const stamp = (date: Date) => format(inPrague(date), "yyyy-MM-dd HH:mm");

function summaryLine(verdict: EventMailVerdict, picked: boolean): string {
  if (verdict.kind === "rejected") return `rejected (${verdict.reason}${verdict.known ? `: ${verdict.known}` : ""})`;
  if (verdict.kind === "incomplete") return `${stamp(verdict.date)}: incomplete (no attachment, subject or text)`;
  return `${stamp(verdict.date)}: event${picked ? "" : " (waits for the next run)"}`;
}

/** The attachment's file name: its place in the mail, its name in ASCII, the extension it is written under. */
function attachmentFile(index: number, name: string): string {
  const ext = extname(name);
  return `${String(index + 1).padStart(2, "0")}-${slug(name.slice(0, -ext.length || undefined)) || "priloha"}${ATTACHMENT_TYPES[ext.toLowerCase()]}`;
}

/**
 * Judges the unseen messages and writes the oldest event mail to `outDir`: `subject.txt`, `body.txt` and
 * `attachments/NN-<name>.<ext>`. Moves nothing: the caller files the messages with fileMessages().
 */
export async function fetchEventMail(
  mailbox: Mailbox,
  outDir: string,
  { resolver }: { resolver?: DNSResolver } = {},
): Promise<EventMailOutcome> {
  const verdicts: { uid: number; verdict: EventMailVerdict }[] = [];
  for (const { uid, source } of await mailbox.unseen()) {
    verdicts.push({ uid, verdict: await judgeEventMail(source, { resolver }) });
  }
  const events = verdicts.filter((v) => v.verdict.kind === "event");
  const picked = events[0];
  const outcome: EventMailOutcome = {
    rejected: verdicts.filter((v) => v.verdict.kind !== "event").map((v) => v.uid),
    incomplete: verdicts.filter((v) => v.verdict.kind === "incomplete").map((v) => v.uid),
    knownDkim: verdicts.flatMap(({ verdict }) => (verdict.kind === "rejected" && verdict.known ? [verdict.known] : [])),
    remaining: Math.max(events.length - 1, 0),
    summary: verdicts.map((v) => summaryLine(v.verdict, v === picked)),
  };
  if (picked?.verdict.kind === "event") {
    const { date, subject, body, attachments } = picked.verdict;
    mkdirSync(join(outDir, "attachments"), { recursive: true });
    writeFileSync(join(outDir, "subject.txt"), subject);
    writeFileSync(join(outDir, "body.txt"), body);
    attachments.forEach(({ name, content }, i) =>
      writeFileSync(join(outDir, "attachments", attachmentFile(i, name)), content),
    );
    outcome.mailUid = picked.uid;
    outcome.date = format(inPrague(date), "yyyy-MM-dd");
  }
  return outcome;
}

export type EventMailCommand =
  | { action: "fetch"; out: string }
  | { action: "file"; processed: number[]; rejected: number[] }
  | { action: "known"; out: string }
  | { action: "check-ids"; known: string };

const USAGE = `Usage: pnpm event-mail fetch --out <dir> | file --processed <uid,…> --rejected <uid,…>
       pnpm event-mail known --out <known.json> | check-ids <known.json>`;

export function parseCommand(args: string[]): EventMailCommand {
  const { values, positionals } = parseCommandLine(
    args,
    { out: { type: "string" }, processed: { type: "string" }, rejected: { type: "string" } },
    USAGE,
  );
  const [action, ...rest] = positionals;
  if (action === "check-ids") {
    if (rest.length !== 1) throw new Error(`check-ids <known.json> takes one file\n${USAGE}`);
    return { action, known: rest[0] };
  }
  if (rest.length) throw new Error(`unexpected argument ${rest[0]}\n${USAGE}`);
  if (action === "fetch" || action === "known") {
    if (!values.out) throw new Error(`${action} needs --out\n${USAGE}`);
    return { action, out: values.out };
  }
  if (action === "file") {
    return { action, processed: uidList(values.processed, USAGE), rejected: uidList(values.rejected, USAGE) };
  }
  throw new Error(USAGE);
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Writes the known events (loadKnownEvents()) or refuses an added id an open events PR holds. */
async function runKnownEvents(command: Extract<EventMailCommand, { action: "known" | "check-ids" }>): Promise<void> {
  if (command.action === "known") {
    const today = pragueDate(new Date());
    const found = await loadKnownEvents({ repo: env("GITHUB_REPOSITORY"), token: env("GH_TOKEN"), today });
    writeFileSync(command.out, knownJson(found));
    console.error(`Wrote ${found.length} known event(s)`);
    return;
  }
  const taken = takenIds(readJsonRecord(command.known) as KnownEvent[], addedIds(readEvents(NEWS_DIR)));
  if (taken.length) throw new Error(`an open events PR already holds ${taken.join(", ")}: not added`);
}

/** Runs `fetch` (the outcome as one JSON document on stdout), `file`, `known` or `check-ids`. */
export async function execute(command: EventMailCommand): Promise<void> {
  if (command.action === "known" || command.action === "check-ids") return runKnownEvents(command);
  const mailbox = await imapMailbox(imapEnv());
  try {
    if (command.action === "fetch") {
      console.log(JSON.stringify(await fetchEventMail(mailbox, command.out)));
    } else {
      await fileMessages(mailbox, command);
      console.error(`Filed ${command.processed.length} processed and ${command.rejected.length} rejected message(s)`);
    }
  } finally {
    await mailbox.close();
  }
}
