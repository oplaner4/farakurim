import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stageSheet, weekDays } from "./sheet";
import { addEvent } from "../news/add-event";
import { extractPdfPages, pdfPageTexts } from "../images";
import { docxToPdf } from "../services/docx-to-pdf";
import { docxWithBody, emptyWeek, hasPoppler, hasSoffice, pdfWithText, useStageFixture, wordml } from "../test-helpers";

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
    const week = { source, validFrom: "2099-10-04", validTo: "2099-10-11" };
    // The real news copied into the temp folder add the events after the header: assert up to it.
    expect((await stageSheet(env, { ...week, check: true })).lines.slice(0, 4)).toEqual([
      "Would stage uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf",
      '  validFrom: "2099-10-04",\n  validTo: "2099-10-11",',
      `days: ${weekDays("2099-10-04", "2099-10-11").join(", ")}`,
      "Events for newsId (not ended by 2099-09-20):",
    ]);
    await expect(stageSheet(env, week)).rejects.toThrow("--record is required to stage the PDF");
    expect(existsSync(uploaded("porady_bohosluzeb"))).toBe(false);
  });

  it("lists the events an announcement can link, from 14 days before the week", async () => {
    const event = { place: "Lukov", text: "Zveme na pouť." };
    addEvent(env.newsDir, { ...event, id: "pout-2099", title: "Pouť do Lukova", start: "2099-10-10" });
    addEvent(env.newsDir, { ...event, id: "hody-2099", title: "Hody", start: "2099-09-20", end: "2099-09-21" });
    addEvent(env.newsDir, { ...event, id: "dozinky-2099", title: "Dožínky", start: "2099-09-19" });
    const week = { source: download("porad.pdf", "%PDF"), validFrom: "2099-10-04", validTo: "2099-10-11" };
    // In start order, after the real long-term events without an end; Dožínky ended before 2099-09-20.
    expect((await stageSheet(env, { ...week, check: true })).lines.slice(-2)).toEqual([
      "  hody-2099: Hody, 2099-09-20–2099-09-21, Lukov",
      "  pout-2099: Pouť do Lukova, 2099-10-10, Lukov",
    ]);
  });

  it("hints at --corrected when the week is published", async () => {
    const source = download("porad.pdf", "%PDF");
    status(200);
    await expect(
      stageSheet(env, { source, validFrom: "2099-10-04", validTo: "2099-10-11", check: true }),
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
    const source = download("porad.pdf", pdfWithText(["Porad bohosluzeb od 4. 10. do 11. 10. 2099"]));
    expect((await stageSheet(env, { source, check: true })).lines[1]).toContain('validFrom: "2099-10-04"');
    const blank = download("prazdny.pdf", pdfWithText(["Farnost Kurim"]));
    await expect(stageSheet(env, { source: blank, check: true })).rejects.toThrow("no 'od … do …' week");
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

  it("refuses a week before the current sheet, even without a record and once published", async () => {
    const source = download("porad.pdf", "%PDF");
    const week = { source, validFrom: "2000-01-02", validTo: "2000-01-09" };
    const before = "the sheet 2000-01-02 – 2000-01-09 is before the current sheet";
    await expect(stageSheet(env, { ...week, check: true })).rejects.toThrow(before);
    await expect(stageSheet(env, { ...week, record: record() })).rejects.toThrow(before);
    // Not the --corrected hint for its PDF on the server, nor "no sheet" with --corrected.
    status(200);
    await expect(stageSheet(env, { ...week, check: true })).rejects.toThrow(before);
    await expect(stageSheet(env, { ...week, corrected: true, check: true })).rejects.toThrow(before);
  });

  it("refuses a week overlapping a sheet, even without a record", async () => {
    await stageSheet(env, {
      source: download("porad.pdf", "%PDF"),
      validFrom: "2099-10-04",
      validTo: "2099-10-11",
      record: record(),
    });
    const source = download("porad 2.pdf", "%PDF other");
    await expect(
      stageSheet(env, { source, validFrom: "2099-10-07", validTo: "2099-10-14", check: true }),
    ).rejects.toThrow("2099-10-07 – 2099-10-14 starts before 2099-10-04 – 2099-10-11 ends");
    // Sharing the boundary Sunday is fine.
    await expect(
      stageSheet(env, { source, validFrom: "2099-10-11", validTo: "2099-10-18", check: true }),
    ).resolves.toBeDefined();
  });

  it("says a week already there is replaced by its record, unless --corrected", async () => {
    const week = { source: download("porad.pdf", "%PDF"), validFrom: "2099-10-04", validTo: "2099-10-11" };
    expect((await stageSheet(env, { ...week, check: true })).lines).toHaveLength(5);
    await stageSheet(env, { ...week, record: record() });
    expect((await stageSheet(env, { ...week, check: true })).lines.at(-1)).toBe(
      "The sheet 2099-10-04 – 2099-10-11 is already in src/content/service-sheets.json, not released yet: --record replaces it, so start the record from that sheet to keep its fixes",
    );
    expect((await stageSheet(env, { ...week, corrected: true, check: true })).lines).toHaveLength(5);
  });

  it("refuses --corrected for a week not in service-sheets.json", async () => {
    const source = download("porad.pdf", "%PDF");
    await expect(
      stageSheet(env, { source, validFrom: "2099-10-04", validTo: "2099-10-11", corrected: true, record: record() }),
    ).rejects.toThrow("no sheet of 2099-10-04 in service-sheets.json");
  });

  it("replaces the record of a sheet without a source, keeping its PDF and rev", async () => {
    const week = { validFrom: "2099-10-04", validTo: "2099-10-11" };
    await stageSheet(env, { ...week, source: download("porad.pdf", "%PDF first"), record: record() });
    // Only the first PDF is on the server.
    fetchMock.mockImplementation(async (url: string) => {
      return new Response(null, { status: url.endsWith("/2099-10-04-porad-bohosluzeb.pdf") ? 200 : 404 });
    });
    const source = download("porad oprava.pdf", "%PDF fixed");
    await stageSheet(env, { ...week, source, corrected: true, record: record() });
    const fixed = { ...record(), announcements: [{ category: "info", html: "<p>Sbírka na opravy.</p>" }] };
    const lastSheet = () => JSON.parse(readFileSync(env.serviceSheetsFile, "utf8")).sheets.at(-1);

    expect((await stageSheet(env, { ...week, record: fixed, check: true })).lines).toEqual([
      "Would replace the sheet 2099-10-04 – 2099-10-11 with rev 2 in src/content/service-sheets.json",
    ]);
    expect(lastSheet().announcements[0].html).toBe("<p>Sbírka.</p>");
    const { lines, written } = await stageSheet(env, { ...week, record: fixed });
    expect(lines).toEqual(["Replaced the sheet 2099-10-04 – 2099-10-11 with rev 2 in src/content/service-sheets.json"]);
    expect(written).toEqual([env.serviceSheetsFile]);
    expect(lastSheet()).toMatchObject({ rev: 2, announcements: [{ html: "<p>Sbírka na opravy.</p>" }] });
    expect(readFileSync(uploaded("porady_bohosluzeb", "2099-10-04-porad-bohosluzeb-r2.pdf"), "utf8")).toBe(
      "%PDF fixed",
    );
  });

  it("refuses a run without a source that is not a record of a sheet already there", async () => {
    const week = { validFrom: "2099-10-04", validTo: "2099-10-11" };
    await expect(stageSheet(env, { ...week, record: record() })).rejects.toThrow(
      "no sheet of 2099-10-04 – 2099-10-11 in service-sheets.json",
    );
    await stageSheet(env, { ...week, source: download("porad.pdf", "%PDF"), record: record() });
    await expect(stageSheet(env, { record: record() })).rejects.toThrow("--from and --to");
    await expect(stageSheet(env, { ...week, check: true })).rejects.toThrow("--record");
    await expect(stageSheet(env, { ...week, record: record(), corrected: true })).rejects.toThrow("--corrected");
    await expect(stageSheet(env, { ...week, draft: "draft.json" })).rejects.toThrow("--draft");
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

  it("asks a DOCX without a record for --draft first", async () => {
    await expect(stageSheet(env, { source: yearDocx() })).rejects.toThrow(
      "--record is required to stage the week's page; for a DOCX, first write the draft record with --draft <file>",
    );
  });

  it("refuses a DOCX without a week's heading", async () => {
    const source = download("Pořad bohoslužeb 2099.docx", docxWithBody(wordml.p("Ohlášky farnosti")));
    await expect(stageSheet(env, { source, check: true })).rejects.toThrow(
      "no 'ROZPIS BOHOSLUŽEB … od … do …' heading in the DOCX",
    );
  });

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
      const older = { source, validFrom: "2099-09-27", validTo: "2099-10-04", check: true };
      await stageSheet(env, { ...older, draft: join(env.home, "older.json") });
      const olderDays = emptyWeek("2099-09-27", "2099-10-04");
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
      expect(lines.slice(0, 6)).toEqual([
        `Wrote the draft record of 2099-10-04 – 2099-10-11 to ${draft}`,
        "Days without services (tell the user): 2099-10-05, 2099-10-06, 2099-10-07, 2099-10-08, 2099-10-09, 2099-10-10",
        "Would stage uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf",
        '  validFrom: "2099-10-04",\n  validTo: "2099-10-11",',
        `days: ${weekDays("2099-10-04", "2099-10-11").join(", ")}`,
        "Events for newsId (not ended by 2099-09-20):",
      ]);
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
