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
  [["14. 10.", "St"], [], ["Kuřim"], ["10:00", "15:00", "18:00"], ["Pohřeb – Jan Novák", "Adorace", "Hodová mše sv."]],
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

  it("lists the weeks in the document's order", async () => {
    const file = docx(
      heading("ROZPIS BOHOSLUŽEB V TÝDNU od 11. 10. 2026 do 18. 10. 2026") +
        week +
        p("Výuka bude od 12. 10. do 19. 10. 2026.") +
        heading("ROZPIS BOHOSLUŽEB V TÝDNU od 28. 12. do 4. 1. 2026"),
    );
    expect((await docxWeeks(file)).map(({ validFrom, validTo }) => ({ validFrom, validTo }))).toEqual([
      { validFrom: "2026-10-11", validTo: "2026-10-18" },
      { validFrom: "2025-12-28", validTo: "2026-01-04" },
    ]);
  });

  it("reads a week's days from its table", async () => {
    const file = docx(heading("ROZPIS BOHOSLUŽEB V TÝDNU od 11. 10. 2026 do 18. 10. 2026") + week);
    const { days } = (await docxWeeks(file))[0].draft();
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
      { time: "18:00", place: "kurim", title: "Hodová mše sv.", mass: true },
    ]);
    expect(days[4].rows).toEqual([]);
    expect(days[7]).toMatchObject({ feast: "Slavnost posvěcení farního kostela", solemnity: true });
  });

  it("reads the announcements below the table as HTML with a guessed category", async () => {
    const file = docx(
      heading("ROZPIS BOHOSLUŽEB V TÝDNU od 11. 10. 2026 do 18. 10. 2026") +
        week +
        p("") +
        p("V Kuřimi se zpovídá ve čtvrtek od 17.30 hod.") +
        p("") +
        p(
          "V pondělí je ",
          run("Adorační ", { bold: true }),
          run("den farnosti", { bold: true }),
          ". Hrají ",
          run("Dej nám akord", { italic: true }),
          " & spol.",
        ) +
        p("") +
        p("") +
        p(
          "Pouť: přihláška na poutnicimkk@seznam.cz, více na zacnikdejsi.cz a www.biskupstvi.cz/akce/pout. Sraz v 17.30.",
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
    expect((await docxWeeks(file))[0].draft().announcements).toEqual([
      { category: "smireni", html: "<p>V Kuřimi se zpovídá ve čtvrtek od 17.30 hod.</p>" },
      {
        category: "info",
        html: "<p>V pondělí je <strong>Adorační den farnosti</strong>. Hrají <em>Dej nám akord</em> &amp; spol.</p>",
      },
      {
        // Paragraphs without an empty one between them are one announcement.
        category: "pozvanka",
        html:
          '<p>Pouť: přihláška na <a href="mailto:poutnicimkk@seznam.cz">poutnicimkk@seznam.cz</a>, více na <a href="https://zacnikdejsi.cz">zacnikdejsi.cz</a> a <a href="https://www.biskupstvi.cz/akce/pout">www.biskupstvi.cz/akce/pout</a>. Sraz v 17.30.</p>' +
          '<p>Přihlášky na <a href="mailto:syrkova@zus.cz">syrkova@zus.cz</a> a <a href="https://www.farakurim.cz/">web</a>.</p>',
      },
    ]);
  });

  it("marks bold feasts as solemnities and guesses the flags of other services", async () => {
    const file = docx(
      heading("ROZPIS BOHOSLUŽEB V TÝDNU od 22. 3. 2026 do 29. 3. 2026") +
        table([
          [["22. 3.", "Ne"], [run("5. NEDĚLE POSTNÍ", { bold: true })], ["Kuřim"], ["9:30"], ["Mše sv.– za Lukáše"]],
          [["24. 3.", "Út"], ["vigilie slavnosti Zvěstování Páně"], ["Kuřim"], ["18:00"], ["Mše sv."]],
          [["25. 3.", "St"], ["slavnost Zvěstování Páně"], ["Kuřim"], ["18:00"], ["Mše sv."]],
          [["28. 3.", "So"], [run("sv. Václav", { bold: true })], ["Kuřim"], ["12:00"], ["Svatební obřad"]],
          [
            ["29. 3.", "Ne"],
            [],
            ["Kuřim"],
            ["14:00", "16:00", "19:00"],
            ["Zpovídání", "Křížová cesta", "Modlitební večer s Komunitou Emmanuel"],
          ],
        ]),
    );
    const { days } = (await docxWeeks(file))[0].draft();
    expect(days[0].rows[0]).toMatchObject({ title: "Mše sv.", detail: "za Lukáše", mass: true });
    expect(days.map((d) => d.solemnity)).toEqual([true, false, false, true, false, false, true, true]);
    expect(days[6].rows.map((r) => r.service)).toEqual([undefined]);
    expect(days[7].rows.map((r) => r.service)).toEqual([undefined, undefined, true]);
  });

  it("keeps the names in a feast in capitals and counts the Easter rites and novenas as services", async () => {
    const file = docx(
      heading("ROZPIS BOHOSLUŽEB V TÝDNU od 29. 3. 2026 do 5. 4. 2026") +
        table([
          [["29. 3.", "Ne"], ["SLAVNOST MATKY BOŽÍ PANNY MARIE"], ["Kuřim"], ["19:00"], ["Novéna k Duchu svatému"]],
          [["3. 4.", "Pá"], ["SVÁTEK SVATÉ RODINY"], ["Kuřim"], ["18:00"], ["Velkopáteční obřady"]],
          [["5. 4.", "Ne"], ["2. NEDĚLE PO NAROZENÍ PÁNĚ"], ["Kuřim"], ["8:00"], ["Mše sv."]],
        ]),
    );
    const { days } = (await docxWeeks(file))[0].draft();
    expect(days.map((d) => d.feast).filter(Boolean)).toEqual([
      "Slavnost Matky Boží Panny Marie",
      "Svátek Svaté rodiny",
      "2. neděle po Narození Páně",
    ]);
    expect([days[0].rows[0].service, days[5].rows[0].service]).toEqual([true, true]);
  });

  it("refuses a table it cannot read, naming the week and the day", async () => {
    const draft = async (rows: string[][][]) =>
      (await docxWeeks(docx(heading("ROZPIS BOHOSLUŽEB V TÝDNU od 11. 10. 2026 do 18. 10. 2026") + table(rows))))[0]
        .draft;
    expect(await draft([[["11. 10.", "Ne"], [], ["Kuřim"], ["8:00", "9:30"], ["Mše sv."]]])).toThrow(
      "the week 2026-10-11 – 2026-10-18, 2026-10-11: the times (8:00, 9:30) do not pair with the 1 services",
    );
    expect(await draft([[["16. 5.", "Út"], [], ["Kuřim"], ["8:00"], ["Mše sv."]]])).toThrow(
      'the day "16. 5. Út" is not in the week',
    );
    expect(await draft([[["12. 10.", "Út"], [], ["Kuřim"], ["8:00"], ["Mše sv."]]])).toThrow(
      '12. 10. is marked "Út", but 2026-10-12 is "Po"',
    );
    expect(await draft([[["12. 10.", "Po"], ["Kuřim"], ["8:00"], ["Mše sv."]]])).toThrow("a table row with 4 cells");
    expect(await draft([[["12. 10.", "Po"], [], ["Kuřim"], ["8:00"], ["Mše sv."]]])).toThrow(
      "the table runs from 2026-10-12 to 2026-10-12, so the heading looks wrong",
    );
  });

  it("adds the days a two-week table leaves out, without services", async () => {
    const file = docx(
      heading("ROZPIS BOHOSLUŽEB V TÝDNU od 19. 7. 2026 do 2. 8. 2026") +
        table([
          [["19. 7.", "Ne"], [], ["Kuřim"], ["8:00"], ["Mše sv."]],
          [["2. 8.", "Ne"], [], ["Kuřim"], ["8:00"], ["Mše sv."]],
        ]),
    );
    const { days } = (await docxWeeks(file))[0].draft();
    expect(days).toHaveLength(15);
    expect(days[1]).toEqual({ date: "2026-07-20", solemnity: false, rows: [] });
    expect(days[7]).toEqual({ date: "2026-07-26", solemnity: true, rows: [] });
    expect(days[14].rows).toHaveLength(1);
  });

  it("refuses a file that is not a DOCX", async () => {
    const file = join(dir, "porad.docx");
    writeFileSync(file, "%PDF");
    await expect(docxWeeks(file)).rejects.toThrow("is not a Word document (.docx)");
    await expect(docxWeeks(join(dir, "chybi.docx"))).rejects.toThrow("ENOENT");
  });
});
