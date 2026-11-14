import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pdfPageTexts } from "../images";
import { freshTempDir } from "../test-helpers/files";
import { correctionKindsIn, mailCorrectionWords, readCorrectionWords } from "./correction-words";

vi.mock("../images", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../images")>()),
  pdfPageTexts: vi.fn(() => []),
}));

describe("correctionKindsIn", () => {
  it("finds each kind at the start of a word, without case or diacritics", () => {
    expect(correctionKindsIn("OPRAVA: koncert")).toEqual(["correction"]);
    expect(correctionKindsIn("Změna času, nový termín 24. 10.")).toEqual(["change"]);
    expect(correctionKindsIn("Pouť se přesouvá; presunuto")).toEqual(["move"]);
    expect(correctionKindsIn("Setkání odpadá, mše se nekoná")).toEqual(["cancellation"]);
    expect(correctionKindsIn("Zruseno, posunuto o tyden")).toEqual(["move", "cancellation"]);
  });

  it("leaves out a word inside another one, 'opravdu' and a poster's reservation of changes", () => {
    expect(correctionKindsIn("Srdečně a opravdu zveme na prezentaci")).toEqual([]);
    expect(correctionKindsIn("Změna programu vyhrazena. Změny vyhrazeny.")).toEqual([]);
  });
});

describe("mailCorrectionWords and readCorrectionWords", () => {
  const dir = freshTempDir("correction-words");
  afterEach(() => vi.mocked(pdfPageTexts).mockReset());

  it("names each kind once per place: the subject, the text and the PDF attachments, not an image or a broken PDF", () => {
    const mail = join(dir(), "mail");
    mkdirSync(join(mail, "attachments"), { recursive: true });
    writeFileSync(join(mail, "subject.txt"), "Koncert se přesouvá");
    writeFileSync(join(mail, "body.txt"), "Zveme vás, přesun na sobotu.");
    writeFileSync(join(mail, "attachments", "01-plakat.jpg"), "");
    writeFileSync(join(mail, "attachments", "02-pozvanka.pdf"), "");
    vi.mocked(pdfPageTexts).mockReturnValue(["ZRUŠENO"]);
    const words = mailCorrectionWords(mail);
    expect(words).toEqual([
      { where: "subject", kind: "move" },
      { where: "text", kind: "move" },
      { where: "attachment 2", kind: "cancellation" },
    ]);
    const file = join(dir(), "corrections.json");
    writeFileSync(file, JSON.stringify(words));
    expect(readCorrectionWords(file)).toEqual(words);
    vi.mocked(pdfPageTexts).mockImplementation(() => {
      throw new Error("pdftotext: Syntax Error");
    });
    expect(mailCorrectionWords(mail)).toEqual(words.slice(0, 2));
    writeFileSync(file, JSON.stringify([{ where: "the poster", kind: "move" }]));
    expect(() => readCorrectionWords(file)).toThrow(`${file} is not valid:`);
  });
});
