import { describe, expect, it } from "vitest";
import { checkReport, outcomeLines, outcomeOf, parseMailReport, questionOf } from "./report";

const sheet = (blocking: string, ...weeks: string[]) =>
  [blocking, "commit: feat(content): publish the service sheet for 19.–25. 10. 2026", "", ...weeks].join("\n");

const week = (name: string, ...outcomes: string[]) =>
  [`## ${name}`, ...outcomes.map((o) => `Outcome: ${o}`), "", "### Questions", "- **q1** (note) x"].join("\n");

describe("outcomeOf", () => {
  it("reads an Outcome line with or without a list marker and bold", () => {
    expect(outcomeOf("Outcome: created")).toBe("created");
    expect(outcomeOf("- **Outcome:** corrected")).toBe("corrected");
    expect(outcomeOf("**Outcome: refused: before the current sheet**")).toBe("refused: before the current sheet");
    expect(outcomeOf("* Outcome:   created ")).toBe("created");
    expect(outcomeOf("The outcome: created")).toBeNull();
  });
});

describe("parseMailReport", () => {
  it("reads the header, the body and the items with their outcomes", () => {
    const report = parseMailReport("sheet", sheet("blocking: yes", week("19.–25. 10. 2026", "created")));
    expect(report).toEqual({
      blocking: true,
      commit: "feat(content): publish the service sheet for 19.–25. 10. 2026",
      body: "## 19.–25. 10. 2026\nOutcome: created\n\n### Questions\n- **q1** (note) x",
      items: [{ name: "19.–25. 10. 2026", outcomes: ["created"] }],
      questions: [{ id: "q1", blocking: false, resolved: false }],
    });
  });

  it("reads a header after blank lines or a byte order mark, and one without its commit line", () => {
    const report = parseMailReport("sheet", "﻿\n\nblocking: no\n\n## A\nOutcome: created");
    expect(report).toMatchObject({ blocking: false, body: "## A\nOutcome: created" });
    expect(report.commit).toBeUndefined();
  });

  it("leaves out a missing header and the events report's sections that are no event", () => {
    const text = "blocking: maybe\n\n## Pouť\nOutcome: created\n## Questions\nOutcome: created\n## Dropped attachments";
    const report = parseMailReport("events", text);
    expect(report.blocking).toBeUndefined();
    expect(report.commit).toBeUndefined();
    expect(report.items).toEqual([{ name: "Pouť", outcomes: ["created"] }]);
  });
});

describe("questionOf", () => {
  it("reads a question's id, kind and status", () => {
    expect(questionOf("- **q1** (blocking) Po 19. 10.: which time? — proposal: 8:00")).toEqual({
      id: "q1",
      blocking: true,
      resolved: false,
    });
    expect(questionOf("- **Q3** (blocking, resolved) x")).toEqual({ id: "q3", blocking: true, resolved: true });
    expect(questionOf("* **q2** (note, still open) x")).toEqual({ id: "q2", blocking: false, resolved: false });
    expect(questionOf("- q1 (blocking) x")).toBeNull();
  });
});

describe("outcomeLines", () => {
  const text = sheet("blocking: no", week("A", "created"), week("B", "refused: overlaps"), week("C", "corrected"));

  it("lists every item's outcome, or only the items not published", () => {
    expect(outcomeLines("sheet", text)).toEqual(["A: created", "B: refused: overlaps", "C: corrected"]);
    expect(outcomeLines("sheet", text, { failed: true })).toEqual(["B: refused: overlaps"]);
    expect(outcomeLines("sheet", "")).toEqual([]);
  });
});

describe("checkReport", () => {
  it("accepts a created or corrected week with a change, and a draft unless exactly `blocking: no`", () => {
    expect(checkReport("sheet", sheet("blocking: no", week("A", "created")), true)).toEqual({
      changed: true,
      draft: false,
      commit: "feat(content): publish the service sheet for 19.–25. 10. 2026",
      undeclared: [],
    });
    expect(checkReport("sheet", sheet("blocking: yes", week("A", "corrected")), true).draft).toBe(true);
  });

  it("makes a draft of a report with an open blocking question, whatever its first line says", () => {
    const withQuestion = (header: string, question: string) =>
      sheet(header, `## A\nOutcome: created\n\n### Questions\n${question}`);
    const open = withQuestion("blocking: no", "- **q2** (blocking, still open) x");
    expect(checkReport("sheet", open, true)).toMatchObject({ draft: true, undeclared: ["q2"] });
    const resolved = withQuestion("blocking: no", "- **q2** (blocking, resolved) x");
    expect(checkReport("sheet", resolved, true)).toMatchObject({ draft: false, undeclared: [] });
    const declared = withQuestion("blocking: yes", "- **q2** (blocking) x");
    expect(checkReport("sheet", declared, true)).toMatchObject({ draft: true, undeclared: [] });
  });

  it("accepts no change for a week corrected, refused or with a document error", () => {
    for (const outcome of ["corrected", "refused: before the current sheet", "document error: a date outside"]) {
      expect(checkReport("sheet", sheet("blocking: no", week("A", outcome)), false).changed).toBe(false);
    }
  });

  it("refuses a report without its first line", () => {
    expect(() => checkReport("sheet", "", false)).toThrow("lacks its first line");
    expect(() => checkReport("sheet", sheet("blocking: perhaps", week("A", "created")), true)).toThrow(
      "the sheet stays unread",
    );
  });

  it("refuses a week without exactly one known outcome, and a report without weeks", () => {
    const refused = "does not give each week exactly one Outcome line";
    expect(() => checkReport("sheet", sheet("blocking: no"), false)).toThrow(refused);
    expect(() => checkReport("sheet", sheet("blocking: no", week("A")), false)).toThrow(refused);
    expect(() => checkReport("sheet", sheet("blocking: no", week("A", "created", "created")), true)).toThrow(refused);
    expect(() => checkReport("sheet", sheet("blocking: no", week("A", "staged")), true)).toThrow(refused);
  });

  it("refuses a created week without a change, and a change without a week created or corrected", () => {
    expect(() => checkReport("sheet", sheet("blocking: no", week("A", "created")), false)).toThrow(
      "a week was created, but nothing changed",
    );
    expect(() => checkReport("sheet", sheet("blocking: no", week("A", "refused: overlaps")), true)).toThrow(
      "the change is not empty",
    );
  });

  it("answers an events report without an event and without a change, but not with one", () => {
    const empty = "blocking: no\ncommit: feat(content): add events\n\n## Dropped attachments\n- logo.png";
    expect(checkReport("events", empty, false)).toEqual({
      changed: false,
      draft: false,
      commit: "feat(content): add events",
      undeclared: [],
    });
    expect(() => checkReport("events", empty, true)).toThrow("each event exactly one Outcome line: the mail");
  });

  it("refuses a corrected event, which the events workflow never makes", () => {
    expect(() => checkReport("events", "blocking: no\n\n## Pouť\nOutcome: corrected", true)).toThrow(
      "exactly one Outcome line",
    );
  });
});
