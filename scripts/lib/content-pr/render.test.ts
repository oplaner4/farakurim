import { describe, expect, it } from "vitest";
import type { Published } from "./published";
import { renderReport } from "./render";
import type { EventsReport, SheetReport, WeekEntry } from "./report-schema";

const week = (validFrom: string, validTo: string, extra: Partial<WeekEntry> = {}): WeekEntry => ({
  validFrom,
  validTo,
  outcome: { kind: "created" },
  questions: [],
  ...extra,
});

const sheet = (weeks: WeekEntry[], questions: SheetReport["questions"] = []): SheetReport => ({
  kind: "sheet",
  weeks,
  questions,
});

/** What the content publishes: each week's lines by its start, and the new venues. */
const published = (weeks: Record<string, string[]>, venues: string[] = []): Published => ({
  week: ({ validFrom }) => weeks[validFrom] ?? [],
  venues,
});

describe("renderReport", () => {
  it("renders a sheet report oldest first, with what the content publishes of each week", () => {
    const md = renderReport(
      sheet([
        week("2026-10-26", "2026-11-01", { notOnTheNewest: "Not on the newest PDF" }),
        week("2026-10-19", "2026-10-25", {
          outcome: { kind: "refused", reason: "no PDF" },
          senderNote: ["Note one", "Note two"],
        }),
      ]),
      published({ "2026-10-26": ["Announcements:", "- info: Sbírka"] }),
    );
    expect(md).toBe(
      [
        "## 19.–25. 10. 2026",
        "Outcome: refused: no PDF",
        "",
        "### Sender's note",
        "- Note one",
        "- Note two",
        "",
        "## 26. 10.–1. 11. 2026",
        "Outcome: created",
        "Not on the newest PDF",
        "",
        "Announcements:",
        "- info: Sbírka",
      ].join("\n"),
    );
  });

  it("renders a week across New Year as 28. 12. 2026–3. 1. 2027", () => {
    expect(renderReport(sheet([week("2026-12-28", "2027-01-03")]))).toContain("## 28. 12. 2026–3. 1. 2027\n");
  });

  it("renders a two-week period as 21. 12. 2026–3. 1. 2027", () => {
    expect(renderReport(sheet([week("2026-12-21", "2027-01-03")]))).toContain("## 21. 12. 2026–3. 1. 2027\n");
  });

  it("keeps Czech prose with quotes, backslashes and line breaks as written", () => {
    const note = '„Mše" \\ v 8:00\nřádek 2';
    expect(renderReport(sheet([week("2026-10-19", "2026-10-25", { senderNote: [note] })]))).toContain(`\n- ${note}`);
  });

  it("renders questions with status, proposal and answer", () => {
    const md = renderReport(
      sheet(
        [
          week("2026-10-19", "2026-10-25", {
            questions: [
              { id: "q1", blocking: true, status: "open", where: "Sunday", text: "Which time?", proposal: "8:00" },
              { id: "q2", blocking: false, status: "resolved", where: "Monday", text: "Ok?", answer: "Yes" },
            ],
          }),
        ],
        [{ id: "q3", blocking: false, status: "open", where: "General", text: "Hm?" }],
      ),
    );
    expect(md).toContain(
      [
        "### Questions",
        "- **q1** (blocking, open) Sunday: Which time? — proposal: 8:00",
        "- **q2** (non-blocking, resolved) Monday: Ok? — answer: Yes",
        "",
        "## Questions",
        "- **q3** (non-blocking, open) General: Hm?",
      ].join("\n"),
    );
  });

  it("renders events, the new venues, report-level questions and dropped attachments", () => {
    const report: EventsReport = {
      kind: "events",
      events: [
        {
          title: "Pouť",
          outcome: { kind: "created", id: "pout" },
          origin: "From poster.pdf",
          questions: [],
        },
      ],
      questions: [{ id: "q1", blocking: true, status: "open", where: "Pouť", text: "Date?" }],
      droppedAttachments: ["a.pdf", "b.png"],
    };
    const venues = ["- New venue sal: Sál, Kuřim 1 — pin: https://mapy.cz/x", '- New alias "kostelík" for kostel'];
    expect(renderReport(report, published({}, venues))).toBe(
      [
        "## Pouť",
        "Outcome: created",
        "",
        "From poster.pdf",
        "",
        "## New venues and aliases",
        ...venues,
        "",
        "## Questions",
        "- **q1** (blocking, open) Pouť: Date?",
        "",
        "## Dropped attachments",
        "- a.pdf",
        "- b.png",
      ].join("\n"),
    );
  });
});
