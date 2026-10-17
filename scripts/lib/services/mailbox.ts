// Which e-mail is accepted as the parish's service sheet: sent from one of SENDERS (the parish's own address, or the
// webmaster's), carrying a valid DKIM signature of that sender's provider, with exactly one DOCX attached. The `From` header is forged
// easily and an `Authentication-Results` header is written by whoever relayed the message, so neither is trusted:
// the DKIM signatures are verified here on the raw message, and the author is the one From header that
// verification parsed. A verdict never carries the message's text.

import { dkimVerify, type DNSResolver } from "mailauth";
import { simpleParser } from "mailparser";

/** The accepted senders, each with the domain whose DKIM signature must vouch for it. */
export const SENDERS: Readonly<Record<string, string>> = {
  "fara.kurim@seznam.cz": "seznam.cz",
  "oplaner4@gmail.com": "gmail.com", // the webmaster
};

export type Verdict =
  | { kind: "sheet"; date: Date; docx: { name: string; content: Buffer } }
  | { kind: "rejected"; reason: "sender" | "dkim" }
  | { kind: "no-docx"; date: Date; count: number };

/** Judges one raw message; `resolver` answers the DKIM key lookups (the real DNS by default). */
export async function judgeMessage(raw: Buffer, { resolver }: { resolver?: DNSResolver } = {}): Promise<Verdict> {
  const { results, fromFields, headerFrom } = await dkimVerify(raw, { resolver });
  // Exactly one From header with one address: a second header or address could differ from the signed one.
  const dkimDomain = fromFields === 1 && headerFrom.length === 1 ? SENDERS[headerFrom[0].toLowerCase()] : undefined;
  if (!dkimDomain) return { kind: "rejected", reason: "sender" };
  // A signature of the first `l=` bytes (`underSized`) says nothing about the rest of the body.
  const signed = results.some(
    (r) => r.status.result === "pass" && !r.status.underSized && r.signingDomain === dkimDomain,
  );
  if (!signed) return { kind: "rejected", reason: "dkim" };

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
