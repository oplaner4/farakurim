import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parishCalendars } from "@/content/site";
import type { NewsEvent } from "@/content/types/news";
import type { GoogleEvent } from "@/lib/calendar/google-calendar";
import { checkCalendar, matchMeetings, meetingsOf, writeIcs } from "./aktualita-calendar";

const URL_OF = "https://farakurim.cz/aktuality/adoracni-den-2026/";

const aktualita = (fields: Partial<NewsEvent> = {}): NewsEvent => ({
  id: "adoracni-den-2026",
  title: "Adorační den kuřimské farnosti",
  start: "2026-10-12",
  time: "13:00–18:00",
  place: "Kuřim, kostel sv. Maří Magdalény",
  text: "Adorační den naší farnosti.",
  ...fields,
});

/** A timed Události event on `date`. */
const google = (id: string, date: string, summary: string, description?: string): GoogleEvent => ({
  id,
  summary,
  description,
  start: { dateTime: `${date}T13:00:00+02:00` },
  end: { dateTime: `${date}T18:00:00+02:00` },
});

describe("meetingsOf", () => {
  it("is each meeting of a series, the first day of a weekly one, else the event's span", () => {
    expect(meetingsOf(aktualita({ sessions: ["2026-10-11", { date: "2026-10-18", time: "19:00" }] }))).toEqual([
      { start: "2026-10-11", end: "2026-10-11", time: "13:00–18:00" },
      { start: "2026-10-18", end: "2026-10-18", time: "19:00" },
    ]);
    expect(meetingsOf(aktualita({ end: "2027-06-30", longTerm: { weeklyAt: "18:30" } }))).toEqual([
      { start: "2026-10-12", end: "2026-10-12", time: "18:30" },
    ]);
    expect(meetingsOf(aktualita({ end: "2026-10-14" }))).toEqual([
      { start: "2026-10-12", end: "2026-10-14", time: "13:00–18:00" },
    ]);
  });
});

describe("matchMeetings", () => {
  it("finds an event whose description links the page", () => {
    const linked = google("a", "2026-10-12", "Adorace", `Zveme.\n\n${URL_OF}`);
    expect(matchMeetings(aktualita(), [google("x", "2026-10-12", "Jiná akce"), linked])[0]).toMatchObject({
      status: "linked",
      found: { title: "Adorace", date: "2026-10-12" },
    });
  });

  it("names an event with the title but without the link, ignoring case and accents", () => {
    const match = matchMeetings(aktualita(), [google("a", "2026-10-12", "ADORACNI DEN")])[0];
    expect(match).toMatchObject({ status: "unlinked", found: { title: "ADORACNI DEN" } });
  });

  it("is missing without an event that day, and ignores cancelled ones", () => {
    const events = [
      google("a", "2026-10-13", "Adorační den", URL_OF),
      { ...google("b", "2026-10-12", "Adorační den", URL_OF), status: "cancelled" },
    ];
    expect(matchMeetings(aktualita(), events)[0].status).toBe("missing");
  });

  it("checks every meeting of a series", () => {
    const event = aktualita({
      id: "manzelske-vecery",
      title: "Manželské večery",
      sessions: ["2026-10-11", "2026-10-18", "2026-10-25"],
    });
    const statuses = matchMeetings(event, [
      google("a", "2026-10-11", "Manželské večery", "https://farakurim.cz/aktuality/manzelske-vecery/"),
      google("b", "2026-10-18", "Manželské večery"),
    ]).map((m) => m.status);
    expect(statuses).toEqual(["linked", "unlinked", "missing"]);
  });
});

describe("with a temp folder", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "aktualita-calendar-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  /** Answers the calendar request with `items`, recording the URL and options asked for. */
  const stubCalendar = (items: GoogleEvent[], status = 200) => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify({ items }), { status }));
    vi.stubGlobal("fetch", fetch);
    return fetch;
  };

  it("writes the .ics of the detail page", () => {
    const path = writeIcs(aktualita(), dir);
    expect(path).toBe(join(dir, "adoracni-den-2026.ics"));
    const ics = readFileSync(path, "utf8");
    expect(ics).toContain("SUMMARY:Adorační den kuřimské farnosti");
    // Long lines are folded with a CRLF and a space or tab.
    expect(ics.replace(/\r\n[ \t]/g, "")).toContain(`DESCRIPTION:Adorační den naší farnosti.\\n\\n${URL_OF}`);
  });

  it("asks only Události, with the site as referrer, and writes nothing when linked", async () => {
    const fetch = stubCalendar([google("a", "2026-10-12", "Adorace", URL_OF)]);
    expect(await checkCalendar(aktualita(), { apiKey: "KEY", outDir: dir })).toEqual([
      'Události: linked ("Adorace" on 2026-10-12): nothing to do.',
    ]);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain(encodeURIComponent(parishCalendars.events.googleId));
    expect(init?.headers).toEqual({ Referer: "https://farakurim.cz/" });
    expect(readdirSync(dir)).toEqual([]);
  });

  it("asks for the link when the event is there without it", async () => {
    stubCalendar([google("a", "2026-10-12", "Adorační den")]);
    expect(await checkCalendar(aktualita(), { apiKey: "KEY", outDir: dir })).toEqual([
      `Události, 2026-10-12: "Adorační den" has no link: add ${URL_OF} to its description.`,
      expect.stringMatching(/^This can be done before or after the release/),
    ]);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("writes the .ics when no meeting is in the calendar", async () => {
    stubCalendar([]);
    const lines = await checkCalendar(aktualita(), { apiKey: "KEY", outDir: dir });
    expect(lines[0]).toBe("Události: no event on 2026-10-12.");
    expect(lines[1]).toMatch(/^Wrote .*adoracni-den-2026\.ics: import it into "Události" .*, not into a personal/);
    expect(readdirSync(dir)).toEqual(["adoracni-den-2026.ics"]);
  });

  it("writes the .ics, saying why, without a key or when Google fails", async () => {
    expect((await checkCalendar(aktualita(), { outDir: dir }))[0]).toBe(
      "Události: not checked (no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local).",
    );
    stubCalendar([], 403);
    const lines = await checkCalendar(aktualita(), { apiKey: "KEY", outDir: dir });
    expect(lines[0]).toMatch(/^Události: not checked \(Google Calendar .*: HTTP 403\)\.$/);
    expect(lines[1]).toContain(`unless the event is there already; then add ${URL_OF} to its description.`);
    expect(readdirSync(dir)).toEqual(["adoracni-den-2026.ics"]);
  });
});
