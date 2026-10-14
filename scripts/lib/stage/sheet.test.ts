import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stageSheet, weekDays } from "./sheet";
import { extractPdfPages, pdfPageTexts } from "../images";
import { docxToPdf } from "../services/docx-to-pdf";
import { docxWithBody, hasPoppler, hasSoffice, pdfWithText, useStageFixture, wordml } from "../test-helpers";

// The real converter and PDF tools, wrapped so the DOCX tests below can run without LibreOffice and poppler.
vi.mock("../services/docx-to-pdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/docx-to-pdf")>();
  return { ...actual, docxToPdf: vi.fn(actual.docxToPdf) };
});
vi.mock("../images", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../images")>();
  return { ...actual, pdfPageTexts: vi.fn(actual.pdfPageTexts), extractPdfPages: vi.fn(actual.extractPdfPages) };
});

describe("weekDays", () => {
  it("lists every day with its Czech weekday", () => {
    const days = weekDays("2026-10-04", "2026-10-11");
    expect(days).toHaveLength(8);
    expect(days.slice(0, 2)).toEqual(["ne 2026-10-04", "po 2026-10-05"]);
    expect(days.at(-1)).toBe("ne 2026-10-11");
  });
});

describe("stageSheet", { timeout: 30_000 }, () => {
  const { env, status, download, uploaded, fetchMock } = useStageFixture();

  it("lists the week's days with check and refuses to stage without a record", async () => {
    const source = download("porad.pdf", "%PDF");
    const week = { source, validFrom: "2026-10-04", validTo: "2026-10-11" };
    expect((await stageSheet(env, { ...week, check: true })).lines).toEqual([
      "Would stage uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb.pdf",
      '  validFrom: "2026-10-04",\n  validTo: "2026-10-11",',
      `days: ${weekDays("2026-10-04", "2026-10-11").join(", ")}`,
    ]);
    await expect(stageSheet(env, week)).rejects.toThrow("--record is required to stage the PDF");
    expect(existsSync(uploaded("porady_bohosluzeb"))).toBe(false);
  });

  it("hints at --corrected when the week is published", async () => {
    const source = download("porad.pdf", "%PDF");
    status(200);
    await expect(
      stageSheet(env, { source, validFrom: "2026-10-04", validTo: "2026-10-11", check: true }),
    ).rejects.toThrow("this week is already published; for a corrected PDF pass --corrected");
  });

  it("refuses a period that is not one or two weeks, and a file that is not a PDF or a DOCX", async () => {
    const source = download("porad.pdf", "%PDF");
    await expect(
      stageSheet(env, { source, validFrom: "2026-10-04", validTo: "2026-11-04", check: true }),
    ).rejects.toThrow("the period 2026-10-04 – 2026-11-04 looks wrong");
    await expect(stageSheet(env, { source: download("porad.txt", "x"), check: true })).rejects.toThrow(
      "is a PDF or a DOCX",
    );
  });

  it.skipIf(!hasPoppler)("reads the week from the PDF heading", async () => {
    const source = download("porad.pdf", pdfWithText(["Porad bohosluzeb od 4. 10. do 11. 10. 2026"]));
    expect((await stageSheet(env, { source, check: true })).lines[1]).toContain('validFrom: "2026-10-04"');
    const blank = download("prazdny.pdf", pdfWithText(["Farnost Kurim"]));
    await expect(stageSheet(env, { source: blank, check: true })).rejects.toThrow("no 'od … do …' week");
  });
  /** A record covering 2099-10-04 – 2099-10-11, after every real sheet, so the tests keep passing. */
  const record = () => ({
    days: weekDays("2099-10-04", "2099-10-11").map((d) => ({ date: d.slice(3), rows: [] })),
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
    expect(lines[1]).toBe("Added the sheet 2099-10-04 – 2099-10-11 to src/content/service-sheets.json");
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
    ).rejects.toThrow("--record is required to stage the PDF");
    const { lines } = await stageSheet(env, { ...week, source: fixed, corrected: true });
    expect(lines[0]).toBe("Staged uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb-r2.pdf");
    expect(lines[1]).toBe("Replaced the sheet 2099-10-04 – 2099-10-11 with rev 2 in src/content/service-sheets.json");
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

  it("refuses --corrected for a week not in service-sheets.json", async () => {
    const source = download("porad.pdf", "%PDF");
    await expect(
      stageSheet(env, { source, validFrom: "2099-10-04", validTo: "2099-10-11", corrected: true, record: record() }),
    ).rejects.toThrow("no sheet of 2099-10-04 in service-sheets.json");
  });

  it("stages nothing for a record it refuses, and only validates with check", async () => {
    const source = download("porad.pdf", "%PDF");
    const week = { source, validFrom: "2099-10-04", validTo: "2099-10-11" };
    await expect(stageSheet(env, { ...week, record: { ...record(), days: [] } })).rejects.toThrow("missing 2099-10-04");
    expect(existsSync(uploaded("porady_bohosluzeb"))).toBe(false);
    // The real sheets copied into the temp folder may add "Would remove …" lines in between: assert the ends only.
    const before = readFileSync(env.serviceSheetsFile, "utf8");
    const checked = await stageSheet(env, { ...week, record: record(), check: true });
    expect(checked.lines[0]).toBe("Would add the sheet 2099-10-04 – 2099-10-11 to src/content/service-sheets.json");
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

  it("refuses --draft with a PDF or with a record, and a DOCX week it does not have", async () => {
    const pdf = download("porad.pdf", "%PDF");
    const draft = join(env.home, "draft.json");
    await expect(stageSheet(env, { source: pdf, draft })).rejects.toThrow("--draft reads the week from a DOCX");
    await expect(stageSheet(env, { source: yearDocx(), draft, record: record() })).rejects.toThrow(
      "--draft writes a record to check: not with --record",
    );
    await expect(
      stageSheet(env, { source: yearDocx(), validFrom: "2099-10-18", validTo: "2099-10-25", check: true }),
    ).rejects.toThrow("no week 2099-10-18 – 2099-10-25 in the DOCX; it has 2099-10-04 – 2099-10-11, 2099-09-27");
  });

  it.skipIf(!hasSoffice || !hasPoppler)(
    "drafts the DOCX's newest week and stages its page",
    { timeout: 120_000 },
    async () => {
      const source = yearDocx();
      const draft = join(env.home, "draft.json");
      const { lines } = await stageSheet(env, { source, draft });
      expect(lines.slice(0, 3)).toEqual([
        `Wrote the draft record of 2099-10-04 – 2099-10-11 to ${draft}`,
        "Days without services (tell the user): 2099-10-05, 2099-10-06, 2099-10-07, 2099-10-08, 2099-10-09, 2099-10-10",
        "Would stage uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf",
      ]);
      const drafted = JSON.parse(readFileSync(draft, "utf8"));
      expect(drafted.days[0].rows).toEqual([
        { time: "8:00", place: "kurim", title: "Mše sv.", detail: "za farníky", mass: true },
      ]);
      expect(drafted.announcements).toEqual([{ category: "info", html: "<p>Sbírka je na misie.</p>" }]);
      expect(existsSync(uploaded("porady_bohosluzeb"))).toBe(false);

      // Staged twice (a rerun converts again): the week's page only, replaced.
      const days = weekDays("2099-10-04", "2099-10-11").map((d) => ({ date: d.slice(3), rows: [] }));
      const week = { source, record: { ...record(), days } };
      await stageSheet(env, week);
      await stageSheet(env, week);
      const staged = uploaded("porady_bohosluzeb", "2099-10-04-porad-bohosluzeb.pdf");
      const pages = pdfPageTexts(staged).map((page) => page.replace(/\s+/g, " "));
      expect(pages).toHaveLength(1);
      expect(pages[0]).toContain("za farníky");
      expect(pages[0]).not.toContain("za rodinu");

      // The last week of the document: its page, without the blank one after it.
      const older = { source, validFrom: "2099-09-27", validTo: "2099-10-04", check: true };
      await stageSheet(env, { ...older, draft: join(env.home, "older.json") });
      const olderDays = weekDays("2099-09-27", "2099-10-04").map((d) => ({ date: d.slice(3), rows: [] }));
      await stageSheet(env, { ...older, check: false, record: { ...record(), days: olderDays } });
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
      const draft = join(env.home, "draft.json");
      const { lines } = await stageSheet(env, { source, draft });
      expect(lines).toEqual([
        `Wrote the draft record of 2099-10-04 – 2099-10-11 to ${draft}`,
        "Days without services (tell the user): 2099-10-05, 2099-10-06, 2099-10-07, 2099-10-08, 2099-10-09, 2099-10-10",
        "Would stage uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf",
        '  validFrom: "2099-10-04",\n  validTo: "2099-10-11",',
        `days: ${weekDays("2099-10-04", "2099-10-11").join(", ")}`,
      ]);
      expect(JSON.parse(readFileSync(draft, "utf8")).days[0].rows).toEqual([
        { time: "8:00", place: "kurim", title: "Mše sv.", detail: "za farníky", mass: true },
      ]);
      expect(existsSync(uploaded("porady_bohosluzeb"))).toBe(false);

      await stageSheet(env, { source, record: record() });
      expect(readFileSync(uploaded("porady_bohosluzeb", "2099-10-04-porad-bohosluzeb.pdf"), "utf8")).toBe("pages 1–1");
    });

    it("stages the last week's page without the blank one after it", async () => {
      const days = weekDays("2099-09-27", "2099-10-04").map((d) => ({ date: d.slice(3), rows: [] }));
      const older = { validFrom: "2099-09-27", validTo: "2099-10-04", record: { ...record(), days } };
      await stageSheet(env, { source: yearDocx(), ...older });
      expect(readFileSync(uploaded("porady_bohosluzeb", "2099-09-27-porad-bohosluzeb.pdf"), "utf8")).toBe("pages 2–2");
    });

    it("writes the draft before converting, so it can be checked without a converter", async () => {
      vi.mocked(docxToPdf).mockImplementation(() => {
        throw new Error("no Word or LibreOffice to convert the DOCX");
      });
      const draft = join(env.home, "draft.json");
      await expect(stageSheet(env, { source: yearDocx(), draft })).rejects.toThrow("no Word or LibreOffice");
      expect(JSON.parse(readFileSync(draft, "utf8")).days).toHaveLength(8);
    });

    it("refuses a converted document whose pages lack the week's heading", async () => {
      vi.mocked(pdfPageTexts).mockImplementation(() => ["Mše sv. – za farníky"]);
      await expect(stageSheet(env, { source: yearDocx(), check: true })).rejects.toThrow(
        "no page of the converted DOCX has the heading of 2099-10-04 – 2099-10-11",
      );
    });
  });
});
