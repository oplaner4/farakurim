import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { dkimSigned, fakeDkimResolver as resolver, freshTempDir, mailMessage } from "../test-helpers";
import { SENDER } from "./mailbox";
import { fetchSheet, fileMessages, imapEnv, parseCommand, type Mailbox } from "./sheet-mail";

const dir = freshTempDir("sheet-mail");

function fakeMailbox(messages: { uid: number; source: Buffer }[]) {
  const move = vi.fn<Mailbox["move"]>(async () => {});
  const mailbox: Mailbox = { unseen: async () => messages, move, close: async () => {} };
  return { mailbox, move };
}

const sheet = (name: string, date: string) =>
  dkimSigned(mailMessage({ from: SENDER, files: [{ name, content: Buffer.from(`docx ${date}`) }], date }), "seznam.cz");

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
    const none = await dkimSigned(mailMessage({ from: SENDER, files: ["a.docx", "b.docx"] }), "seznam.cz");
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
      summary: [],
    });
    expect(existsSync(join(dir(), "porad.docx"))).toBe(false);
  });
});

describe("fileMessages", () => {
  it("moves each non-empty list to its folder", async () => {
    const { mailbox, move } = fakeMailbox([]);
    await fileMessages(mailbox, { processed: [1, 3], rejected: [2] });
    expect(move.mock.calls).toEqual([
      [[1, 3], "Zpracováno"],
      [[2], "Odmítnuto"],
    ]);
  });

  it("moves nothing for empty lists", async () => {
    const { mailbox, move } = fakeMailbox([]);
    await fileMessages(mailbox, { processed: [], rejected: [] });
    expect(move).not.toHaveBeenCalled();
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

  it("names the missing credentials", () => {
    expect(() => imapEnv({ IMAP_HOST: "h" })).toThrow("IMAP_USER, IMAP_PASSWORD");
    expect(imapEnv({ IMAP_HOST: "h", IMAP_USER: "u", IMAP_PASSWORD: "p" })).toEqual({
      host: "h",
      user: "u",
      password: "p",
    });
  });
});
