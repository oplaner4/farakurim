import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newsEvent } from "@/test/fixtures";
import { ROOT } from "./content-files";
import { pinLines, unpinnedLines } from "./news/pin-event";
import { replaceLines } from "./news/replace-event";
import { correctedHint } from "./stage/core";

// The parish skills quote lines the scripts print and decide from them (a correction instead of a new sheet, stop when
// nothing is to pin). A quote is the line with "…" or a <placeholder> where the line varies; it holds while some line
// a script prints, or a line of its source, has the quote's fixed parts in order.

/** The text of a skill file, its line breaks and indents as single spaces (the quotes wrap). */
const skillText = (file: string) => readFileSync(join(ROOT, ".claude/skills", file), "utf8").replace(/\s+/g, " ");

/** The lines of a scripts/lib module. */
const sourceLines = (file: string) => readFileSync(join(ROOT, "scripts/lib", file), "utf8").split("\n");

/** Whether `line` holds the fixed parts of `quote` in order. */
function matches(quote: string, line: string) {
  let from = 0;
  for (const part of quote.split(/…|<[^>]+>/).filter(Boolean)) {
    const at = line.indexOf(part, from);
    if (at === -1) return false;
    from = at + part.length;
  }
  return true;
}

const SHEET = "parish-create-service-sheet/SKILL.md";
const UNATTENDED = "parish-create-service-sheet/unattended.md";
const event = newsEvent({ id: "hody-2026" });
const other = newsEvent({ id: "pout-2026", title: "Pouť" });

const quotes: { quote: string; skills: string[]; lines: () => string[] }[] = [
  {
    quote: "this week is already published",
    skills: [SHEET, UNATTENDED],
    lines: () =>
      sourceLines("stage/sheet.ts").some((l) => l.includes('correctedHint("this week")'))
        ? [correctedHint("this week")]
        : [],
  },
  {
    quote: "The sheet … is already staged, not released yet",
    skills: [SHEET, UNATTENDED],
    lines: () => sourceLines("stage/sheet.ts"),
  },
  { quote: "Not the DOCX's newest week: …", skills: [UNATTENDED], lines: () => sourceLines("stage/sheet.ts") },
  { quote: "(tell the user)", skills: [SHEET, UNATTENDED], lines: () => sourceLines("stage/sheet.ts") },
  { quote: "Days without services", skills: [SHEET, UNATTENDED], lines: () => sourceLines("stage/sheet.ts") },
  {
    quote: "Would pin <id> (<title>)",
    skills: ["parish-pin-event/SKILL.md"],
    lines: () => pinLines({ pinned: event, unpinned: [other] }, true),
  },
  {
    quote: "Would unpin …",
    skills: ["parish-pin-event/SKILL.md", "parish-create-event/SKILL.md"],
    lines: () => unpinnedLines([other], true),
  },
  {
    quote: "<id> (<title>) is already the only pinned event",
    skills: ["parish-pin-event/SKILL.md"],
    lines: () => pinLines({ pinned: event, unpinned: [], alreadyPinned: true }, true),
  },
  {
    quote: "Changed: …",
    skills: ["parish-correct-event/SKILL.md", "parish-cancel-event/SKILL.md"],
    lines: () => replaceLines({ record: event, changed: ["start"] }, true),
  },
  { quote: "ask:", skills: ["parish-release/SKILL.md"], lines: () => sourceLines("calendar/lines.ts") },
];

describe("the script lines the skills quote", () => {
  it.each(quotes.flatMap(({ quote, skills, lines }) => skills.map((skill) => ({ quote, skill, lines }))))(
    '"$quote" in $skill',
    ({ quote, skill, lines }) => {
      expect(skillText(skill)).toContain(quote);
      expect(lines().some((line) => matches(quote, line))).toBe(true);
    },
  );
});
