// Which e-mail is accepted as the parish's service sheet: from one of SHEET_SENDERS with its provider's DKIM signature
// (judgeSender()), with exactly one DOCX attached. A verdict never carries the message's text.

import type { DNSResolver } from "mailauth";
import { simpleParser } from "mailparser";
import { judgeSender, SHEET_SENDERS } from "../mail/senders";

export type Verdict =
  | { kind: "sheet"; date: Date; docx: { name: string; content: Buffer } }
  | { kind: "rejected"; reason: "sender" | "dkim" }
  | { kind: "no-docx"; date: Date; count: number };

/** Judges one raw message; `resolver` answers the DKIM key lookups (the real DNS by default). */
export async function judgeMessage(raw: Buffer, { resolver }: { resolver?: DNSResolver } = {}): Promise<Verdict> {
  const sender = await judgeSender(raw, SHEET_SENDERS, { resolver });
  if (sender.kind === "rejected") return { kind: "rejected", reason: sender.reason };

  const mail = await simpleParser(raw);
  const date = mail.date ?? new Date(0);
  const docxs = mail.attachments.filter((a) => a.filename?.toLowerCase().endsWith(".docx"));
  if (docxs.length !== 1) return { kind: "no-docx", date, count: docxs.length };
  return { kind: "sheet", date, docx: { name: docxs[0].filename ?? "", content: docxs[0].content } };
}

/** The uid of the newest sheet by its date, and the uids of the other sheets. */
export function pickNewest(verdicts: { uid: number; verdict: Verdict }[]): { sheet?: number; superseded: number[] } {
  const sheets = verdicts.flatMap(({ uid, verdict }) =>
    verdict.kind === "sheet" ? [{ uid, date: verdict.date }] : [],
  );
  if (!sheets.length) return { superseded: [] };
  const newest = sheets.reduce((a, b) => (b.date > a.date ? b : a));
  return { sheet: newest.uid, superseded: sheets.filter((s) => s !== newest).map((s) => s.uid) };
}
