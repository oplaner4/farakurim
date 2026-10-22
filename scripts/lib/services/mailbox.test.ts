import { describe, expect, it } from "vitest";
import { dkimSigned, fakeDkimResolver as resolver, mailMessage as message } from "../test-helpers";
import { judgeMessage, pickNewest } from "./mailbox";

const parish = "fara.kurim@seznam.cz";

describe("judgeMessage", () => {
  it("accepts a seznam.cz-signed message from the parish with one DOCX", async () => {
    const raw = await dkimSigned(message({ from: parish, files: ["Pořad bohoslužeb 2026.docx"] }), "seznam.cz");
    const verdict = await judgeMessage(raw, { resolver });
    expect(verdict).toMatchObject({ kind: "sheet", docx: { name: "Pořad bohoslužeb 2026.docx" } });
    if (verdict.kind === "sheet") {
      expect(verdict.date).toEqual(new Date("2026-10-16T08:00:00Z"));
      expect(verdict.docx.content.toString()).toBe("content of Pořad bohoslužeb 2026.docx");
    }
  });

  it("refuses a message the sender check refuses", async () => {
    const stranger = await dkimSigned(message({ from: "x@seznam.cz", files: ["a.docx"] }), "seznam.cz");
    expect(await judgeMessage(stranger, { resolver })).toEqual({ kind: "rejected", reason: "sender" });
    const unsigned = message({ from: parish, files: ["a.docx"] });
    expect(await judgeMessage(unsigned, { resolver })).toEqual({ kind: "rejected", reason: "dkim" });
  });

  it("matches the extension in any case and counts the DOCX files", async () => {
    const one = await dkimSigned(message({ from: parish, files: ["Pořad.DOCX", "plakat.pdf"] }), "seznam.cz");
    expect((await judgeMessage(one, { resolver })).kind).toBe("sheet");
    const none = await dkimSigned(message({ from: parish, files: ["porad.pdf"] }), "seznam.cz");
    expect(await judgeMessage(none, { resolver })).toMatchObject({ kind: "no-docx", count: 0 });
    const two = await dkimSigned(message({ from: parish, files: ["a.docx", "b.docx"] }), "seznam.cz");
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
