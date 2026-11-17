import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { draftSheet, stageSheet, type DraftOptions } from "./sheet";
import { readSheetResult } from "./sheet-result";
import { addEvent } from "../news/add-event";
import { errorMessage } from "../command";
import { extractPdfPages, pdfPageTexts } from "../images";
import { docxToPdf } from "../services/docx-to-pdf";
import { emptyWeek, useStageFixture } from "../test-helpers/content";
import { docxWithBody, hasPoppler, hasSoffice, pdfWithText, wordml } from "../test-helpers/documents";

// The real converter and PDF tools, wrapped so the DOCX tests below can run without LibreOffice and poppler.
vi.mock("../services/docx-to-pdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/docx-to-pdf")>();
  return { ...actual, docxToPdf: vi.fn(actual.docxToPdf) };
});
vi.mock("../images", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../images")>();
  return { ...actual, pdfPageTexts: vi.fn(actual.pdfPageTexts), extractPdfPages: vi.fn(actual.extractPdfPages) };
});

describe("stageSheet", { timeout: 30_000 }, () => {
  const { env, status, download, uploaded, fetchMock } = useStageFixture();
  const draftPath = () => join(env.home, "draft.json");
  /** Drafts the week of `options` to draft.json. */
  const draft = (options: Omit<DraftOptions, "out">) => draftSheet(env, { ...options, out: draftPath() });
  const recordRequired =
    "--record is required, also with --check\nnext: write the draft record with `pnpm stage-content sheet draft` first";

  it("drafts a PDF's week with its days only, and refuses to stage or check without a record", async () => {
    const source = download("porad.pdf", "%PDF");
    const week = { source, validFrom: "2099-10-04", validTo: "2099-10-11" };
    // The real news copied into the temp folder add the events after the header: assert up to it.
    expect((await draft(week)).lines.slice(0, 3)).toEqual([
      `Wrote the draft record of 2099-10-04 – 2099-10-11 to ${draftPath()}`,
      "next: fill each day's feast and rows, and the announcements, from the PDF",
      "Events for newsId (not ended by 2099-09-20):",
    ]);
    const drafted = JSON.parse(readFileSync(draftPath(), "utf8"));
    expect(drafted.days).toHaveLength(8);
    expect(drafted.days.slice(0, 2)).toEqual([
      { date: "2099-10-04", solemnity: true, rows: [] },
      { date: "2099-10-05", solemnity: false, rows: [] },
    ]);
    expect(drafted.announcements).toEqual([]);
    await expect(stageSheet(env, week)).rejects.toThrow(recordRequired);
    await expect(stageSheet(env, { ...week, check: true })).rejects.toThrow(recordRequired);
    expect(existsSync(uploaded("porady_bohosluzeb"))).toBe(false);
  });

  it("lists the events an announcement can link, from 14 days before the week", async () => {
    const event = { place: "Lukov", text: "Zveme na pouť." };
    addEvent(env.newsDir, { ...event, id: "pout-2099", title: "Pouť do Lukova", start: "2099-10-10" });
    addEvent(env.newsDir, { ...event, id: "hody-2099", title: "Hody", start: "2099-09-20", end: "2099-09-21" });
    addEvent(env.newsDir, { ...event, id: "dozinky-2099", title: "Dožínky", start: "2099-09-19" });
    const week = { source: download("porad.pdf", "%PDF"), validFrom: "2099-10-04", validTo: "2099-10-11" };
    // In start order, after the real long-term events without an end; Dožínky ended before 2099-09-20.
    expect((await draft(week)).lines.slice(-2)).toEqual([
      "  hody-2099: Hody, 2099-09-20–2099-09-21, Lukov",
      "  pout-2099: Pouť do Lukova, 2099-10-10, Lukov",
    ]);
  });

  it("hints at --corrected when the week is published", async () => {
    const source = download("porad.pdf", "%PDF");
    status(200);
    await expect(draft({ source, validFrom: "2099-10-04", validTo: "2099-10-11" })).rejects.toThrow(
      "already exists on the server\nstate: published\nnext: pass --corrected for a corrected PDF",
    );
  });

  it("refuses a period that is not one or two weeks, and a file that is not a PDF or a DOCX", async () => {
    const source = download("porad.pdf", "%PDF");
    await expect(draft({ source, validFrom: "2026-10-04", validTo: "2026-11-04" })).rejects.toThrow(
      "the period 2026-10-04 – 2026-11-04 looks wrong\nnext: pass --from and --to",
    );
    await expect(draft({ source: download("porad.txt", "x") })).rejects.toThrow("is a PDF or a DOCX");
  });

  it.skipIf(!hasPoppler)("reads the week from the PDF heading", async () => {
    const source = download("porad.pdf", pdfWithText(["Porad bohosluzeb od 4. 10. do 11. 10. 2099"]));
    expect((await draft({ source })).lines[0]).toContain("draft record of 2099-10-04 – 2099-10-11");
    const blank = download("prazdny.pdf", pdfWithText(["Farnost Kurim"]));
    await expect(draft({ source: blank })).rejects.toThrow("no 'od … do …' week");
  });
  /** A record covering 2099-10-04 – 2099-10-11, after every real sheet, so the tests keep passing. */
  const record = () => ({
    days: emptyWeek("2099-10-04", "2099-10-11"),
    announcements: [{ category: "info", html: "<p>Sbírka.</p>" }],
  });

  it("adds the record as a sheet after staging the PDF", async () => {
    const source = download("porad.pdf", "%PDF");
    const { lines, written } = await stageSheet(env, {
      source,
      validFrom: "2099-10-04",
      validTo: "2099-10-11",
      record: record(),
    });
    expect(lines[0]).toBe("Staged uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf");
    expect(lines[1]).toBe("Added the sheet 2099-10-04 – 2099-10-11");
    expect(written).toEqual([env.serviceSheetsFile]);
    expect(JSON.parse(readFileSync(env.serviceSheetsFile, "utf8")).sheets.at(-1)).not.toHaveProperty("rev");
  });

  it("stages a released week's corrected PDF as the next rev, then replaces it under that name", async () => {
    const week = { validFrom: "2099-10-04", validTo: "2099-10-11", record: record() };
    await stageSheet(env, { ...week, source: download("porad.pdf", "%PDF first") });
    const lastSheet = () => JSON.parse(readFileSync(env.serviceSheetsFile, "utf8")).sheets.at(-1);
    // Only the first PDF is on the server.
    fetchMock.mockImplementation(async (url: string) => {
      return new Response(null, { status: url.endsWith("/2099-10-04-porad-bohosluzeb.pdf") ? 200 : 404 });
    });
    await expect(stageSheet(env, { ...week, source: "porad.pdf" })).rejects.toThrow("pass --corrected");
    const fixed = download("porad oprava.pdf", "%PDF fixed");
    await expect(
      stageSheet(env, { source: fixed, validFrom: "2099-10-04", validTo: "2099-10-11", corrected: true }),
    ).rejects.toThrow(recordRequired);
    const { lines } = await stageSheet(env, { ...week, source: fixed, corrected: true });
    expect(lines[0]).toBe("Staged uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb-r2.pdf");
    expect(lines[1]).toBe("Replaced the sheet 2099-10-04 – 2099-10-11 with rev 2");
    expect(lastSheet().rev).toBe(2);
    // Corrected again before the release, and a plain rerun: both keep rev 2.
    const again = download("porad oprava 2.pdf", "%PDF fixed again");
    await stageSheet(env, { ...week, source: again, corrected: true });
    await stageSheet(env, { ...week, source: again });
    expect(lastSheet().rev).toBe(2);
    expect(readFileSync(uploaded("porady_bohosluzeb", "2099-10-04-porad-bohosluzeb-r2.pdf"), "utf8")).toBe(
      "%PDF fixed again",
    );
  });

  it("refuses a week before the current sheet, also for a draft and once published", async () => {
    const source = download("porad.pdf", "%PDF");
    const week = { source, validFrom: "2000-01-02", validTo: "2000-01-09" };
    const before = "the sheet 2000-01-02 – 2000-01-09 is before the current sheet";
    await expect(draft(week)).rejects.toThrow(before);
    await expect(stageSheet(env, { ...week, record: record() })).rejects.toThrow(before);
    // Not the --corrected hint for its PDF on the server, nor "no sheet" with --corrected.
    status(200);
    await expect(draft(week)).rejects.toThrow(before);
    await expect(draft({ ...week, corrected: true })).rejects.toThrow(before);
  });

  it("refuses a week overlapping a sheet, also for a draft", async () => {
    await stageSheet(env, {
      source: download("porad.pdf", "%PDF"),
      validFrom: "2099-10-04",
      validTo: "2099-10-11",
      record: record(),
    });
    const source = download("porad 2.pdf", "%PDF other");
    await expect(draft({ source, validFrom: "2099-10-07", validTo: "2099-10-14" })).rejects.toThrow(
      "2099-10-07 – 2099-10-14 starts before 2099-10-04 – 2099-10-11 ends",
    );
    // Sharing the boundary Sunday is fine.
    await expect(draft({ source, validFrom: "2099-10-11", validTo: "2099-10-18" })).resolves.toBeDefined();
  });

  it("says a week already there is replaced by its record, unless --corrected", async () => {
    const week = { source: download("porad.pdf", "%PDF"), validFrom: "2099-10-04", validTo: "2099-10-11" };
    const plain = (await draft(week)).lines;
    await stageSheet(env, { ...week, record: record() });
    expect((await draft(week)).lines).toEqual([
      ...plain,
      "state: staged",
      "next: start the record from the staged sheet to keep its fixes; --record replaces it",
    ]);
    expect((await draft({ ...week, corrected: true })).lines).toEqual(plain);
  });

  it("refuses --corrected for a week not in service-sheets.json", async () => {
    const source = download("porad.pdf", "%PDF");
    await expect(
      stageSheet(env, { source, validFrom: "2099-10-04", validTo: "2099-10-11", corrected: true, record: record() }),
    ).rejects.toThrow("no sheet of 2099-10-04 is added\nnext: leave out --corrected for a new week");
  });

  it("stages nothing for a record it refuses, and only validates with check", async () => {
    const source = download("porad.pdf", "%PDF");
    const week = { source, validFrom: "2099-10-04", validTo: "2099-10-11" };
    await expect(stageSheet(env, { ...week, record: { ...record(), days: [] } })).rejects.toThrow("missing 2099-10-04");
    expect(existsSync(uploaded("porady_bohosluzeb"))).toBe(false);
    // The real sheets copied into the temp folder may add "Would remove …" lines in between: assert the ends only.
    const before = readFileSync(env.serviceSheetsFile, "utf8");
    const checked = await stageSheet(env, { ...week, record: record(), check: true });
    expect(checked.lines[0]).toBe("Would add the sheet 2099-10-04 – 2099-10-11");
    expect(checked.lines.at(-1)).toBe("Would stage uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf");
    expect(readFileSync(env.serviceSheetsFile, "utf8")).toBe(before);
  });

  /**
   * The parish's DOCX with the weeks of 2099-10-04 (newest, first) and 2099-09-27, each on its own page, and the
   * blank page its empty paragraphs at the end can fill.
   */
  const yearDocx = () => {
    const weekBody = (from: string, to: string, intention: string) =>
      wordml.p(`ROZPIS BOHOSLUŽEB V TÝDNU od ${from} do ${to}`) +
      wordml.table([
        [[from.slice(0, -5), "Ne"], [], ["Kuřim"], ["8:00"], [`Mše sv. – ${intention}`]],
        [[to.slice(0, -5), "Ne"], [], ["Kuřim"], ["8:00"], ["Mše sv."]],
      ]) +
      wordml.p("Sbírka je na misie.");
    const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    return download(
      "Pořad bohoslužeb 2099.docx",
      docxWithBody(
        weekBody("4. 10. 2099", "11. 10. 2099", "za farníky") +
          pageBreak +
          weekBody("27. 9. 2099", "4. 10. 2099", "za rodinu") +
          pageBreak +
          wordml.p(""),
      ),
    );
  };

  /**
   * Drafts the newest week of the DOCX `source` (2099-10-04 – 2099-10-11); returns its draft's path, checked up to
   * the events it lists.
   */
  async function draftNewestWeek(source: string) {
    const { lines } = await draft({ source });
    expect(lines.slice(0, 3)).toEqual([
      `Wrote the draft record of 2099-10-04 – 2099-10-11 to ${draftPath()}`,
      "tell: Days without services: 2099-10-05, 2099-10-06, 2099-10-07, 2099-10-08, 2099-10-09, 2099-10-10",
      "Events for newsId (not ended by 2099-09-20):",
    ]);
    return { draft: draftPath() };
  }

  it("asks a DOCX without a record for a draft first", async () => {
    await expect(stageSheet(env, { source: yearDocx() })).rejects.toThrow(recordRequired);
  });

  it("refuses a DOCX without a week's heading", async () => {
    const source = download("Pořad bohoslužeb 2099.docx", docxWithBody(wordml.p("Ohlášky farnosti")));
    await expect(draft({ source })).rejects.toThrow("no 'ROZPIS BOHOSLUŽEB … od … do …' heading in the DOCX");
  });

  it("refuses a DOCX week it does not have", async () => {
    await expect(draft({ source: yearDocx(), validFrom: "2099-10-18", validTo: "2099-10-25" })).rejects.toThrow(
      "no week 2099-10-18 – 2099-10-25 in the DOCX; it has 2099-10-04 – 2099-10-11, 2099-09-27",
    );
  });

  it.skipIf(!hasSoffice || !hasPoppler)(
    "drafts the DOCX's newest week and stages its page",
    { timeout: 120_000 },
    async () => {
      const source = yearDocx();
      const { draft } = await draftNewestWeek(source);
      const drafted = JSON.parse(readFileSync(draft, "utf8"));
      expect(drafted.days[0].rows).toEqual([
        { time: "8:00", place: "kurim", title: "Mše sv.", detail: "za farníky", mass: true },
      ]);
      expect(drafted.announcements).toEqual([{ category: "info", html: "<p>Sbírka je na misie.</p>" }]);
      expect(existsSync(uploaded("porady_bohosluzeb"))).toBe(false);

      // Staged twice (a rerun converts again): the week's page only, replaced.
      const days = emptyWeek("2099-10-04", "2099-10-11");
      const week = { source, record: { ...record(), days } };
      await stageSheet(env, week);
      await stageSheet(env, week);
      const staged = uploaded("porady_bohosluzeb", "2099-10-04-porad-bohosluzeb.pdf");
      const pages = pdfPageTexts(staged).map((page) => page.replace(/\s+/g, " "));
      expect(pages).toHaveLength(1);
      expect(pages[0]).toContain("za farníky");
      expect(pages[0]).not.toContain("za rodinu");

      // The last week of the document: its page, without the blank one after it.
      const older = { source, validFrom: "2099-09-27", validTo: "2099-10-04" };
      await draftSheet(env, { ...older, out: join(env.home, "older.json") });
      const olderDays = emptyWeek("2099-09-27", "2099-10-04");
      await stageSheet(env, { ...older, record: { ...record(), days: olderDays } });
      const olderPages = pdfPageTexts(uploaded("porady_bohosluzeb", "2099-09-27-porad-bohosluzeb.pdf"));
      expect(olderPages.map((page) => page.replace(/\s+/g, " "))).toEqual([expect.stringContaining("za rodinu")]);
    },
  );

  describe("from a DOCX, with the converter and the PDF tools faked", () => {
    // The converted year: each week on its page, and the blank page the empty paragraphs at the end fill.
    const convertedPages = [
      "ROZPIS BOHOSLUŽEB V TÝDNU od 4. 10. 2099 do 11. 10. 2099\nMše sv. – za farníky",
      "ROZPIS BOHOSLUŽEB V TÝDNU od 27. 9. 2099 do 4. 10. 2099\nMše sv. – za rodinu",
      " \n",
    ];

    beforeEach(() => {
      vi.mocked(docxToPdf).mockImplementation((_file, dir) => {
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "converted.pdf"), "%PDF");
        return join(dir, "converted.pdf");
      });
      vi.mocked(pdfPageTexts).mockImplementation(() => convertedPages);
      vi.mocked(extractPdfPages).mockImplementation((_pdf, [first, last], dest) =>
        writeFileSync(dest, `pages ${first}–${last}`),
      );
    });

    afterEach(() => {
      vi.mocked(docxToPdf).mockReset();
      vi.mocked(pdfPageTexts).mockReset();
      vi.mocked(extractPdfPages).mockReset();
    });

    it("drafts the newest week and stages only its page", async () => {
      const source = yearDocx();
      const { draft } = await draftNewestWeek(source);
      expect(JSON.parse(readFileSync(draft, "utf8")).days[0].rows).toEqual([
        { time: "8:00", place: "kurim", title: "Mše sv.", detail: "za farníky", mass: true },
      ]);
      expect(existsSync(uploaded("porady_bohosluzeb"))).toBe(false);

      await stageSheet(env, { source, record: record() });
      expect(readFileSync(uploaded("porady_bohosluzeb", "2099-10-04-porad-bohosluzeb.pdf"), "utf8")).toBe("pages 1–1");
    });

    it("stages the last week's page without the blank one after it", async () => {
      const days = emptyWeek("2099-09-27", "2099-10-04");
      const older = { validFrom: "2099-09-27", validTo: "2099-10-04", record: { ...record(), days } };
      await stageSheet(env, { source: yearDocx(), ...older });
      expect(readFileSync(uploaded("porady_bohosluzeb", "2099-09-27-porad-bohosluzeb.pdf"), "utf8")).toBe("pages 2–2");
    });

    it("names the DOCX's newest week when --from and --to name an older one, and only then", async () => {
      const source = yearDocx();
      const older = { source, validFrom: "2099-09-27", validTo: "2099-10-04" };
      const note = "tell: Not the DOCX's newest week: its newest, 2099-10-04 – 2099-10-11, is left out of this run;";
      expect((await draft(older)).lines[0]).toBe(`${note} it is not staged yet`);
      const newest = { source, validFrom: "2099-10-04", validTo: "2099-10-11" };
      expect((await draft(newest)).lines[0]).toMatch(/^Wrote the draft record/);

      // Once the newest week is there, the note says so.
      await stageSheet(env, { source, record: record() });
      expect((await draft(older)).lines[0]).toBe(
        `${note} it is already staged, and this DOCX's version of it is not checked`,
      );
    });

    it("names the newer week in a refusal too, and that it is likely the one meant", async () => {
      const source = download(
        "Pořad bohoslužeb 2000.docx",
        docxWithBody(
          wordml.p("ROZPIS BOHOSLUŽEB V TÝDNU od 9. 1. 2000 do 16. 1. 2000") +
            wordml.p("ROZPIS BOHOSLUŽEB V TÝDNU od 2. 1. 2000 do 9. 1. 2000"),
        ),
      );
      vi.mocked(pdfPageTexts).mockImplementation(() => [
        "ROZPIS BOHOSLUŽEB V TÝDNU od 9. 1. 2000 do 16. 1. 2000",
        "ROZPIS BOHOSLUŽEB V TÝDNU od 2. 1. 2000 do 9. 1. 2000",
      ]);
      const week = { source, validFrom: "2000-01-02", validTo: "2000-01-09" };
      const refusal = stageSheet(env, { ...week, record: record(), check: true });
      // Printed once: the note's tell: line ends the message, with nothing of the refusal repeated after it.
      const error = await refusal.catch((e: unknown) => e);
      expect(errorMessage(error)).toBe((error as Error).message);
      await expect(refusal).rejects.toThrow("the sheet 2000-01-02 – 2000-01-09 is before the current sheet");
      await expect(refusal).rejects.toThrow(
        "tell: Not the DOCX's newest week: its newest, 2000-01-09 – 2000-01-16, is left out of this run; it is not staged yet. This week ended on 2000-01-09: the newer week is likely the one meant",
      );
    });

    it("writes each draft and staging run's result, the last one winning, and none for a check", async () => {
      const file = join(env.home, "stage-result.json");
      const withResult = { ...env, result: file };
      const week = { validFrom: "2099-10-04", validTo: "2099-10-11" };
      const source = yearDocx();
      await stageSheet(withResult, { source, record: record(), check: true });
      expect(readSheetResult(file)).toBeUndefined();
      await draftSheet(withResult, { source, out: join(env.home, "draft.json") });
      expect(readSheetResult(file)).toEqual({ ...week, result: "drafted" });
      await stageSheet(withResult, { source, record: record() });
      expect(readSheetResult(file)).toEqual({ ...week, result: "staged" });

      // A week before the current sheet: refused, with the refusal's first line, not the note after it.
      const old = download(
        "Pořad bohoslužeb 2000.docx",
        docxWithBody(wordml.p("ROZPIS BOHOSLUŽEB V TÝDNU od 2. 1. 2000 do 9. 1. 2000")),
      );
      vi.mocked(pdfPageTexts).mockImplementation(() => ["ROZPIS BOHOSLUŽEB V TÝDNU od 2. 1. 2000 do 9. 1. 2000"]);
      await expect(stageSheet(withResult, { source: old, record: record() })).rejects.toThrow("before the current");
      expect(readSheetResult(file)).toEqual({
        validFrom: "2000-01-02",
        validTo: "2000-01-09",
        result: "refused",
        reason: expect.stringMatching(/^the sheet 2000-01-02 – 2000-01-09 is before the current sheet \([^\n]*$/),
      });
    });

    it("writes a document error for a DOCX it cannot read, with the week once it is known", async () => {
      const file = join(env.home, "stage-result.json");
      const withResult = { ...env, result: file };
      const out = join(env.home, "draft.json");
      const headless = download("Pořad bohoslužeb 2099.docx", docxWithBody(wordml.p("Ohlášky farnosti")));
      await expect(draftSheet(withResult, { source: headless, out })).rejects.toThrow("no 'ROZPIS BOHOSLUŽEB");
      expect(readSheetResult(file)).toEqual({
        result: "document-error",
        reason: "no 'ROZPIS BOHOSLUŽEB … od … do …' heading in the DOCX",
      });
      const misdated = download(
        "Pořad bohoslužeb 2099.docx",
        docxWithBody(
          wordml.p("ROZPIS BOHOSLUŽEB V TÝDNU od 4. 10. 2099 do 11. 10. 2099") +
            wordml.table([[["5. 10.", "Ne"], [], ["Kuřim"], ["8:00"], ["Mše sv."]]]),
        ),
      );
      await expect(draftSheet(withResult, { source: misdated, out })).rejects.toThrow('is marked "Ne"');
      expect(readSheetResult(file)).toMatchObject({
        validFrom: "2099-10-04",
        validTo: "2099-10-11",
        result: "document-error",
      });
    });

    it("writes the draft before converting, so it can be checked without a converter", async () => {
      vi.mocked(docxToPdf).mockImplementation(() => {
        throw new Error("no Word or LibreOffice to convert the DOCX");
      });
      const draft = join(env.home, "draft.json");
      await expect(draftSheet(env, { source: yearDocx(), out: draft })).rejects.toThrow("no Word or LibreOffice");
      expect(JSON.parse(readFileSync(draft, "utf8")).days).toHaveLength(8);
    });

    it("refuses a converted document whose pages lack the week's heading", async () => {
      vi.mocked(pdfPageTexts).mockImplementation(() => ["Mše sv. – za farníky"]);
      await expect(draft({ source: yearDocx() })).rejects.toThrow(
        "no page of the converted DOCX has the heading of 2099-10-04 – 2099-10-11",
      );
    });
  });
});
