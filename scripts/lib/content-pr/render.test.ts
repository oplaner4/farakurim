import { describe, expect, it } from "vitest";
import { renderReport } from "./render";
import type { EventsReport, SheetReport, WeekEntry } from "./report-schema";

const week = (validFrom: string, validTo: string, extra: Partial<WeekEntry> = {}): WeekEntry => ({
  validFrom,
  validTo,
  outcome: { kind: "created" },
  summary: "Summary",
  questions: [],
  ...extra,
});

const sheet = (weeks: WeekEntry[], questions: SheetReport["questions"] = []): SheetReport => ({
  kind: "sheet",
  weeks,
  questions,
});

describe("renderReport", () => {
  it("renders a sheet report oldest first", () => {
    const md = renderReport(
      sheet([
        week("2026-10-26", "2026-11-01", { summary: "Second", notOnTheNewest: "Not on the newest PDF" }),
        week("2026-10-19", "2026-10-25", {
          outcome: { kind: "refused", reason: "no PDF" },
          summary: "First",
          senderNote: ["Note one", "Note two"],
        }),
      ]),
    );
    expect(md).toBe(
      [
        "## 19.–25. 10. 2026",
        "Outcome: refused: no PDF",
        "",
        "First",
        "",
        "### Sender's note",
        "- Note one",
        "- Note two",
        "",
        "## 26. 10.–1. 11. 2026",
        "Outcome: created",
        "Not on the newest PDF",
        "",
        "Second",
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
    const summary = '„Mše" \\ v 8:00\nřádek 2';
    expect(renderReport(sheet([week("2026-10-19", "2026-10-25", { summary })]))).toContain(`\n\n${summary}`);
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

  it("renders events with venues, report-level questions and dropped attachments", () => {
    const report: EventsReport = {
      kind: "events",
      events: [
        {
          title: "Pouť",
          outcome: { kind: "created", id: "pout" },
          origin: "From poster.pdf",
          venues: [
            { kind: "new", id: "sal", name: "Sál", address: "Kuřim 1", pin: "49.1,16.5" },
            { kind: "alias", id: "kostel", text: "kostelík" },
          ],
          questions: [],
        },
      ],
      questions: [{ id: "q1", blocking: true, status: "open", where: "Pouť", text: "Date?" }],
      droppedAttachments: ["a.pdf", "b.png"],
    };
    expect(renderReport(report)).toBe(
      [
        "## Pouť",
        "Outcome: created",
        "",
        "From poster.pdf",
        "New venue sal: Sál, Kuřim 1 — pin: 49.1,16.5",
        'New alias "kostelík" for kostel',
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
