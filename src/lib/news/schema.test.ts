import { describe, expect, it } from "vitest";
import * as z from "zod";
import { newsEventSchema } from "./schema";

const event = {
  id: "hody-ceska-2026",
  title: "Hody v České",
  start: "2026-10-02",
  place: "Česká",
  text: "Srdečně zveme na tradiční hody.",
};

/** The problems the schema finds, one "<path>: <message>" each. */
const problems = (fields: Record<string, unknown>) => {
  const result = newsEventSchema.safeParse({ ...event, ...fields });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
};

describe("newsEventSchema", () => {
  it("accepts a complete record", () => {
    expect(
      problems({
        end: "2026-10-04",
        startTime: "18:00",
        endTime: "20:30",
        program: [{ time: "18:00", title: "Stavění máje", note: "u obecního úřadu" }],
        published: "2026-09-21",
        poster: { src: "/uploads/aktuality/hody-ceska-plakat.webp", alt: "Plakát: Hody v České" },
        attachments: [{ label: "Plakát", file: "/uploads/aktuality/hody-ceska-plakat.png", size: 1240000 }],
        links: [{ label: "obec@ceska.cz", href: "mailto:obec@ceska.cz" }],
        longTerm: { weeklyAt: "9:30" },
      }),
    ).toEqual([]);
  });

  it("rejects unknown fields, also nested ones", () => {
    expect(problems({ tittle: "x" })).toEqual([': Unrecognized key: "tittle"']);
    expect(problems({ poster: { src: "/uploads/aktuality/x.webp", alt: "x", width: 600 } })).toEqual([
      'poster: Unrecognized key: "width"',
    ]);
  });

  it("requires the main fields and an ASCII id with the start year", () => {
    expect(problems({ title: " " })).toHaveLength(1);
    expect(problems({ text: undefined })).toHaveLength(1);
    expect(problems({ id: "Hody-Ceska-2026" })).toEqual(["id: must be ASCII kebab-case"]);
    expect(problems({ id: "hody-ceska" })).toEqual(["id: must contain the start year (2026)"]);
    expect(problems({ id: "hody-ceska-2025" })).toEqual(["id: must contain the start year (2026)"]);
    expect(problems({ id: "kurz-2026-10-02" })).toEqual([]);
  });

  it("checks the dates", () => {
    expect(problems({ start: "2026-02-30" })).toHaveLength(1);
    expect(problems({ published: "7. 10. 2026" })).toHaveLength(1);
    expect(problems({ end: "2026-10-02" })).toEqual(["end: must be after start (omit it for one day)"]);
  });

  it("checks a series' meetings against start and end", () => {
    const series = { start: "2026-10-11", end: "2026-10-25" };
    expect(
      problems({ ...series, sessions: ["2026-10-11", { date: "2026-10-18", startTime: "9:00" }, "2026-10-25"] }),
    ).toEqual([]);
    expect(problems({ ...series, sessions: ["2026-10-11"] })).toContain("sessions: a series has at least two meetings");
    expect(problems({ ...series, sessions: ["2026-10-12", "2026-10-25"] })).toEqual([
      "sessions.0: the first meeting must be on start",
    ]);
    expect(problems({ ...series, sessions: ["2026-10-11", "2026-10-18"] })).toEqual([
      "end: must be the last meeting's last day",
    ]);
    expect(problems({ start: "2026-10-11", sessions: ["2026-10-11", "2026-10-18"] })).toEqual([
      "end: must be the last meeting's last day",
    ]);
    expect(problems({ ...series, sessions: ["2026-10-11", "2026-10-25", "2026-10-18"] })).toEqual([
      "sessions.2: must follow the previous meeting",
      "end: must be the last meeting's last day",
    ]);
    const meeting = (times: object) => ["2026-10-11", { date: "2026-10-24", end: "2026-10-25", ...times }];
    expect(problems({ ...series, sessions: meeting({ startTime: "18.00" }) })).toEqual([
      "sessions.1.startTime: must be H:MM",
    ]);
    expect(problems({ ...series, sessions: meeting({ endTime: "20:00" }) })).toEqual([
      "sessions.1.endTime: needs startTime",
    ]);
  });

  it("needs attachment labels that differ in more than accents, case or punctuation", () => {
    const file = (label: string, name: string) => ({ label, file: `/uploads/aktuality/${name}` });
    expect(problems({ attachments: [file("Plakát", "a.pdf"), file("Program", "b.pdf")] })).toEqual([]);
    expect(
      problems({ attachments: [file("Plakát", "a.pdf"), file("Program", "b.pdf"), file("plakat", "c.png")] }),
    ).toEqual(['attachments.2.label: must differ from "Plakát" in more than accents, case or punctuation']);
    expect(problems({ attachments: [file("Mapka trasy", "a.png"), file("Mapka trasy", "b.png")] })).toHaveLength(1);
    expect(problems({ attachments: [file("Mapka trasy", "a.png"), file("Mapka-trasy!", "b.png")] })).toHaveLength(1);
  });

  it("checks the tags", () => {
    expect(problems({ tags: [{ label: "Zrušeno", color: "orange" }, { label: "Pro rodiny" }] })).toEqual([]);
    expect(problems({ tags: [{ label: "Zrušeno", color: "red" }] })).toHaveLength(1);
  });

  it("only accepts clock times, an end time after the start time", () => {
    expect(problems({ startTime: "9:30" })).toEqual([]);
    expect(problems({ startTime: "18:00", endTime: "20:30" })).toEqual([]);
    expect(problems({ startTime: "18.00" })).toEqual(["startTime: must be H:MM"]);
    expect(problems({ startTime: "25:00" })).toEqual(["startTime: must be H:MM"]);
    expect(problems({ time: "18:00–20:30" })).toEqual([': Unrecognized key: "time"']);
    expect(problems({ startTime: "20:00", endTime: "18:00" })).toEqual(["endTime: must be after startTime"]);
    expect(problems({ endTime: "20:00" })).toEqual(["endTime: needs startTime"]);
    expect(problems({ change: { status: "moved", previousStart: "2026-09-25", previousStartTime: "17:00" } })).toEqual(
      [],
    );
    expect(
      problems({
        change: { status: "moved", previousStart: "2026-09-25", previousStartTime: "17:00", previousEndTime: "9:00" },
      }),
    ).toEqual(["change.previousEndTime: must be after previousStartTime"]);
    expect(problems({ longTerm: { weeklyAt: "18.30" } })).toEqual(["longTerm.weeklyAt: must be H:MM"]);
  });

  it("links uploads root-relative and other sites over https", () => {
    expect(problems({ poster: { src: "https://farakurim.cz/uploads/aktuality/x.webp", alt: "x" } })).toEqual([
      "poster.src: must be a /uploads/… file",
    ]);
    expect(problems({ links: [{ label: "Web", href: "http://example.cz" }] })).toEqual([
      "links.0.href: must be https: or mailto:",
    ]);
  });

  it("names every problem with its field", () => {
    const result = newsEventSchema.safeParse({ ...event, start: "x", tittle: "y" });
    expect(z.prettifyError(result.error!)).toContain("→ at start");
  });

  it("checks a postponed event's first date and a series' dropped meetings", () => {
    expect(problems({ change: { status: "cancelled", announced: "2026-09-30", note: "Ruší se." } })).toEqual([]);
    expect(problems({ change: { status: "moved" } })).toHaveLength(1);
    expect(problems({ change: { status: "moved", previousStart: "2026-10-02" } })).toEqual([
      "change.previousStart: must differ from start (the new date)",
    ]);
    const series = { end: "2026-10-09", sessions: ["2026-10-02", "2026-10-09"] };
    expect(problems({ ...series, cancelledMeetings: { dates: ["2026-10-09"] } })).toEqual([]);
    expect(problems({ ...series, cancelledMeetings: { dates: ["2026-10-05"] } })).toEqual([
      "cancelledMeetings.dates.0: must be a meeting's date",
    ]);
    expect(
      problems({ ...series, change: { status: "cancelled" }, cancelledMeetings: { dates: ["2026-10-09"] } }),
    ).toEqual(["cancelledMeetings: a cancelled event drops every meeting"]);
  });
});
