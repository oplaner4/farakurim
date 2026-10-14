import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parishCalendars } from "@/content/site";
import { events } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import type { GoogleEvent } from "@/lib/calendar/google-calendar";
import { checkCalendar, matchMeetings, parseCommand, writeIcs } from "./event-calendar";

const URL_OF = "https://farakurim.cz/aktuality/adoracni-den-2026/";

const testEvent = (fields: Partial<NewsEvent> = {}): NewsEvent => ({
  id: "adoracni-den-2026",
  title: "Adorační den kuřimské farnosti",
  start: "2026-10-12",
  startTime: "13:00",
  endTime: "18:00",
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

describe("matchMeetings", () => {
  it("finds an event whose description links the page", () => {
    const linked = google("a", "2026-10-12", "Adorace", `Zveme.\n\n${URL_OF}`);
    expect(matchMeetings(testEvent(), [google("x", "2026-10-12", "Jiná akce"), linked])[0]).toMatchObject({
      status: "linked",
      found: { title: "Adorace", date: "2026-10-12" },
    });
  });

  it("names an event with the title but without the link, ignoring case and accents", () => {
    const match = matchMeetings(testEvent(), [google("a", "2026-10-12", "ADORACNI DEN")])[0];
    expect(match).toMatchObject({ status: "unlinked", found: { title: "ADORACNI DEN" } });
  });

  it("is missing without an event that day, and ignores cancelled ones", () => {
    const events = [
      google("a", "2026-10-13", "Adorační den", URL_OF),
      { ...google("b", "2026-10-12", "Adorační den", URL_OF), status: "cancelled" },
    ];
    expect(matchMeetings(testEvent(), events)[0].status).toBe("missing");
  });

  it('reads the "Zrušeno: " prefix, and finds a prefixed event by its title', () => {
    const match = matchMeetings(testEvent(), [google("a", "2026-10-12", "Zrušeno: Adorační den")])[0];
    expect(match).toMatchObject({ status: "unlinked", found: { title: "Zrušeno: Adorační den", cancelled: true } });
  });

  it("checks every meeting of a series", () => {
    const event = testEvent({
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

describe("parseCommand", () => {
  const USAGE = "Usage: pnpm event-calendar <id> [--out <dir>]";

  it("finds the event of the id, with --out", async () => {
    const { id } = events[0];
    expect(await parseCommand([id])).toEqual({ event: events[0], out: undefined });
    expect(await parseCommand([id, "--out", "C:/tmp"])).toEqual({ event: events[0], out: "C:/tmp" });
  });

  it("shows the usage without exactly one id, and refuses an unknown one", async () => {
    await expect(parseCommand([])).rejects.toThrow(USAGE);
    await expect(parseCommand(["a", "b"])).rejects.toThrow(USAGE);
    await expect(parseCommand(["neni-takova-akce"])).rejects.toThrow("no event with the id neni-takova-akce");
  });
});

describe("with a temp folder", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "event-calendar-"));
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
    const path = writeIcs(testEvent(), dir);
    expect(path).toBe(join(dir, "adoracni-den-2026.ics"));
    const ics = readFileSync(path, "utf8");
    expect(ics).toContain("SUMMARY:Adorační den kuřimské farnosti");
    // Long lines are folded with a CRLF and a space or tab.
    expect(ics.replace(/\r\n[ \t]/g, "")).toContain(`DESCRIPTION:Adorační den naší farnosti.\\n\\n${URL_OF}`);
  });

  it("asks only Události, with the site as referrer, and writes nothing when linked", async () => {
    const fetch = stubCalendar([google("a", "2026-10-12", "Adorace", URL_OF)]);
    expect(await checkCalendar(testEvent(), { apiKey: "KEY", outDir: dir })).toEqual([
      'Události: linked ("Adorace" on 2026-10-12): nothing to do.',
    ]);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain(encodeURIComponent(parishCalendars.events.googleId));
    expect(init?.headers).toEqual({ Referer: "https://farakurim.cz/" });
    expect(readdirSync(dir)).toEqual([]);
  });

  it("asks for the link when the event is there without it", async () => {
    stubCalendar([google("a", "2026-10-12", "Adorační den")]);
    expect(await checkCalendar(testEvent(), { apiKey: "KEY", outDir: dir })).toEqual([
      `Události, 2026-10-12: "Adorační den" has no link: add ${URL_OF} to its description.`,
      expect.stringMatching(/^This can be done before or after the release/),
    ]);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("writes the .ics when no meeting is in the calendar", async () => {
    stubCalendar([]);
    const lines = await checkCalendar(testEvent(), { apiKey: "KEY", outDir: dir });
    expect(lines[0]).toBe("Události: no event on 2026-10-12.");
    expect(lines[1]).toMatch(/^Wrote .*adoracni-den-2026\.ics: import it into "Události" .*, not into a personal/);
    expect(readdirSync(dir)).toEqual(["adoracni-den-2026.ics"]);
  });

  const cancelled = { change: { status: "cancelled", announced: "2026-10-10" } } as const;

  it('asks for the "Zrušeno: " prefix when a linked event is cancelled on the site', async () => {
    stubCalendar([google("a", "2026-10-12", "Adorace", URL_OF)]);
    expect(await checkCalendar(testEvent(cancelled), { apiKey: "KEY", outDir: dir })).toEqual([
      'Události, 2026-10-12: linked, but rename "Adorace" to "Zrušeno: Adorace", as the meeting is cancelled (do not delete the event).',
      "The Kalendář shows the change once Google has it, with or without a release.",
    ]);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("has nothing to do when the cancelled event has the prefix", async () => {
    stubCalendar([google("a", "2026-10-12", "Zrušeno: Adorace", URL_OF)]);
    expect(await checkCalendar(testEvent(cancelled), { apiKey: "KEY", outDir: dir })).toEqual([
      'Události: linked ("Zrušeno: Adorace" on 2026-10-12): nothing to do.',
    ]);
  });

  it("asks to remove the prefix when the cancellation is withdrawn", async () => {
    stubCalendar([google("a", "2026-10-12", "Zrušeno: Adorace", URL_OF)]);
    expect(await checkCalendar(testEvent(), { apiKey: "KEY", outDir: dir })).toEqual([
      'Události, 2026-10-12: linked, but rename "Zrušeno: Adorace" to "Adorace", as the meeting is no longer cancelled.',
      "The Kalendář shows the change once Google has it, with or without a release.",
    ]);
  });

  it("asks for the link and the prefix together on an unlinked event", async () => {
    stubCalendar([google("a", "2026-10-12", "Adorační den")]);
    expect(await checkCalendar(testEvent(cancelled), { apiKey: "KEY", outDir: dir })).toEqual([
      `Události, 2026-10-12: "Adorační den" has no link: add ${URL_OF} to its description, and rename "Adorační den" to "Zrušeno: Adorační den", as the meeting is cancelled (do not delete the event).`,
      expect.stringMatching(/^This can be done before or after the release/),
      "The Kalendář shows the change once Google has it, with or without a release.",
    ]);
  });

  it("writes no .ics for a cancelled event missing from the calendar", async () => {
    stubCalendar([]);
    expect(await checkCalendar(testEvent(cancelled), { apiKey: "KEY", outDir: dir })).toEqual([
      "Události, 2026-10-12: no event, and the meeting is cancelled: nothing to do.",
    ]);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("asks for the prefix on a dropped meeting only", async () => {
    const event = testEvent({
      id: "manzelske-vecery",
      title: "Manželské večery",
      sessions: ["2026-10-11", "2026-10-18"],
      cancelledMeetings: { dates: ["2026-10-18"] },
    });
    const link = "https://farakurim.cz/aktuality/manzelske-vecery/";
    stubCalendar([
      google("a", "2026-10-11", "Manželské večery", link),
      google("b", "2026-10-18", "Manželské večery", link),
    ]);
    expect(await checkCalendar(event, { apiKey: "KEY", outDir: dir })).toEqual([
      'Události, 2026-10-11: linked ("Manželské večery").',
      'Události, 2026-10-18: linked, but rename "Manželské večery" to "Zrušeno: Manželské večery" (this occurrence only), as the meeting is cancelled (do not delete the event).',
      "The Kalendář shows the change once Google has it, with or without a release.",
    ]);
  });

  const moved = {
    start: "2026-10-24",
    change: { status: "moved", previousStart: "2026-10-12", announced: "2026-10-10" },
  } as const;

  it("asks to move the event still on the date before the move, reading both dates", async () => {
    const fetch = stubCalendar([google("a", "2026-10-12", "Adorace", URL_OF)]);
    expect(await checkCalendar(testEvent(moved), { apiKey: "KEY", outDir: dir })).toEqual([
      'Události, 2026-10-24: "Adorace" is still on 2026-10-12: move it to 2026-10-24 13:00–18:00. Do not import an .ics: it would add a second event.',
      "The Kalendář shows the change once Google has it, with or without a release.",
    ]);
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.searchParams.get("timeMin")).toMatch(/^2026-10-1[12]T/);
    expect(url.searchParams.get("timeMax")).toMatch(/^2026-10-2[45]T/);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("asks to link the moved event when it has no link", async () => {
    stubCalendar([google("a", "2026-10-12", "Adorační den")]);
    expect(await checkCalendar(testEvent(moved), { apiKey: "KEY", outDir: dir })).toEqual([
      `Události, 2026-10-24: "Adorační den" is still on 2026-10-12: move it to 2026-10-24 13:00–18:00, then add ${URL_OF} to its description. Do not import an .ics: it would add a second event.`,
      expect.stringMatching(/^This can be done before or after the release/),
      "The Kalendář shows the change once Google has it, with or without a release.",
    ]);
  });

  it("has nothing to do once the event is on the new date", async () => {
    stubCalendar([google("a", "2026-10-24", "Adorace", URL_OF)]);
    expect(await checkCalendar(testEvent(moved), { apiKey: "KEY", outDir: dir })).toEqual([
      'Události: linked ("Adorace" on 2026-10-24): nothing to do.',
    ]);
  });

  it("writes the .ics for a moved event on neither date", async () => {
    stubCalendar([]);
    expect((await checkCalendar(testEvent(moved), { apiKey: "KEY", outDir: dir }))[0]).toBe(
      "Události: no event on 2026-10-24.",
    );
    expect(readdirSync(dir)).toEqual(["adoracni-den-2026.ics"]);
  });

  it("writes the .ics, saying why, without a key or when Google fails", async () => {
    expect((await checkCalendar(testEvent(), { outDir: dir }))[0]).toBe(
      "Události: not checked (no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local).",
    );
    stubCalendar([], 403);
    const lines = await checkCalendar(testEvent(), { apiKey: "KEY", outDir: dir });
    expect(lines[0]).toMatch(/^Události: not checked \(Google Calendar .*: HTTP 403\)\.$/);
    expect(lines[1]).toContain(`unless the event is there already; then add ${URL_OF} to its description.`);
    expect(readdirSync(dir)).toEqual(["adoracni-den-2026.ics"]);
  });
});
