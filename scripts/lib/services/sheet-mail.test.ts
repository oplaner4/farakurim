import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { docxWithBody, wordml } from "../test-helpers/documents";
import { freshTempDir } from "../test-helpers/files";
import { dkimSigned, fakeDkimResolver as resolver, fakeMailbox, mailMessage } from "../test-helpers/mail";
import { fetchSheet, parseCommand } from "./sheet-mail";

const dir = freshTempDir("sheet-mail");
const parish = "fara.kurim@seznam.cz";

const sheet = (name: string, date: string) =>
  dkimSigned(mailMessage({ from: parish, files: [{ name, content: Buffer.from(`docx ${date}`) }], date }), "seznam.cz");

/** A DOCX of the weeks 8.–15. 11. and 15.–22. 11. 2026, the newest first (headings only). */
const twoWeeks = docxWithBody(
  ["od 15. 11. 2026 do 22. 11. 2026", "od 8. 11. 2026 do 15. 11. 2026"]
    .map((week) => wordml.p(wordml.run(`ROZPIS BOHOSLUŽEB V TÝDNU ${week}`, { bold: true })))
    .join(""),
);

/** A sheet e-mail with the two weeks' DOCX, sent on 12. 11. 2026 unless `date` says otherwise. */
const yearSheet = (
  subject: string,
  { text, date = "Thu, 12 Nov 2026 08:00:00 +0000" }: { text?: string; date?: string } = {},
) =>
  dkimSigned(
    mailMessage({ from: parish, files: [{ name: "Pořad 2026.docx", content: twoWeeks }], subject, text, date }),
    "seznam.cz",
  );

describe("fetchSheet", () => {
  it("writes the newest sheet as porad.docx and sorts the other messages", async () => {
    const stranger = await dkimSigned(mailMessage({ from: "x@seznam.cz", files: ["a.docx"] }), "seznam.cz");
    const { mailbox, move } = fakeMailbox([
      { uid: 1, source: await sheet("Starý.docx", "Thu, 15 Oct 2026 08:00:00 +0000") },
      { uid: 2, source: stranger },
      { uid: 3, source: await sheet("Nový.docx", "Fri, 16 Oct 2026 08:00:00 +0000") },
    ]);
    const outcome = await fetchSheet(mailbox, dir(), { resolver });
    expect(outcome).toMatchObject({
      docx: join(dir(), "porad.docx"),
      sheetUid: 3,
      superseded: [1],
      rejected: [2],
      noDocx: [],
    });
    expect(readFileSync(join(dir(), "porad.docx")).toString()).toBe("docx Fri, 16 Oct 2026 08:00:00 +0000");
    expect(outcome.summary).toEqual([
      "2026-10-15 10:00: superseded",
      "rejected (sender)",
      "2026-10-16 10:00: sheet (newest)",
    ]);
    expect(JSON.stringify(outcome)).not.toMatch(/Nový|Starý|x@seznam/);
    expect(move).not.toHaveBeenCalled();
  });

  it("reports a message without exactly one DOCX", async () => {
    const none = await dkimSigned(mailMessage({ from: parish, files: ["a.docx", "b.docx"] }), "seznam.cz");
    const { mailbox } = fakeMailbox([{ uid: 7, source: none }]);
    const outcome = await fetchSheet(mailbox, dir(), { resolver });
    expect(outcome).toMatchObject({ superseded: [], rejected: [], noDocx: [7] });
    expect(outcome.docx).toBeUndefined();
    expect(outcome.summary).toEqual(["2026-10-16 10:00: no DOCX (2 files)"]);
    expect(existsSync(join(dir(), "porad.docx"))).toBe(false);
  });

  it("returns an empty outcome and no file without unseen mail", async () => {
    const { mailbox } = fakeMailbox([]);
    expect(await fetchSheet(mailbox, dir(), { resolver })).toEqual({
      superseded: [],
      rejected: [],
      noDocx: [],
      noWeek: [],
      unhandled: [],
      summary: [],
    });
    expect(existsSync(join(dir(), "porad.docx"))).toBe(false);
  });
});

describe("fetchSheet with the sender's subject and text", () => {
  it("behaves as before without a date in the subject or a text", async () => {
    const { mailbox } = fakeMailbox([{ uid: 1, source: await yearSheet("Pořad bohoslužeb 2026") }]);
    const outcome = await fetchSheet(mailbox, dir(), { resolver });
    expect(outcome).toMatchObject({ sheetUid: 1, noWeek: [], unhandled: [] });
    expect(outcome.week).toBeUndefined();
    expect(outcome.note).toBeUndefined();
    expect(existsSync(join(dir(), "note.txt"))).toBe(false);
  });

  it("hands on the week the subject names", async () => {
    const { mailbox } = fakeMailbox([{ uid: 1, source: await yearSheet("Oprava ohlášek 10. 11.") }]);
    const outcome = await fetchSheet(mailbox, dir(), { resolver });
    expect(outcome).toMatchObject({
      sheetUid: 1,
      week: { validFrom: "2026-11-08", validTo: "2026-11-15" },
      newest: { validFrom: "2026-11-15", validTo: "2026-11-22" },
    });
    expect(outcome.summary).toEqual([
      "2026-11-12 09:00: sheet (newest), the week 2026-11-08 – 2026-11-15 " +
        "(not the DOCX's newest, 2026-11-15 – 2026-11-22, which is not handled)",
    ]);
  });

  it("names no other newest week when the subject names the newest", async () => {
    const { mailbox } = fakeMailbox([{ uid: 1, source: await yearSheet("Pořad 16.–22. 11.") }]);
    const outcome = await fetchSheet(mailbox, dir(), { resolver });
    expect(outcome).toMatchObject({ week: { validFrom: "2026-11-15", validTo: "2026-11-22" } });
    expect(outcome.newest).toBeUndefined();
    expect(outcome.summary).toEqual(["2026-11-12 09:00: sheet (newest), the week 2026-11-15 – 2026-11-22"]);
  });

  it("ignores the dates in a reply's subject", async () => {
    const { mailbox } = fakeMailbox([{ uid: 1, source: await yearSheet("Re: Pořad bohoslužeb 8.–15. 11.") }]);
    const outcome = await fetchSheet(mailbox, dir(), { resolver });
    expect(outcome).toMatchObject({ sheetUid: 1, noWeek: [] });
    expect(outcome.week).toBeUndefined();
    expect(outcome.summary).toEqual(["2026-11-12 09:00: sheet (newest)"]);
  });

  it("refuses the sheet when the subject names a week its DOCX does not have", async () => {
    const { mailbox } = fakeMailbox([{ uid: 4, source: await yearSheet("Pořad 29. 11.", { text: "Posílám." }) }]);
    const outcome = await fetchSheet(mailbox, dir(), { resolver });
    expect(outcome).toMatchObject({ noWeek: [4], superseded: [] });
    expect(outcome.docx).toBeUndefined();
    expect(outcome.note).toBeUndefined();
    expect(existsSync(join(dir(), "porad.docx"))).toBe(false);
    expect(outcome.summary).toEqual(["2026-11-12 09:00: sheet (newest), its subject names no week of its DOCX"]);
  });

  it("writes the sender's new text as the note, never into the outcome", async () => {
    const text = "Oprava: v sobotu mše až v 18:00.\n-- \nJan Novák";
    const { mailbox } = fakeMailbox([{ uid: 1, source: await yearSheet("Pořad", { text }) }]);
    const outcome = await fetchSheet(mailbox, dir(), { resolver });
    expect(outcome.note).toBe(join(dir(), "note.txt"));
    expect(readFileSync(join(dir(), "note.txt"), "utf8")).toBe("Oprava: v sobotu mše až v 18:00.\n");
    expect(JSON.stringify(outcome)).not.toMatch(/Oprava|Novák|sobotu/);
  });

  it("flags a superseded sheet whose subject names another week", async () => {
    const { mailbox } = fakeMailbox([
      { uid: 1, source: await yearSheet("Pořad 8.–15. 11.", { date: "Wed, 11 Nov 2026 08:00:00 +0000" }) },
      { uid: 2, source: await yearSheet("Pořad 15. 11.", { date: "Wed, 11 Nov 2026 09:00:00 +0000" }) },
      { uid: 3, source: await yearSheet("Pořad bohoslužeb") },
    ]);
    const outcome = await fetchSheet(mailbox, dir(), { resolver });
    // The newest names no week, so it is the DOCX's newest (15.–22. 11.), the one uid 2 names too.
    expect(outcome).toMatchObject({ sheetUid: 3, superseded: [1, 2], unhandled: [1] });
    expect(outcome.week).toBeUndefined();
    expect(outcome.summary).toEqual([
      "2026-11-11 09:00: superseded, its subject names the week 2026-11-08 – 2026-11-15: not handled",
      "2026-11-11 10:00: superseded",
      "2026-11-12 09:00: sheet (newest)",
    ]);
  });
});

describe("command line", () => {
  it("reads fetch and file", () => {
    expect(parseCommand(["fetch", "--out", "x"])).toEqual({ action: "fetch", out: "x" });
    expect(parseCommand(["file", "--processed", "1,3", "--rejected", "2"])).toEqual({
      action: "file",
      processed: [1, 3],
      rejected: [2],
    });
    expect(parseCommand(["file", "--processed", "4"])).toMatchObject({ rejected: [] });
  });

  it("refuses wrong arguments", () => {
    expect(() => parseCommand([])).toThrow("Usage");
    expect(() => parseCommand(["fetch"])).toThrow("--out");
    expect(() => parseCommand(["file", "--processed", "a"])).toThrow("not a message uid");
  });
});
