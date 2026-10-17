// Which e-mail is accepted as the parish's service sheet: sent from the parish's own address, carrying a valid DKIM
// signature of the sender's provider (seznam.cz), with exactly one DOCX attached. The `From` header is forged
// easily and an `Authentication-Results` header is written by whoever relayed the message, so neither is trusted:
// the DKIM signatures are verified here on the raw message. A verdict never carries the message's text.

import { dkimVerify, type DNSResolver } from "mailauth";
import { simpleParser } from "mailparser";

export const SENDER = "fara.kurim@seznam.cz";
export const DKIM_DOMAIN = "seznam.cz";

export type Verdict =
  | { kind: "sheet"; date: Date; docx: { name: string; content: Buffer } }
  | { kind: "rejected"; reason: "sender" | "dkim" }
  | { kind: "no-docx"; date: Date; count: number };

/** Judges one raw message; `resolver` answers the DKIM key lookups (the real DNS by default). */
export async function judgeMessage(raw: Buffer, { resolver }: { resolver?: DNSResolver } = {}): Promise<Verdict> {
  const mail = await simpleParser(raw);
  if (mail.from?.value[0]?.address?.toLowerCase() !== SENDER) return { kind: "rejected", reason: "sender" };

  const { results } = await dkimVerify(raw, { resolver });
  const signed = results.some((r) => r.status.result === "pass" && r.signingDomain === DKIM_DOMAIN);
  if (!signed) return { kind: "rejected", reason: "dkim" };

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
