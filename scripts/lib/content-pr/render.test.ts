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

/** What the content publishes: each week's lines by its start, the new venues and the events' titles by id. */
const published = (
  weeks: Record<string, string[]>,
  venues: string[] = [],
  titles: Record<string, string> = {},
): Published => ({
  week: ({ validFrom }) => weeks[validFrom] ?? [],
  eventTitle: (id) => titles[id],
  venues,
});

describe("renderReport", () => {
  it("renders the published weeks oldest first, a correction marked, then the weeks not published", () => {
    const md = renderReport(
      sheet([
        week("2026-11-02", "2026-11-08", { outcome: { kind: "refused", reason: "no PDF" } }),
        week("2026-10-26", "2026-11-01", { outcome: { kind: "corrected" } }),
        week("2026-10-19", "2026-10-25", { senderNote: ["Note one", "Note two"] }),
      ]),
      published({ "2026-10-26": ["Announcements:", "- info: Sbírka"] }),
    );
    expect(md).toBe(
      [
        "## 19.–25. 10. 2026",
        "",
        "### Sender's note",
        "- Note one",
        "- Note two",
        "",
        "## 26. 10.–1. 11. 2026 (correction)",
        "",
        "Announcements:",
        "- info: Sbírka",
        "",
        "## Not published",
        "- 2.–8. 11. 2026: refused: no PDF",
      ].join("\n"),
    );
  });

  it("renders a week across New Year as 28. 12. 2026–3. 1. 2027", () => {
    expect(renderReport(sheet([week("2026-12-28", "2027-01-03")]))).toBe("## 28. 12. 2026–3. 1. 2027");
  });

  it("renders a two-week period as 21. 12. 2026–3. 1. 2027", () => {
    expect(renderReport(sheet([week("2026-12-21", "2027-01-03")]))).toBe("## 21. 12. 2026–3. 1. 2027");
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

  it("renders events, the new venues, the events not published, report-level questions and dropped attachments", () => {
    const report: EventsReport = {
      kind: "events",
      events: [
        { title: "Zájezd", outcome: { kind: "correction", of: "zajezd-2026" }, questions: [] },
        { outcome: { kind: "created", id: "pout" }, origin: "From poster.pdf", questions: [] },
        {
          title: "Pouť do Lukova",
          outcome: { kind: "duplicate", of: "pout-do-lukova-2026", where: 12 },
          questions: [{ id: "q2", blocking: false, status: "open", where: "date", text: "Same day?" }],
        },
      ],
      questions: [{ id: "q1", blocking: true, status: "open", where: "Pouť", text: "Date?" }],
      droppedAttachments: ["a.pdf", "b.png"],
    };
    const venues = ["- New venue sal: Sál, Kuřim 1 — pin: https://mapy.cz/x", '- New alias "kostelík" for kostel'];
    expect(renderReport(report, published({}, venues, { pout: "Pouť" }))).toBe(
      [
        "## Pouť",
        "",
        "From poster.pdf",
        "",
        "## New venues and aliases",
        ...venues,
        "",
        "## Not published",
        "- Zájezd: refused: a correction of zajezd-2026; make it with parish-correct-event",
        "- Pouť do Lukova: refused: already in PR #12 as pout-do-lukova-2026",
        "  - **q2** (non-blocking, open) date: Same day?",
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
