// The words that mark an event mail as a correction of an event already on the site: a correction, a change, a move or
// a cancellation, as stems at the start of a word, matched without case or diacritics. A word found is a hint the
// agent must answer, never a decision: "oprava kostela" names the church repair a new event may support.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { parseOrThrow } from "@/lib/shared/parse";
import { readJsonRecord } from "../command";
import { pdfPageTexts } from "../images";
import { correctionWordsSchema, type CorrectionWord } from "./correction-words-schema";

/** Each kind's stems, without diacritics: "zrus" is zrušeno, zrušena, zruší. */
const STEMS: Record<CorrectionWord["kind"], string[]> = {
  // Not "opravdu" (really).
  correction: ["oprav(?!du)", "upresn", "aktualiz"],
  change: ["zmen", "meni", "nov[a-z]* (termin|cas)"],
  move: ["posun", "presun", "presouv", "odloz", "odklad"],
  cancellation: ["zrus", "rusi", "nekona", "odpada", "odpadnou"],
};

/** `text` in lower case, without diacritics and with its whitespace as single spaces. */
const plain = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ");

/** Phrases left out before matching: a poster's "změna programu vyhrazena" (subject to change) corrects nothing. */
const IGNORED = /zmen[a-z]* (programu |terminu )?vyhrazen[a-z]*/g;

const PATTERNS = Object.entries(STEMS).map(
  ([kind, stems]) => [kind as CorrectionWord["kind"], new RegExp(`(?<![a-z])(${stems.join("|")})`)] as const,
);

/** The kinds of correction word `text` holds, in the order of STEMS. */
export function correctionKindsIn(text: string): CorrectionWord["kind"][] {
  const words = plain(text).replace(IGNORED, "");
  return PATTERNS.filter(([, pattern]) => pattern.test(words)).map(([kind]) => kind);
}

/**
 * The text of an attachment: a PDF's pages; none for an image, or a PDF poppler cannot read, whose text only the agent
 * can read (a broken attachment must not stop the run).
 */
function attachmentText(file: string): string {
  if (extname(file).toLowerCase() !== ".pdf") return "";
  try {
    return pdfPageTexts(file).join("\n");
  } catch {
    return "";
  }
}

/**
 * The correction words of the event mail in `dir` (`subject.txt`, `body.txt` and `attachments/`, as `event-mail
 * fetch` writes it): each kind once per place, the subject first, then the text and the PDF attachments in order.
 */
export function mailCorrectionWords(dir: string): CorrectionWord[] {
  const attachments = join(dir, "attachments");
  const sources = [
    { where: "subject", text: readFileSync(join(dir, "subject.txt"), "utf8") },
    { where: "text", text: readFileSync(join(dir, "body.txt"), "utf8") },
    ...(existsSync(attachments) ? readdirSync(attachments).sort() : []).map((file, index) => ({
      where: `attachment ${index + 1}`,
      text: attachmentText(join(attachments, file)),
    })),
  ];
  return sources.flatMap(({ where, text }) => correctionKindsIn(text).map((kind) => ({ where, kind })));
}

/** The correction words in `file`; one that is not JSON or breaks the schema throws, naming it. */
export const readCorrectionWords = (file: string): CorrectionWord[] =>
  parseOrThrow(correctionWordsSchema, readJsonRecord(file), file);
