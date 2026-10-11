// Reads the parish's pořad bohoslužeb DOCX ("Pořad bohoslužeb 2026.docx"), which holds every week of the year, the
// newest first: each week is a heading ("ROZPIS BOHOSLUŽEB V TÝDNU od … do …"), its table (date and weekday, feast,
// place, times, services; a day's later places in merged rows) and the announcements below it. A week's draft is a
// sheet record (days and announcements) to check with the user: the mass and service flags, the feast's case and the
// announcement categories are guesses.

import { readFileSync } from "node:fs";
import { DOMParser, type Element, type Node } from "@xmldom/xmldom";
import { escapeAttribute, escapeUTF8 } from "entities";
import { strFromU8, unzipSync } from "fflate";
import { places } from "@/content/masses";
import type { Announcement, AnnouncementCategory, SheetDay, SheetRow } from "@/content/types/services";
import type { IsoDate } from "@/content/types/shared";
import { clockMinutes } from "@/lib/shared/clock";
import { WEEKDAY_SHORT } from "@/lib/shared/czech";
import { pragueWeekday } from "@/lib/shared/prague";
import { period, periodDates } from "@/lib/services/service-sheet";
import { weekHeading } from "./porad-week";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const DOCUMENT = "word/document.xml";
const RELS = "word/_rels/document.xml.rels";

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

/** A run of text with its formatting. */
interface Segment {
  text: string;
  bold: boolean;
  italic: boolean;
  href?: string;
}

const elements = (node: Node): Element[] =>
  Array.from({ length: node.childNodes.length }, (_, i) => node.childNodes.item(i)).filter(
    (child): child is Element => child?.nodeType === 1 && (child as Element).namespaceURI === W,
  );
const children = (node: Node, name: string) => elements(node).filter((el) => el.localName === name);
const child = (node: Node, name: string): Element | undefined => children(node, name)[0];

/** Whether the toggle `name` (w:b, w:i) is on in the run properties: present, and not w:val="0" or "false". */
function toggle(rPr: Element | undefined, name: string) {
  const el = rPr && child(rPr, name);
  return !!el && !["0", "false", "off"].includes(el.getAttributeNS(W, "val") ?? "");
}

/** The text of a run: its w:t, with tabs and line breaks as spaces (a page break as nothing). */
function runText(run: Element) {
  return elements(run)
    .map((el) => {
      if (el.localName === "t") return el.textContent ?? "";
      if (el.localName === "tab" || el.localName === "cr") return " ";
      if (el.localName === "br") return el.getAttributeNS(W, "type") === "page" ? "" : " ";
      if (el.localName === "noBreakHyphen") return "-";
      return "";
    })
    .join("");
}

/** The runs of the paragraph `p` in order, with the target of the link each sits in (from `links`). */
function segments(p: Element, links: Map<string, string>): Segment[] {
  const runs = p.getElementsByTagNameNS(W, "r");
  return Array.from({ length: runs.length }, (_, i) => runs.item(i)!).map((run) => {
    const rPr = child(run, "rPr");
    let href: string | undefined;
    for (let node = run.parentNode; node && node !== p; node = node.parentNode) {
      const el = node as Element;
      if (el.localName === "hyperlink") href = links.get(el.getAttributeNS(R, "id") ?? "");
    }
    return { text: runText(run), bold: toggle(rPr, "b"), italic: toggle(rPr, "i"), href };
  });
}

/** Whitespace (no-break spaces included) collapsed to one space, trimmed. */
const clean = (text: string) => text.replace(/\s+/g, " ").trim();

const paragraphText = (p: Element) =>
  clean(
    segments(p, new Map())
      .map((s) => s.text)
      .join(""),
  );

/** The paragraphs of a table cell as text, without the empty ones. */
const cellLines = (tc: Element) => children(tc, "p").map(paragraphText).filter(Boolean);

/** A link's href: an e-mail address as mailto:. */
const linkHref = (href: string) => (/^[^\s@/:]+@[^\s@/]+\.\w+$/.test(href) ? `mailto:${href}` : href);

/** The paragraph's segments as HTML: bold as <strong>, italics as <em>, links as <a>, in a <p>. */
function paragraphHtml(segs: Segment[]) {
  const merged: Segment[] = [];
  for (const seg of segs) {
    const text = seg.text.replace(/\s+/g, " ");
    const last = merged.at(-1);
    // Spaces between two runs join the run before, so "Adorační den" in two bold runs stays one <strong>.
    const same = last && last.bold === seg.bold && last.italic === seg.italic && last.href === seg.href;
    if (last && (same || text.trim() === "")) last.text += text;
    else if (text) merged.push({ ...seg, text });
  }
  const html = merged
    .map(({ text, bold, italic, href }) => {
      const [, before, inner, after] = /^(\s*)(.*?)(\s*)$/.exec(text)!;
      let out = escapeUTF8(inner);
      if (inner && italic) out = `<em>${out}</em>`;
      if (inner && bold) out = `<strong>${out}</strong>`;
      if (inner && href) out = `<a href="${escapeAttribute(linkHref(href))}">${out}</a>`;
      return `${before}${out}${after}`;
    })
    .join("");
  return `<p>${html.replace(/ {2,}/g, " ").trim()}</p>`;
}

/** A first guess at an announcement's category from its words; `info` when nothing fits. */
const CATEGORY_HINTS: [AnnouncementCategory, RegExp][] = [
  ["smireni", /zpovídá|zpověď|svátost smíření/i],
  ["zmena", /nebude|zrušen|přesouvá|přeložen|místo obvykl/i],
  ["podekovani", /děkuj|poděkování/i],
  ["pozvanka", /zve(me)?\b|pozvání|srdečně|přihlá|pouť|koncert/i],
];
const guessCategory = (text: string) => CATEGORY_HINTS.find(([, hint]) => hint.test(text))?.[0] ?? "info";

/** "1. NEDĚLE ADVENTNÍ" in sentence case ("1. neděle adventní"); a feast not in capitals stays as it is. */
function feastCase(feast: string) {
  if (feast !== feast.toLocaleUpperCase("cs") || !/\p{Lu}/u.test(feast)) return feast;
  const lower = feast.toLocaleLowerCase("cs");
  return lower.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("cs"));
}

/** The parish church named `name` ("Kuřim" → "kurim"), else the name itself (a place elsewhere, "Tišnov"). */
const placeId = (name: string) => Object.entries(places).find(([, place]) => place.name === name)?.[0] ?? name;
const isParishChurch = (place: string) => place in places;

/** A service row: "Mše sv. – za …" split into title and detail, with the guessed mass and service flags. */
function sheetRow(time: string, place: string, line: string): SheetRow {
  const dash = /\s+[–—-]\s+/.exec(line);
  const title = dash ? line.slice(0, dash.index) : line;
  const detail = dash ? line.slice(dash.index + dash[0].length) : undefined;
  const mass = isParishChurch(place) && /^mše sv/i.test(title);
  // A mass-like public service in a parish church counts for the countdown; personal events never do.
  const service = isParishChurch(place) && !mass && !/^(pohřeb|křest|svatb|oddavky)/i.test(title);
  return {
    time: time.replace(".", ":").replace(/^0(\d)/, "$1"),
    place,
    title,
    ...(detail && { detail }),
    ...(mass && { mass }),
    ...(service && { service }),
  };
}

/** The day a table row starts from its date and feast cells ("11. 10.", "Ne"; "28. NEDĚLE V MEZIDOBÍ"). */
function tableDay(dateCell: string[], feastCell: string[], dates: IsoDate[], where: string): SheetDay {
  const m = /^(\d{1,2})\.? ?(\d{1,2})\.?$/.exec(dateCell[0]);
  const date = m && dates.find((d) => Number(d.slice(8)) === Number(m[1]) && Number(d.slice(5, 7)) === Number(m[2]));
  if (!date) throw new Error(`${where}: the day "${dateCell.join(" ")}" is not in the week`);
  const weekday = WEEKDAY_SHORT[pragueWeekday(date)];
  if (dateCell[1] && dateCell[1].toLocaleLowerCase("cs") !== weekday.toLocaleLowerCase("cs")) {
    throw new Error(`${where}: ${dateCell[0]} is marked "${dateCell[1]}", but ${date} is "${weekday}"`);
  }
  const feast = feastCell.join(" ");
  return {
    date,
    ...(feast && { feast: feastCase(feast) }),
    solemnity: pragueWeekday(date) === 0 || feastCase(feast) !== feast || /slavnost/i.test(feast),
    rows: [],
  };
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

/** The days of the week's table: one per table row, or more rows of one day in merged cells. */
function tableDays(table: Element, week: { validFrom: IsoDate; validTo: IsoDate }): SheetDay[] {
  const where = `the week ${period(week)}`;
  const dates = periodDates(week.validFrom, week.validTo);
  const days: SheetDay[] = [];
  for (const tr of children(table, "tr")) {
    const cells = children(tr, "tc");
    if (cells.length !== 5) throw new Error(`${where}: a table row with ${cells.length} cells, expected 5`);
    const [dateCell, feastCell, placeCell, timeCell, serviceCell] = cells.map(cellLines);
    if (dateCell.length > 0) days.push(tableDay(dateCell, feastCell, dates, where));
    const day = days.at(-1);
    if (!day) throw new Error(`${where}: the table starts without a date`);
    day.rows.push(...tableRows(placeCell, timeCell, serviceCell, `${where}, ${day.date}`));
  }
  for (const day of days) day.rows.sort((a, b) => clockMinutes(a.time) - clockMinutes(b.time));
  return days;
}

/** The external links of the document by relationship id. */
function documentLinks(rels: string | undefined) {
  const links = new Map<string, string>();
  if (!rels) return links;
  const doc = parseXml(rels, RELS);
  const list = doc.getElementsByTagName("Relationship");
  for (let i = 0; i < list.length; i++) {
    const rel = list.item(i)!;
    if (rel.getAttribute("TargetMode") === "External")
      links.set(rel.getAttribute("Id") ?? "", rel.getAttribute("Target") ?? "");
  }
  return links;
}

function parseXml(xml: string, name: string) {
  return new DOMParser({
    onError: (level, message) => {
      if (level !== "warning") throw new Error(`${name} is not valid XML: ${message}`);
    },
  }).parseFromString(xml, "text/xml");
}

/** The weeks of the pořad bohoslužeb DOCX `file`, in the document's order. Throws for a file that is not a DOCX. */
export function docxWeeks(file: string): DocxWeek[] {
  let files;
  try {
    files = unzipSync(new Uint8Array(readFileSync(file)), { filter: (f) => f.name === DOCUMENT || f.name === RELS });
  } catch {
    throw new Error(`${file} is not a Word document (.docx)`);
  }
  if (!files[DOCUMENT]) throw new Error(`${file} is not a Word document (.docx)`);
  const links = documentLinks(files[RELS] && strFromU8(files[RELS]));
  const body = parseXml(strFromU8(files[DOCUMENT]), DOCUMENT).getElementsByTagNameNS(W, "body").item(0);
  if (!body) throw new Error(`${file} has no document body`);

  const weeks: { week: { validFrom: IsoDate; validTo: IsoDate }; table?: Element; notes: Element[] }[] = [];
  for (const el of elements(body)) {
    const current = weeks.at(-1);
    if (el.localName === "tbl") {
      if (current && !current.table) current.table = el;
      continue;
    }
    if (el.localName !== "p") continue;
    const text = paragraphText(el);
    const week = weekHeading(text);
    if (week) weeks.push({ week, notes: [] });
    else if (current?.table && text) current.notes.push(el);
  }
  return weeks.map(({ week, table, notes }) => ({
    ...week,
    draft: () => {
      if (!table) throw new Error(`the week ${period(week)} has no table`);
      return {
        days: tableDays(table, week),
        announcements: notes.map((p) => ({
          category: guessCategory(paragraphText(p)),
          html: paragraphHtml(segments(p, links)),
        })),
      };
    },
  }));
}
