import { describe, expect, it } from "vitest";
import * as z from "zod";
import { NEWS_EVENT_FIELDS, newsEventSchema } from "./schema";

const event = {
  id: "hody-ceska",
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
        time: "18:00–20:30",
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

  it("requires the main fields and an ASCII id", () => {
    expect(problems({ title: " " })).toHaveLength(1);
    expect(problems({ text: undefined })).toHaveLength(1);
    expect(problems({ id: "Hody České" })).toEqual(["id: must be ASCII kebab-case"]);
  });

  it("checks the dates", () => {
    expect(problems({ start: "2026-02-30" })).toHaveLength(1);
    expect(problems({ published: "7. 10. 2026" })).toHaveLength(1);
    expect(problems({ end: "2026-10-02" })).toEqual(["end: must be after start (omit it for one day)"]);
  });

  it("checks a series' meetings against start and end", () => {
    const series = { start: "2026-10-11", end: "2026-10-25" };
    expect(
      problems({ ...series, sessions: ["2026-10-11", { date: "2026-10-18", time: "9:00" }, "2026-10-25"] }),
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
      "end: must be the last meeting's last day",
      "sessions.2: must follow the previous meeting",
    ]);
    expect(
      problems({ ...series, sessions: ["2026-10-11", { date: "2026-10-24", end: "2026-10-25", time: "18.00" }] }),
    ).toEqual(['sessions.1.time: must be "H:MM" or "H:MM–H:MM"']);
  });

  it("checks the tags", () => {
    expect(problems({ tags: [{ label: "Zrušeno", color: "orange" }, { label: "Pro rodiny" }] })).toEqual([]);
    expect(problems({ tags: [{ label: "Zrušeno", color: "red" }] })).toHaveLength(1);
  });

  it("only accepts times the calendar files can read", () => {
    expect(problems({ time: "9:30" })).toEqual([]);
    expect(problems({ time: "18.00" })).toEqual(['time: must be "H:MM" or "H:MM–H:MM"']);
    expect(problems({ time: "20:00–18:00" })).toEqual(['time: must be "H:MM" or "H:MM–H:MM"']);
    expect(problems({ time: "25:00" })).toEqual(['time: must be "H:MM" or "H:MM–H:MM"']);
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
});

describe("NEWS_EVENT_FIELDS", () => {
  it("lists the fields in the month files' order", () => {
    expect(NEWS_EVENT_FIELDS.slice(0, 4)).toEqual(["id", "slug", "title", "start"]);
    expect(NEWS_EVENT_FIELDS.indexOf("published")).toBeLessThan(NEWS_EVENT_FIELDS.indexOf("poster"));
  });
});
