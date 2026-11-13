// Mail fixtures for the script tests: a mailbox, MIME messages, DKIM signatures and the DNS that checks them.

import { generateKeyPairSync } from "node:crypto";
import { dkimSign } from "mailauth";
import { vi } from "vitest";
import type { Mailbox } from "../mail/imap";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const publicKeyBody = publicKey.replace(/-----[A-Z ]+-----|\s/g, "");

/** A mailbox holding `messages`, whose `move` records its calls. */
export function fakeMailbox(messages: { uid: number; source: Buffer }[]) {
  const move = vi.fn<Mailbox["move"]>(async () => {});
  const mailbox: Mailbox = { unseen: async () => messages, move, close: async () => {} };
  return { mailbox, move };
}

/** A fake DNS: the `test` selector of every domain holds the test key. */
export const fakeDkimResolver = async (name: string, type: string): Promise<string[][]> => {
  if (type === "TXT" && /^test\._domainkey\./.test(name)) return [[`v=DKIM1; k=rsa; p=${publicKeyBody}`]];
  throw Object.assign(new Error(`no ${type} record for ${name}`), { code: "ENOTFOUND" });
};

/**
 * A plain MIME message from `from` with `subject`, an optional plain `text` part and a base64 part per file (a name,
 * whose content is "content of <name>", or a name with its bytes), sent at `date`.
 */
export function mailMessage({
  from,
  files,
  headers = [],
  date = "Fri, 16 Oct 2026 08:00:00 +0000",
  subject = "Pořad bohoslužeb",
  text,
}: {
  from: string;
  files: (string | { name: string; content: Buffer })[];
  headers?: string[];
  date?: string;
  subject?: string;
  text?: string;
}): Buffer {
  const boundary = "sheet-boundary";
  const textPart =
    text === undefined
      ? []
      : [
          [
            `--${boundary}`,
            "Content-Type: text/plain; charset=utf-8",
            "Content-Transfer-Encoding: base64",
            "",
            Buffer.from(text).toString("base64"),
          ].join("\r\n"),
        ];
  const fileParts = files.map((file) => {
    const { name, content } =
      typeof file === "string" ? { name: file, content: Buffer.from(`content of ${file}`) } : file;
    return [
      `--${boundary}`,
      `Content-Type: application/octet-stream; name="${name}"`,
      `Content-Disposition: attachment; filename="${name}"`,
      "Content-Transfer-Encoding: base64",
      "",
      content.toString("base64"),
    ].join("\r\n");
  });
  return Buffer.from(
    [
      `From: ${from}`,
      ...headers,
      "To: web@farakurim.cz",
      `Subject: ${subject}`,
      `Date: ${date}`,
      "Message-ID: <sheet@example.test>",
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      ...textPart,
      ...fileParts,
      `--${boundary}--`,
      "",
    ].join("\r\n"),
  );
}

/** `raw` with one more DKIM signature of `domain` (the test key) in front. */
export async function dkimSigned(raw: Buffer, domain: string, maxBodyLength?: number): Promise<Buffer> {
  const { signatures, errors } = await dkimSign(raw, {
    signatureData: [{ signingDomain: domain, selector: "test", privateKey, maxBodyLength }],
  });
  if (errors.length) throw new Error("the test message could not be signed");
  return Buffer.concat([Buffer.from(signatures), raw]);
}
