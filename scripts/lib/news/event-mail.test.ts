import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dkimSigned, fakeDkimResolver as resolver, fakeMailbox, freshTempDir, mailMessage } from "../test-helpers";
import { fetchEventMail, judgeEventMail, mailText, parseCommand } from "./event-mail";

const parish = "fara.kurim@seznam.cz";
const milan = "milancisar@centrum.cz";

const mail = (
  options: { from?: string; files?: string[]; subject?: string; text?: string; date?: string },
  domain = "seznam.cz",
) =>
  dkimSigned(
    mailMessage({
      from: options.from ?? parish,
      files: options.files ?? [],
      subject: options.subject ?? "Svatomartinský průvod",
      text: options.text,
      date: options.date,
    }),
    domain,
  );

describe("judgeEventMail", () => {
  it("hands on the subject, the body and the attachments of the types a poster can be", async () => {
    const raw = await mail({ files: ["Plakát.PDF", "foto.JPEG", "porad.docx", "fotky.zip"], text: "Zveme vás." });
    expect(await judgeEventMail(raw, { resolver })).toMatchObject({
      kind: "event",
      subject: "Svatomartinský průvod",
      body: "Zveme vás.",
      attachments: [{ name: "Plakát.PDF" }, { name: "foto.JPEG" }],
    });
  });

  it("accepts the events' own sender", async () => {
    const raw = await mail({ from: milan, files: ["a.pdf"] }, "centrum.cz");
    expect((await judgeEventMail(raw, { resolver })).kind).toBe("event");
  });

  it("needs a subject and a body when nothing is attached", async () => {
    expect(await judgeEventMail(await mail({ subject: "", text: "Zveme vás." }), { resolver })).toMatchObject({
      kind: "incomplete",
    });
    expect(await judgeEventMail(await mail({ text: "  " }), { resolver })).toMatchObject({ kind: "incomplete" });
    expect((await judgeEventMail(await mail({ text: "Zveme vás." }), { resolver })).kind).toBe("event");
    expect((await judgeEventMail(await mail({ subject: "", files: ["a.png"] }), { resolver })).kind).toBe("event");
  });

  it("passes on the sender check's refusal", async () => {
    const stranger = await mail({ from: "x@seznam.cz", files: ["a.pdf"] });
    expect(await judgeEventMail(stranger, { resolver })).toEqual({ kind: "rejected", reason: "sender" });
  });
});

describe("mailText", () => {
  it("keeps only the new text of a reply", () => {
    const text = [
      "Posíláme pozvánku.",
      "",
      "> stará zpráva",
      "Dne 20. 10. 2026 v 10:00 Jan Novák napsal(a):",
      "> ještě starší",
    ].join("\n");
    expect(mailText(text)).toBe("Posíláme pozvánku.");
  });

  it("drops the signature and a forwarded original", () => {
    expect(mailText("Zveme vás.\n-- \nJan Novák\n+420 777 000 000")).toBe("Zveme vás.");
    expect(mailText("Přeposílám.\n---------- Původní e-mail ----------\nOd: x")).toBe("Přeposílám.");
  });
});

describe("fetchEventMail", () => {
  const dir = freshTempDir("event-mail");

  it("writes only the oldest event mail and leaves the others unread", async () => {
    const { mailbox } = fakeMailbox([
      { uid: 2, source: await mail({ from: "x@seznam.cz", files: ["a.pdf"], subject: "Tajné" }) },
      { uid: 3, source: await mail({ files: ["Plakát průvodu.pdf", "logo.JPEG"], text: "Zveme vás." }) },
      { uid: 4, source: await mail({ subject: "", text: "Bez předmětu" }) },
      { uid: 5, source: await mail({ files: ["b.pdf"], date: "Sat, 17 Oct 2026 08:00:00 +0000" }) },
    ]);
    const outcome = await fetchEventMail(mailbox, dir(), { resolver });
    expect(outcome).toMatchObject({
      mailUid: 3,
      date: "2026-10-16",
      rejected: [2, 4],
      incomplete: [4],
      knownDkim: [],
      remaining: 1,
    });
    expect(readFileSync(join(dir(), "subject.txt"), "utf8")).toBe("Svatomartinský průvod");
    expect(readFileSync(join(dir(), "body.txt"), "utf8")).toBe("Zveme vás.");
    expect(readdirSync(join(dir(), "attachments"))).toEqual(["01-plakat-pruvodu.pdf", "02-logo.jpg"]);
    expect(JSON.stringify(outcome)).not.toMatch(/Tajné|x@seznam|Bez předmětu|Plakát/);
  });

  it("names a known sender whose DKIM check failed and writes nothing without an event mail", async () => {
    const { mailbox } = fakeMailbox([{ uid: 7, source: await mail({ from: milan, files: ["a.pdf"] }) }]);
    const outcome = await fetchEventMail(mailbox, dir(), { resolver });
    expect(outcome).toMatchObject({ rejected: [7], knownDkim: [milan], remaining: 0 });
    expect(outcome.mailUid).toBeUndefined();
    expect(existsSync(join(dir(), "subject.txt"))).toBe(false);
  });
});

describe("command line", () => {
  it("reads fetch and file", () => {
    expect(parseCommand(["fetch", "--out", "x"])).toEqual({ action: "fetch", out: "x" });
    expect(parseCommand(["file", "--processed", "1", "--rejected", "2,4"])).toEqual({
      action: "file",
      processed: [1],
      rejected: [2, 4],
    });
    expect(() => parseCommand(["fetch"])).toThrow("--out");
    expect(() => parseCommand([])).toThrow("Usage");
  });
});
