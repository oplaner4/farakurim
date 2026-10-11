import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pdfPageTexts } from "../images";
import { docxWithBody, hasPoppler, hasSoffice, wordml } from "../test-helpers";
import { docxToPdf, sofficeCandidates } from "./docx-to-pdf";

describe("sofficeCandidates", () => {
  it("tries the PATH, then the usual install folders", () => {
    expect(sofficeCandidates("win32", { ProgramFiles: "D:\\Programy" })).toEqual([
      "soffice",
      "D:\\Programy\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    ]);
    expect(sofficeCandidates("darwin")).toContain("/Applications/LibreOffice.app/Contents/MacOS/soffice");
    expect(sofficeCandidates("linux")).toEqual(["soffice", "libreoffice"]);
  });
});

describe.skipIf(!hasSoffice || !hasPoppler)("docxToPdf", { timeout: 120_000 }, () => {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "docx-pdf-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("converts a DOCX with LibreOffice, page breaks included", () => {
    const src = join(dir, "Pořad bohoslužeb.docx");
    const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    writeFileSync(src, docxWithBody(wordml.p("První týden") + pageBreak + wordml.p("Druhý týden")));
    const pdf = docxToPdf(src, join(dir, "out"), "linux");
    expect(pdfPageTexts(pdf).map((t) => t.trim())).toEqual(["První týden", "Druhý týden"]);
  });
});
