// Who may send content by e-mail: an address of a workflow's list, carrying a valid DKIM signature of that address's
// provider. The `From` header is forged easily and an `Authentication-Results` header is written by whoever relayed the
// message, so neither is trusted: the DKIM signatures are verified here on the raw message, and the author is the one
// From header that verification parsed.

import { dkimVerify, type DNSResolver } from "mailauth";

/** Accepted addresses, each with the domain whose DKIM signature must vouch for it. */
export type Senders = Readonly<Record<string, string>>;

/** The senders of every content workflow: the parish's own address and the webmaster's. */
export const SHARED_SENDERS: Senders = {
  "fara.kurim@seznam.cz": "seznam.cz",
  "oplaner4@gmail.com": "gmail.com",
};

export const SHEET_SENDERS: Senders = SHARED_SENDERS;

export const EVENT_SENDERS: Senders = {
  ...SHARED_SENDERS,
  "milancisar@centrum.cz": "centrum.cz",
};

/** `known` names a listed sender whose message failed the DKIM check (forwarded, provider changed). */
export type SenderVerdict =
  { kind: "accepted"; author: string } | { kind: "rejected"; reason: "sender" | "dkim"; known?: string };

/** Judges the sender of one raw message against `senders`; `resolver` answers the DKIM key lookups (real DNS by default). */
export async function judgeSender(
  raw: Buffer,
  senders: Senders,
  { resolver }: { resolver?: DNSResolver } = {},
): Promise<SenderVerdict> {
  const { results, fromFields, headerFrom } = await dkimVerify(raw, { resolver });
  // Exactly one From header with one address: a second header or address could differ from the signed one.
  const author = fromFields === 1 && headerFrom.length === 1 ? headerFrom[0].toLowerCase() : undefined;
  const domain = author ? senders[author] : undefined;
  if (!author || !domain) return { kind: "rejected", reason: "sender" };
  // A signature of the first `l=` bytes (`underSized`) says nothing about the rest of the body.
  const signed = results.some((r) => r.status.result === "pass" && !r.status.underSized && r.signingDomain === domain);
  return signed ? { kind: "accepted", author } : { kind: "rejected", reason: "dkim", known: author };
}
