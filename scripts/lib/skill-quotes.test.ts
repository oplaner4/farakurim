import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newsEvent } from "@/test/fixtures";
import { ROOT } from "./content-files";
import { pinLines, unpinnedLines } from "./news/pin-event";
import { replaceLines } from "./news/replace-event";
import { findLines } from "./venues/command";

// The parish skills act on the lines the scripts print: the tagged ones (tell:, ask:, next:, state:, scripts/lib/output.ts)
// and a few result lines. A quote is the line with "…" or a <placeholder> where the line varies; it holds while some
// line a script prints, or a line of its source, has the quote's fixed parts in order.

const SKILLS = join(ROOT, ".claude/skills");
const LIB = join(ROOT, "scripts/lib");

/** The parish skill files, relative to .claude/skills. */
const skillFiles = readdirSync(SKILLS, { recursive: true, encoding: "utf8" }).filter(
  (f) => f.startsWith("parish-") && f.endsWith(".md"),
);

/** The text of a skill file, its line breaks and indents as single spaces (the quotes wrap). */
const skillText = (file: string) => readFileSync(join(SKILLS, file), "utf8").replace(/\s+/g, " ");

/** The source of every scripts/lib module, tests left out. */
const source = readdirSync(LIB, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
  .map((f) => readFileSync(join(LIB, f), "utf8"))
  .join("\n");

/** The source lines with each tag call written as the line it prints: tell(`x`) → tell: x. */
const taggedSource = source.split("\n").map((l) => l.replace(/\b(tell|ask|next)\(\s*[`"']/g, "$1: "));

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

/** Each tagged quote (`tell: …`, `ask: …`, `next: …`, `state: …` in backticks) of each parish skill. */
const taggedQuotes = skillFiles.flatMap((skill) =>
  [...skillText(skill).matchAll(/`((?:tell|ask|next|state):[^`]*)`/g)].map((m) => ({ skill, quote: m[1].trim() })),
);

const event = newsEvent({ id: "hody-2026" });
const other = newsEvent({ id: "pout-2026", title: "Pouť" });

/** The untagged result lines the skills quote, with the lines that print them. */
const resultQuotes: { quote: string; skills: string[]; lines: () => string[] }[] = [
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
    quote: "Venues of <municipality>:",
    skills: ["parish-create-event/SKILL.md"],
    lines: () =>
      findLines(
        [
          {
            id: "kurim-fara",
            name: "Fara",
            address: { municipality: "Kuřim", country: "Česko" },
            position: { lat: 49, lon: 16 },
          },
        ],
        "Kuřim",
      ),
  },
  {
    quote: "Changed: …",
    skills: ["parish-correct-event/SKILL.md", "parish-cancel-event/SKILL.md"],
    lines: () => replaceLines({ record: event, changed: ["start"] }, true),
  },
];

describe("the script lines the skills quote", () => {
  it("finds the tagged quotes the skills act on", () => {
    const quoted = new Set(taggedQuotes.map(({ quote }) => quote.split(":")[0]));
    expect([...quoted].sort()).toEqual(["ask", "next", "state", "tell"]);
  });

  it.each(taggedQuotes)('"$quote" in $skill', ({ quote }) => {
    const value = /^state: (\w+)$/.exec(quote)?.[1];
    if (value) expect(source).toContain(`state("${value}")`);
    else expect(taggedSource.some((line) => matches(quote, line))).toBe(true);
  });

  it.each(resultQuotes.flatMap(({ quote, skills, lines }) => skills.map((skill) => ({ quote, skill, lines }))))(
    '"$quote" in $skill',
    ({ quote, skill, lines }) => {
      expect(skillText(skill)).toContain(quote);
      expect(lines().some((line) => matches(quote, line))).toBe(true);
    },
  );

  it("leaves no tag or advice clause inside a line", () => {
    expect(source).not.toMatch(/\(tell the user\)|: ask the user|[^`"]: ask: /);
  });
});
