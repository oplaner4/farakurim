import { describe, expect, it } from "vitest";
import { dkimSigned, fakeDkimResolver as resolver, mailMessage as message } from "../test-helpers";
import { EVENT_SENDERS, judgeSender, SHEET_SENDERS } from "./senders";

const parish = "fara.kurim@seznam.cz";
const webmaster = "oplaner4@gmail.com";
const milan = "milancisar@centrum.cz";
const signed = (from: string, domain: string, headers: string[] = []) =>
  dkimSigned(message({ from, files: ["a.pdf"], headers }), domain);

describe("judgeSender", () => {
  it("accepts the shared senders for both workflows", async () => {
    for (const senders of [SHEET_SENDERS, EVENT_SENDERS]) {
      for (const [from, domain] of [
        [parish, "seznam.cz"],
        [webmaster, "gmail.com"],
      ]) {
        expect(await judgeSender(await signed(from, domain), senders, { resolver })).toEqual({
          kind: "accepted",
          author: from,
        });
      }
    }
  });

  it("accepts the events' own sender for events only", async () => {
    const raw = await signed(milan, "centrum.cz");
    expect(await judgeSender(raw, EVENT_SENDERS, { resolver })).toEqual({ kind: "accepted", author: milan });
    expect(await judgeSender(raw, SHEET_SENDERS, { resolver })).toEqual({ kind: "rejected", reason: "sender" });
  });

  it("refuses the webmaster's seznam.cz address", async () => {
    const raw = await signed("oplaner4@seznam.cz", "seznam.cz");
    expect(await judgeSender(raw, SHEET_SENDERS, { resolver })).toEqual({ kind: "rejected", reason: "sender" });
  });

  it("accepts the address in any case and with a plain or encoded display name", async () => {
    const encoded = `=?UTF-8?B?${Buffer.from("Fara Kuřim").toString("base64")}?= <${parish}>`;
    for (const from of ["Fara Kuřim <Fara.Kurim@seznam.cz>", encoded]) {
      expect(await judgeSender(await signed(from, "seznam.cz"), SHEET_SENDERS, { resolver })).toEqual({
        kind: "accepted",
        author: parish,
      });
    }
  });

  it("refuses another sender, a dotless variant and an unsigned or tampered message", async () => {
    for (const from of ["farakurim@seznam.cz", "fara.kurim@email.cz"]) {
      expect(await judgeSender(await signed(from, "seznam.cz"), SHEET_SENDERS, { resolver })).toEqual({
        kind: "rejected",
        reason: "sender",
      });
    }
    const unsigned = message({ from: parish, files: ["a.pdf"] });
    expect(await judgeSender(unsigned, SHEET_SENDERS, { resolver })).toEqual({
      kind: "rejected",
      reason: "dkim",
      known: parish,
    });
    const tampered = Buffer.from(
      (await signed(parish, "seznam.cz")).toString().replace("Subject: Pořad", "Subject: Jiný"),
    );
    expect(await judgeSender(tampered, SHEET_SENDERS, { resolver })).toMatchObject({ reason: "dkim" });
  });

  it("names a known sender whose provider did not sign", async () => {
    expect(await judgeSender(await signed(milan, "seznam.cz"), EVENT_SENDERS, { resolver })).toEqual({
      kind: "rejected",
      reason: "dkim",
      known: milan,
    });
    expect(await judgeSender(await signed(parish, "centrum.cz"), EVENT_SENDERS, { resolver })).toEqual({
      kind: "rejected",
      reason: "dkim",
      known: parish,
    });
  });

  it("takes the author from the one From header the signature covers", async () => {
    const attacker = "attacker@seznam.cz";
    const forged = Buffer.concat([Buffer.from(`From: ${parish}\r\n`), await signed(attacker, "seznam.cz")]);
    expect(await judgeSender(forged, SHEET_SENDERS, { resolver })).toEqual({ kind: "rejected", reason: "sender" });
    const two = await signed(`${parish}, ${attacker}`, "seznam.cz");
    expect(await judgeSender(two, SHEET_SENDERS, { resolver })).toEqual({ kind: "rejected", reason: "sender" });
    const sender = await signed(attacker, "seznam.cz", [`Sender: ${parish}`]);
    expect(await judgeSender(sender, SHEET_SENDERS, { resolver })).toEqual({ kind: "rejected", reason: "sender" });
  });

  it("refuses a signature of only the first bytes of a body that was extended", async () => {
    const original = message({ from: parish, files: ["a.pdf"] });
    const bodyLength = original.length - original.indexOf("\r\n\r\n") - 4;
    const raw = await dkimSigned(original, "seznam.cz", bodyLength);
    expect((await judgeSender(raw, SHEET_SENDERS, { resolver })).kind).toBe("accepted");
    const extended = Buffer.concat([raw, Buffer.from("--extra\r\nmore\r\n")]);
    expect(await judgeSender(extended, SHEET_SENDERS, { resolver })).toMatchObject({ reason: "dkim" });
  });

  it("needs a passing signature of the sender's provider among others", async () => {
    const evil = await signed(parish, "evil.example");
    expect(await judgeSender(evil, SHEET_SENDERS, { resolver })).toMatchObject({ reason: "dkim" });
    const both = await dkimSigned(evil, "seznam.cz");
    expect((await judgeSender(both, SHEET_SENDERS, { resolver })).kind).toBe("accepted");
  });
});
