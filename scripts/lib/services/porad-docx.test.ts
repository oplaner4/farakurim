import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { docxWeeks } from "./porad-docx";
import { docxWithBody, wordml } from "../test-helpers";

const { p, run, table } = wordml;

/** The week 11.–18. 10. 2026 as the parish writes it: merged rows for a day's second place, "–" for no services. */
const week = table([
  [
    ["11. 10.", "Ne"],
    ["28. NEDĚLE V MEZIDOBÍ"],
    ["Kuřim"],
    ["8:00", "9:30", ""],
    ["Mše sv. – za rodinu Skoupou", "Mše sv. se zpěvem scholy – za farníky"],
  ],
  [[], [], ["Moravské Knínice"], ["11:00"], ["Mše sv. – na poděkování"]],
  [
    ["12. 10.", "Po"],
    ["sv. Radim"],
    ["Kuřim"],
    ["17:30", "8:00"],
    ["Modlitba sv. růžence a požehnání", "Mše sv. – za Pavla"],
  ],
  [["13. 10.", "Út"], [], ["Tišnov"], ["17:00"], ["Mše sv. – za živé a † farníky"]],
  [["14. 10.", "St"], [], ["Kuřim"], ["10:00", "15:00"], ["Pohřeb – Jan Novák", "Adorace"]],
  [["15. 10.", "Čt"], [], [], ["–"], ["–"]],
  [["16. 10.", "Pá"], [], ["Kuřim"], ["18:00"], ["Mše sv."]],
  [["17. 10.", "So"], [], ["Kuřim"], ["8:00"], ["Mše sv."]],
  [["18. 10.", "Ne"], ["SLAVNOST POSVĚCENÍ FARNÍHO KOSTELA"], ["Kuřim"], ["9:30"], ["Mše sv."]],
]);

const heading = (text: string) => p(run(text, { bold: true }));

describe("docxWeeks", () => {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "docx-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const docx = (body: string, links: Record<string, string> = {}) => {
    const file = join(dir, "porad.docx");
    writeFileSync(file, docxWithBody(body, links));
    return file;
  };

  it("lists the weeks in the document's order", () => {
    const file = docx(
      heading("ROZPIS BOHOSLUŽEB V TÝDNU od 11. 10. 2026 do 18. 10. 2026") +
        week +
        p("Výuka bude od 12. 10. do 19. 10. 2026.") +
        heading("ROZPIS BOHOSLUŽEB V TÝDNU od 28. 12. do 4. 1. 2026"),
    );
    expect(docxWeeks(file).map(({ validFrom, validTo }) => ({ validFrom, validTo }))).toEqual([
      { validFrom: "2026-10-11", validTo: "2026-10-18" },
      { validFrom: "2025-12-28", validTo: "2026-01-04" },
    ]);
  });

  it("reads a week's days from its table", () => {
    const file = docx(heading("ROZPIS BOHOSLUŽEB V TÝDNU od 11. 10. 2026 do 18. 10. 2026") + week);
    const { days } = docxWeeks(file)[0].draft();
    expect(days.map((d) => d.date)).toEqual([
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
    expect(days[0]).toEqual({
      date: "2026-10-11",
      feast: "28. neděle v mezidobí",
      solemnity: true,
      rows: [
        { time: "8:00", place: "kurim", title: "Mše sv.", detail: "za rodinu Skoupou", mass: true },
        { time: "9:30", place: "kurim", title: "Mše sv. se zpěvem scholy", detail: "za farníky", mass: true },
        { time: "11:00", place: "moravske-kninice", title: "Mše sv.", detail: "na poděkování", mass: true },
      ],
    });
    // In time order; a service in a parish church counts, a mass elsewhere or a funeral does not.
    expect(days[1]).toMatchObject({ feast: "sv. Radim", solemnity: false });
    expect(days[1].rows.map((r) => [r.time, r.mass, r.service])).toEqual([
      ["8:00", true, undefined],
      ["17:30", undefined, true],
    ]);
    expect(days[2]).toEqual({
      date: "2026-10-13",
      solemnity: false,
      rows: [{ time: "17:00", place: "Tišnov", title: "Mše sv.", detail: "za živé a † farníky" }],
    });
    expect(days[3].rows).toEqual([
      { time: "10:00", place: "kurim", title: "Pohřeb", detail: "Jan Novák" },
      { time: "15:00", place: "kurim", title: "Adorace", service: true },
    ]);
    expect(days[4].rows).toEqual([]);
    expect(days[7]).toMatchObject({ feast: "Slavnost posvěcení farního kostela", solemnity: true });
  });

  it("reads the announcements below the table as HTML with a guessed category", () => {
    const file = docx(
      heading("ROZPIS BOHOSLUŽEB V TÝDNU od 11. 10. 2026 do 18. 10. 2026") +
        week +
        p("") +
        p("V Kuřimi se zpovídá ve čtvrtek od 17.30 hod.") +
        p(
          "V pondělí je ",
          run("Adorační ", { bold: true }),
          run("den farnosti", { bold: true }),
          ". Hrají ",
          run("Dej nám akord", { italic: true }),
          " & spol.",
        ) +
        p(
          "Přihlášky na ",
          `<w:hyperlink r:id="rId5">${run("syrkova@zus.cz")}</w:hyperlink>`,
          " a ",
          `<w:hyperlink r:id="rId6">${run("web")}</w:hyperlink>`,
          ".",
        ) +
        heading("ROZPIS BOHOSLUŽEB V TÝDNU od 4. 10. 2026 do 11. 10. 2026"),
      { rId5: "syrkova@zus.cz", rId6: "https://www.farakurim.cz/" },
    );
    expect(docxWeeks(file)[0].draft().announcements).toEqual([
      { category: "smireni", html: "<p>V Kuřimi se zpovídá ve čtvrtek od 17.30 hod.</p>" },
      {
        category: "info",
        html: "<p>V pondělí je <strong>Adorační den farnosti</strong>. Hrají <em>Dej nám akord</em> &amp; spol.</p>",
      },
      {
        category: "pozvanka",
        html: '<p>Přihlášky na <a href="mailto:syrkova@zus.cz">syrkova@zus.cz</a> a <a href="https://www.farakurim.cz/">web</a>.</p>',
      },
    ]);
  });

  it("refuses a table it cannot read, naming the week and the day", () => {
    const draft = (rows: string[][][]) =>
      docxWeeks(docx(heading("ROZPIS BOHOSLUŽEB V TÝDNU od 11. 10. 2026 do 18. 10. 2026") + table(rows)))[0].draft;
    expect(draft([[["11. 10.", "Ne"], [], ["Kuřim"], ["8:00", "9:30"], ["Mše sv."]]])).toThrow(
      "the week 2026-10-11 – 2026-10-18, 2026-10-11: the times (8:00, 9:30) do not pair with the 1 services",
    );
    expect(draft([[["16. 5.", "Út"], [], ["Kuřim"], ["8:00"], ["Mše sv."]]])).toThrow(
      'the day "16. 5. Út" is not in the week',
    );
    expect(draft([[["12. 10.", "Út"], [], ["Kuřim"], ["8:00"], ["Mše sv."]]])).toThrow(
      '12. 10. is marked "Út", but 2026-10-12 is "Po"',
    );
    expect(draft([[["12. 10.", "Po"], ["Kuřim"], ["8:00"], ["Mše sv."]]])).toThrow("a table row with 4 cells");
  });

  it("refuses a file that is not a DOCX", () => {
    const file = join(dir, "porad.docx");
    writeFileSync(file, "%PDF");
    expect(() => docxWeeks(file)).toThrow("is not a Word document (.docx)");
  });
});
