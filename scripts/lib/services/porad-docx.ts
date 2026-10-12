// Reads the parish's pořad bohoslužeb DOCX ("Pořad bohoslužeb 2026.docx"), which holds every week of the year, the
// newest first: each week is a heading ("ROZPIS BOHOSLUŽEB V TÝDNU od … do …"), its table (date and weekday, feast,
// place, times, services; a day's later places in merged rows) and the announcements below it. The document is
// converted to HTML with mammoth and read with cheerio; plain e-mail and web addresses are linked with linkify. A
// week's draft is a sheet record (days and announcements) to check with the user: the mass and service flags, the
// feast's case and the announcement categories are guesses.

import * as cheerio from "cheerio";
import linkifyHtml from "linkify-html";
import mammoth from "mammoth";
import { places } from "@/content/masses";
import type { Announcement, SheetDay, SheetRow } from "@/content/types/services";
import type { IsoDate } from "@/content/types/shared";
import { clockMinutes } from "@/lib/shared/clock";
import { WEEKDAY_SHORT } from "@/lib/shared/czech";
import { pragueWeekday } from "@/lib/shared/prague";
import { period, periodDates } from "@/lib/services/service-sheet";
import { feastCase } from "./porad-feast";
import { guessCategory, serviceFlags } from "./porad-guess";
import { weekHeading } from "./porad-week";

/** A sheet record without its week: the days and announcements. */
export interface DraftRecord {
  days: SheetDay[];
  announcements: Announcement[];
}

/** One week of the DOCX; `draft()` reads its table and announcements (throwing for a table it cannot read). */
export interface DocxWeek {
  validFrom: IsoDate;
  validTo: IsoDate;
  draft: () => DraftRecord;
}

/** A table cell: its paragraphs as text (without the empty ones), whether all of it is bold, and its rowspan. */
interface Cell {
  lines: string[];
  bold: boolean;
  rowspan: number;
}

/** A block of the document body: a paragraph (its text and inner HTML) or a table. */
type Block = { kind: "p"; text: string; html: string } | { kind: "table"; rows: Cell[][] };

/** Whitespace (no-break spaces included) collapsed to one space, trimmed. */
const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** The blocks of the DOCX `file`, converted to HTML by mammoth; throws for a file that is not a DOCX. */
async function documentBlocks(file: string): Promise<Block[]> {
  let html: string;
  try {
    // Empty paragraphs kept: they separate the announcements.
    ({ value: html } = await mammoth.convertToHtml({ path: file }, { ignoreEmptyParagraphs: false }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw error;
    throw new Error(`${file} is not a Word document (.docx)`);
  }
  // Linked before cheerio reads it: linkify decodes &amp;, which cheerio encodes again.
  const $ = cheerio.load(linkifyHtml(html, { defaultProtocol: "https" }), null, false);
  return $.root()
    .children()
    .toArray()
    .map((el): Block => {
      if (el.tagName !== "table") return { kind: "p", text: clean($(el).text()), html: $(el).html() ?? "" };
      const rows = $(el).find("tr").toArray();
      return {
        kind: "table",
        rows: rows.map((tr) =>
          $(tr)
            .children("td, th")
            .toArray()
            .map((td) => {
              const cell = $(td);
              const lines = cell
                .children("p")
                .toArray()
                .map((p) => clean($(p).text()))
                .filter(Boolean);
              const bare = (text: string) => text.replace(/\s+/g, "");
              const bold = lines.length > 0 && bare(cell.find("strong").text()) === bare(cell.text());
              return { lines, bold, rowspan: Number(cell.attr("rowspan") ?? 1) };
            }),
        ),
      };
    });
}

/**
 * The paragraph's inner HTML as the announcement's <p>: spaces outside the <strong> and <em>, a link to a bare
 * e-mail address as mailto:, no link targets and no angle brackets around a link.
 */
function paragraphHtml(inner: string) {
  const html = inner
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/<(strong|em)>(\s+)/g, "$2<$1>")
    .replace(/(\s+)<\/(strong|em)>/g, "</$2>$1")
    .replace(/<(strong|em)><\/\1>/g, "")
    .replace(/href="([^":/]+@[^"]+)"/g, 'href="mailto:$1"')
    // Word's "open in a new window" (target="_blank"): the sheets' links carry no target.
    .replace(/ target="[^"]*"/g, "")
    // "<anna@seznam.cz>": the brackets only mark the address, which is now a link.
    .replace(/&lt;(<a [^>]*>[^<]*<\/a>)&gt;/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return `<p>${html}</p>`;
}

/** The parish church named `name` ("Kuřim" → "kurim"), else the name itself (a place elsewhere, "Tišnov"). */
const placeId = (name: string) => Object.entries(places).find(([, place]) => place.name === name)?.[0] ?? name;

/** A service row: "Mše sv. – za …" split into title and detail, with the guessed mass and service flags. */
function sheetRow(time: string, place: string, line: string): SheetRow {
  // "Mše sv. – za …", also without the space before the dash ("Mše sv.– za …").
  const dash = /\s*[–—]\s+|\s+-\s+/.exec(line);
  const title = dash ? line.slice(0, dash.index) : line;
  const detail = dash ? line.slice(dash.index + dash[0].length) : undefined;
  return {
    time: time.replace(".", ":").replace(/^0(\d)/, "$1"),
    place,
    title,
    ...(detail && { detail }),
    ...serviceFlags(title, line),
  };
}

/** The day a table row starts from its date cell ("11. 10.", "Ne"), without its feast yet. */
function tableDay(dateCell: string[], dates: IsoDate[], where: string): SheetDay {
  const m = /^(\d{1,2})\.? ?(\d{1,2})\.?$/.exec(dateCell[0]);
  const date = m && dates.find((d) => Number(d.slice(8)) === Number(m[1]) && Number(d.slice(5, 7)) === Number(m[2]));
  if (!date) throw new Error(`${where}: the day "${dateCell.join(" ")}" is not in the week`);
  const weekday = WEEKDAY_SHORT[pragueWeekday(date)];
  if (dateCell[1] && dateCell[1].toLocaleLowerCase("cs") !== weekday.toLocaleLowerCase("cs")) {
    throw new Error(`${where}: ${dateCell[0]} is marked "${dateCell[1]}", but ${date} is "${weekday}"`);
  }
  return { date, solemnity: pragueWeekday(date) === 0, rows: [] };
}

/**
 * Adds a feast cell's names to the day's feast ("28. NEDĚLE V MEZIDOBÍ"): the day's first row, or a later one for
 * another place that keeps its own feast cell ("SLAVNOST POSVĚCENÍ KOSTELA" in Kuřim, "28. NEDĚLE V MEZIDOBÍ" in
 * Moravské Knínice), its names after the day's and each name once.
 */
function addFeast(day: SheetDay, cell: Cell) {
  const names = new Set(day.feast?.split(" – "));
  for (const name of feastCase(cell.lines).split(" – ")) names.add(name);
  day.feast = [...names].join(" – ");
  // Bold in the document; "slavnost Zvěstování Páně" is not always.
  if (cell.bold || /^slavnost/i.test(cell.lines.join(" "))) day.solemnity = true;
}

/** The service rows of a table row: its times paired in order with its services, "–" in both for none. */
function tableRows(placeCell: string[], timeCell: string[], serviceCell: string[], where: string): SheetRow[] {
  const times = timeCell.filter((t) => !/^[–—-]$/.test(t));
  const lines = serviceCell.filter((s) => !/^[–—-]$/.test(s));
  if (times.length !== lines.length || times.some((t) => !/^\d{1,2}[:.]\d{2}$/.test(t))) {
    throw new Error(`${where}: the times (${times.join(", ")}) do not pair with the ${lines.length} services`);
  }
  const place = placeId(placeCell.join(" "));
  if (times.length > 0 && !place) throw new Error(`${where}: services without a place`);
  return times.map((time, i) => sheetRow(time, place, lines[i]));
}

/** The table's rows as its 5 columns, a cell merged from the row above as null. */
function tableGrid(rows: Cell[][], where: string): (Cell | null)[][] {
  const covered = [0, 0, 0, 0, 0];
  return rows.map((row) => {
    const cells = [...row];
    const grid = covered.map((rows, col) => {
      if (rows > 0) {
        covered[col]--;
        return null;
      }
      const cell = cells.shift();
      if (cell) covered[col] = cell.rowspan - 1;
      return cell;
    });
    if (cells.length > 0 || grid.includes(undefined)) {
      throw new Error(`${where}: a table row with ${row.length} cells, expected 5`);
    }
    return grid as (Cell | null)[];
  });
}

/**
 * The days of the week's table: one per table row, or more rows of one day in merged cells, and the days the table
 * leaves out without rows.
 */
function tableDays(rows: Cell[][], week: { validFrom: IsoDate; validTo: IsoDate }): SheetDay[] {
  const where = `the week ${period(week)}`;
  const dates = periodDates(week.validFrom, week.validTo);
  const days: SheetDay[] = [];
  for (const [dateCell, feastCell, placeCell, timeCell, serviceCell] of tableGrid(rows, where)) {
    if (dateCell && dateCell.lines.length > 0) {
      days.push(tableDay(dateCell.lines, dates, where));
    }
    const day = days.at(-1);
    if (!day) throw new Error(`${where}: the table starts without a date`);
    if (feastCell && feastCell.lines.length > 0) addFeast(day, feastCell);
    const lines = (cell: Cell | null) => cell?.lines ?? [];
    day.rows.push(...tableRows(lines(placeCell), lines(timeCell), lines(serviceCell), `${where}, ${day.date}`));
  }
  // A heading with a wrong date ("od 14. 6." over a table from 28. 6.) would publish the sheet over the wrong days.
  const [first, last] = [days[0]?.date, days.at(-1)?.date];
  if (first !== week.validFrom || last !== week.validTo) {
    throw new Error(`${where}: the table runs from ${first} to ${last}, so the heading looks wrong: ask the user`);
  }
  for (const day of days) day.rows.sort((a, b) => clockMinutes(a.time) - clockMinutes(b.time));
  // A two-week sheet leaves out the days without services; the sheet lists every day, those with no rows.
  return dates.map(
    (date) => days.find((d) => d.date === date) ?? { date, solemnity: pragueWeekday(date) === 0, rows: [] },
  );
}

/** A week's heading, its table and its announcements, each the paragraphs up to an empty one. */
interface BodyWeek {
  week: { validFrom: IsoDate; validTo: IsoDate };
  table?: Cell[][];
  notes: { text: string; html: string }[][];
}

/** The weeks of the document: each heading, the table after it and the paragraphs below the table. */
function bodyWeeks(blocks: Block[]): BodyWeek[] {
  const weeks: BodyWeek[] = [];
  for (const block of blocks) {
    const current = weeks.at(-1);
    if (block.kind === "table") {
      if (current && !current.table) current.table = block.rows;
      continue;
    }
    const week = weekHeading(block.text);
    // A list's lines follow each other; an empty paragraph ends an announcement.
    if (week) weeks.push({ week, notes: [[]] });
    else if (current?.table && block.text) current.notes.at(-1)!.push(block);
    else if (current?.table && current.notes.at(-1)!.length > 0) current.notes.push([]);
  }
  return weeks;
}

/** The weeks of the pořad bohoslužeb DOCX `file`, in the document's order. Throws for a file that is not a DOCX. */
export async function docxWeeks(file: string): Promise<DocxWeek[]> {
  return bodyWeeks(await documentBlocks(file)).map(({ week, table, notes }) => ({
    ...week,
    draft: () => {
      if (!table) throw new Error(`the week ${period(week)} has no table`);
      return {
        days: tableDays(table, week),
        announcements: notes
          .filter((paragraphs) => paragraphs.length > 0)
          .map((paragraphs) => ({
            category: guessCategory(paragraphs.map((p) => p.text).join(" ")),
            html: paragraphs.map((p) => paragraphHtml(p.html)).join(""),
          })),
      };
    },
  }));
}
