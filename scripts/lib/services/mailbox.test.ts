import { generateKeyPairSync } from "node:crypto";
import { dkimSign } from "mailauth";
import { describe, expect, it } from "vitest";
import { judgeMessage, pickNewest } from "./mailbox";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const publicKeyBody = publicKey.replace(/-----[A-Z ]+-----|\s/g, "");

/** A fake DNS: the `test` selector of every domain holds the test key. */
const resolver = async (name: string, type: string): Promise<string[][]> => {
  if (type === "TXT" && /^test\._domainkey\./.test(name)) return [[`v=DKIM1; k=rsa; p=${publicKeyBody}`]];
  throw Object.assign(new Error(`no ${type} record for ${name}`), { code: "ENOTFOUND" });
};

/** A plain MIME message from `from` with a base64 part per file name. */
function message({ from, files, headers = [] }: { from: string; files: string[]; headers?: string[] }): Buffer {
  const boundary = "sheet-boundary";
  const parts = files.map((name) =>
    [
      `--${boundary}`,
      `Content-Type: application/octet-stream; name="${name}"`,
      `Content-Disposition: attachment; filename="${name}"`,
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(`content of ${name}`).toString("base64"),
    ].join("\r\n"),
  );
  return Buffer.from(
    [
      `From: ${from}`,
      ...headers,
      "To: web@farakurim.cz",
      "Subject: Pořad bohoslužeb",
      "Date: Fri, 16 Oct 2026 08:00:00 +0000",
      "Message-ID: <sheet@example.test>",
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      ...parts,
      `--${boundary}--`,
      "",
    ].join("\r\n"),
  );
}

/** `raw` with one more DKIM signature of `domain` in front. */
async function signed(raw: Buffer, domain: string, maxBodyLength?: number): Promise<Buffer> {
  const { signatures, errors } = await dkimSign(raw, {
    signatureData: [{ signingDomain: domain, selector: "test", privateKey, maxBodyLength }],
  });
  if (errors.length) throw new Error("the test message could not be signed");
  return Buffer.concat([Buffer.from(signatures), raw]);
}

const parish = "fara.kurim@seznam.cz";

describe("judgeMessage", () => {
  it("accepts a seznam.cz-signed message from the parish with one DOCX", async () => {
    const raw = await signed(message({ from: parish, files: ["Pořad bohoslužeb 2026.docx"] }), "seznam.cz");
    const verdict = await judgeMessage(raw, { resolver });
    expect(verdict).toMatchObject({ kind: "sheet", docx: { name: "Pořad bohoslužeb 2026.docx" } });
    if (verdict.kind === "sheet") {
      expect(verdict.date).toEqual(new Date("2026-10-16T08:00:00Z"));
      expect(verdict.docx.content.toString()).toBe("content of Pořad bohoslužeb 2026.docx");
    }
  });

  it("accepts the address in any case and with a display name", async () => {
    const raw = await signed(message({ from: "Fara Kuřim <Fara.Kurim@seznam.cz>", files: ["a.docx"] }), "seznam.cz");
    expect((await judgeMessage(raw, { resolver })).kind).toBe("sheet");
  });

  it("refuses another sender, a dotless variant and an unsigned or wrongly signed message", async () => {
    for (const from of ["farakurim@seznam.cz", "fara.kurim@email.cz"]) {
      const raw = await signed(message({ from, files: ["a.docx"] }), "seznam.cz");
      expect(await judgeMessage(raw, { resolver })).toEqual({ kind: "rejected", reason: "sender" });
    }
    const unsigned = message({ from: parish, files: ["a.docx"] });
    expect(await judgeMessage(unsigned, { resolver })).toEqual({ kind: "rejected", reason: "dkim" });
    const tampered = Buffer.from(
      (await signed(message({ from: parish, files: ["a.docx"] }), "seznam.cz"))
        .toString()
        .replace("Subject: Pořad", "Subject: Jiný"),
    );
    expect(await judgeMessage(tampered, { resolver })).toEqual({ kind: "rejected", reason: "dkim" });
  });

  it("takes the author from the one From header the signature covers", async () => {
    const attacker = "attacker@seznam.cz";
    const forged = Buffer.concat([
      Buffer.from(`From: ${parish}\r\n`),
      await signed(message({ from: attacker, files: ["a.docx"] }), "seznam.cz"),
    ]);
    expect(await judgeMessage(forged, { resolver })).toEqual({ kind: "rejected", reason: "sender" });
    const two = await signed(message({ from: `${parish}, ${attacker}`, files: ["a.docx"] }), "seznam.cz");
    expect(await judgeMessage(two, { resolver })).toEqual({ kind: "rejected", reason: "sender" });
    const sender = message({ from: attacker, files: ["a.docx"], headers: [`Sender: ${parish}`] });
    expect(await judgeMessage(await signed(sender, "seznam.cz"), { resolver })).toEqual({
      kind: "rejected",
      reason: "sender",
    });
  });

  it("accepts an encoded display name with the parish's address", async () => {
    const from = `=?UTF-8?B?${Buffer.from("Fara Kuřim").toString("base64")}?= <${parish}>`;
    const raw = await signed(message({ from, files: ["a.docx"] }), "seznam.cz");
    expect((await judgeMessage(raw, { resolver })).kind).toBe("sheet");
  });

  it("refuses a signature of only the first bytes of a body that was extended", async () => {
    const original = message({ from: parish, files: ["a.docx"] });
    const bodyLength = original.length - original.indexOf("\r\n\r\n") - 4;
    const raw = await signed(original, "seznam.cz", bodyLength);
    expect((await judgeMessage(raw, { resolver })).kind).toBe("sheet");
    const extended = Buffer.concat([raw, Buffer.from("--extra\r\nmore\r\n")]);
    expect(await judgeMessage(extended, { resolver })).toEqual({ kind: "rejected", reason: "dkim" });
  });

  it("needs a passing seznam.cz signature", async () => {
    const raw = await signed(message({ from: parish, files: ["a.docx"] }), "evil.example");
    expect(await judgeMessage(raw, { resolver })).toEqual({ kind: "rejected", reason: "dkim" });
    const both = await signed(await signed(message({ from: parish, files: ["a.docx"] }), "evil.example"), "seznam.cz");
    expect((await judgeMessage(both, { resolver })).kind).toBe("sheet");
  });

  it("matches the extension in any case and counts the DOCX files", async () => {
    const one = await signed(message({ from: parish, files: ["Pořad.DOCX", "plakat.pdf"] }), "seznam.cz");
    expect((await judgeMessage(one, { resolver })).kind).toBe("sheet");
    const none = await signed(message({ from: parish, files: ["porad.pdf"] }), "seznam.cz");
    expect(await judgeMessage(none, { resolver })).toMatchObject({ kind: "no-docx", count: 0 });
    const two = await signed(message({ from: parish, files: ["a.docx", "b.docx"] }), "seznam.cz");
    expect(await judgeMessage(two, { resolver })).toMatchObject({ kind: "no-docx", count: 2 });
  });
});

describe("pickNewest", () => {
  it("picks the newest sheet and supersedes the others", () => {
    const sheet = (iso: string) =>
      ({ kind: "sheet", date: new Date(iso), docx: { name: "a.docx", content: Buffer.alloc(0) } }) as const;
    expect(
      pickNewest([
        { uid: 3, verdict: sheet("2026-10-15T10:00:00Z") },
        { uid: 5, verdict: sheet("2026-10-16T08:00:00Z") },
        { uid: 6, verdict: { kind: "rejected", reason: "sender" } },
      ]),
    ).toEqual({ sheet: 5, superseded: [3] });
    expect(pickNewest([])).toEqual({ superseded: [] });
  });
});
