import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "@/test/fetch";
import {
  eventPaths,
  eventsUrl,
  fetchGoogleCalendar,
  parseEventsPage,
  parseTitle,
  refererInit,
  toEntries,
} from "./google-calendar";

describe("eventsUrl", () => {
  it("asks for expanded events of the Prague days", () => {
    const url = new URL(eventsUrl("abc@group.calendar.google.com", "KEY", { from: "2026-10-01", to: "2026-10-31" }));
    expect(url.pathname).toBe("/calendar/v3/calendars/abc%40group.calendar.google.com/events");
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("timeMin")).toBe("2026-10-01T00:00:00.000+02:00");
    // The day after the range, already in winter time.
    expect(url.searchParams.get("timeMax")).toBe("2026-11-01T00:00:00.000+01:00");
  });
});

describe("eventsUrl options", () => {
  const range = { from: "2026-10-01", to: "2026-10-31" } as const;

  it("can ask for the recurring events themselves, without orderBy", () => {
    const url = new URL(eventsUrl("abc", "KEY", range, undefined, { singleEvents: false }));
    expect(url.searchParams.get("singleEvents")).toBe("false");
    expect(url.searchParams.has("orderBy")).toBe(false);
  });

  it("can ask for deleted events and leave out the key", () => {
    const url = new URL(eventsUrl("abc", undefined, range, undefined, { showDeleted: true }));
    expect(url.searchParams.has("key")).toBe(false);
    expect(url.searchParams.get("showDeleted")).toBe("true");
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("orderBy")).toBe("startTime");
  });

  it("does not ask for deleted events by default", () => {
    expect(new URL(eventsUrl("abc", "KEY", range)).searchParams.has("showDeleted")).toBe(false);
  });
});

describe("parseEventsPage", () => {
  it("keeps a deleted event with only an id, and the site still ignores it", () => {
    const { events } = parseEventsPage({ items: [{ id: "gone", status: "cancelled", recurringEventId: "r" }] });
    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe("gone");
    expect(toEntries(events, "events", [])).toEqual([]);
  });

  it("still drops an active event without a start", () => {
    expect(parseEventsPage({ items: [{ id: "x" }] }).events).toEqual([]);
  });

  it("keeps the recurrence of a repeating event", () => {
    const { events } = parseEventsPage({
      items: [
        { id: "a", start: { date: "2026-10-01" }, end: { date: "2026-10-02" }, recurrence: ["RRULE:FREQ=WEEKLY"] },
      ],
    });
    expect(events[0]?.recurrence).toEqual(["RRULE:FREQ=WEEKLY"]);
  });

  const event = {
    id: "m1",
    summary: "Mše svatá",
    etag: "dropped",
    start: { dateTime: "2026-10-04T08:00:00+02:00" },
    end: { dateTime: "2026-10-04T09:00:00Z" },
  };

  it("keeps the fields the calendars use and the next page token", () => {
    expect(parseEventsPage({ kind: "calendar#events", items: [event], nextPageToken: "p2" })).toEqual({
      events: [
        {
          id: "m1",
          summary: "Mše svatá",
          start: { dateTime: "2026-10-04T08:00:00+02:00" },
          end: { dateTime: "2026-10-04T09:00:00Z" },
        },
      ],
      nextPageToken: "p2",
    });
  });

  it("leaves out a malformed event and reads a page without items", () => {
    const broken = { id: "x", start: { date: "4. 10. 2026" }, end: {} };
    expect(parseEventsPage({ items: [broken, event, null] }).events.map((e) => e.id)).toEqual(["m1"]);
    expect(parseEventsPage({})).toEqual({ events: [], nextPageToken: undefined });
  });

  it("throws for a response that is not a result page", () => {
    expect(() => parseEventsPage("<html>")).toThrow();
    expect(() => parseEventsPage({ items: "none" })).toThrow();
  });
});

describe("eventPaths", () => {
  it("finds the detail page URLs in a description, also in Google's HTML", () => {
    expect(eventPaths("Zveme.\n\nhttps://farakurim.cz/aktuality/hody-ceska/")).toEqual(["/aktuality/hody-ceska/"]);
    expect(
      eventPaths('<a href="https://www.farakurim.cz/aktuality/hody">https://www.farakurim.cz/aktuality/hody</a>'),
    ).toEqual(["/aktuality/hody/", "/aktuality/hody/"]);
    expect(eventPaths("farakurim.cz/aktuality/a-1 a /aktuality/b/")).toEqual(["/aktuality/a-1/", "/aktuality/b/"]);
  });

  it("ignores other sites and descriptions without a link", () => {
    expect(eventPaths("https://example.cz/aktuality/hody/ a https://stary.farakurim.cz/aktuality/x/")).toEqual([]);
    expect(eventPaths("Sraz na faře")).toEqual([]);
    expect(eventPaths(undefined)).toEqual([]);
  });
});

describe("refererInit", () => {
  it("sends the site as the referrer", () => {
    expect(refererInit("https://farakurim.cz")).toEqual({ headers: { Referer: "https://farakurim.cz/" } });
  });
});

describe("toEntries", () => {
  const pages = ["/aktuality/hody/", "/aktuality/vecery/"];

  it("converts timed, all-day and multi-day events", () => {
    const entries = toEntries(
      [
        {
          id: "m1",
          summary: "Mše svatá",
          location: "Kuřim",
          start: { dateTime: "2026-10-04T08:00:00+02:00" },
          end: { dateTime: "2026-10-04T09:00:00+02:00" },
        },
        { id: "h", summary: "Hody", start: { date: "2026-10-02" }, end: { date: "2026-10-05" } },
        { id: "k", summary: "Koláč", start: { date: "2026-10-07" }, end: { date: "2026-10-08" } },
        {
          id: "v_1",
          recurringEventId: "series",
          summary: "Večery",
          description: "https://farakurim.cz/aktuality/vecery/",
          start: { dateTime: "2026-10-11T18:00:00+02:00" },
          end: { dateTime: "2026-10-12T00:00:00+02:00" },
        },
      ],
      "events",
      pages,
    );
    expect(entries).toEqual([
      { id: "m1", calendar: "events", title: "Mše svatá", place: "Kuřim", date: "2026-10-04", time: "8:00" },
      { id: "h", calendar: "events", title: "Hody", date: "2026-10-02", end: "2026-10-04" },
      { id: "k", calendar: "events", title: "Koláč", date: "2026-10-07" },
      { id: "v_1", calendar: "events", title: "Večery", href: "/aktuality/vecery/", date: "2026-10-11", time: "18:00" },
    ]);
  });

  it("handles an event without an end, one past midnight, and drops one without a start", () => {
    const entries = toEntries(
      [
        { id: "a", summary: "Pouť", start: { date: "2026-10-07" }, end: {} },
        { id: "t", summary: "Adorace", start: { dateTime: "2026-10-09T20:00:00+02:00" }, end: {} },
        {
          id: "n",
          summary: "Noc kostelů",
          start: { dateTime: "2026-10-09T20:00:00+02:00" },
          end: { dateTime: "2026-10-10T01:00:00+02:00" },
        },
        { id: "x", summary: "Bez začátku", start: {}, end: {} },
      ],
      "events",
      pages,
    );
    expect(entries).toEqual([
      { id: "a", calendar: "events", title: "Pouť", date: "2026-10-07" },
      { id: "t", calendar: "events", title: "Adorace", date: "2026-10-09", time: "20:00" },
      { id: "n", calendar: "events", title: "Noc kostelů", date: "2026-10-09", time: "20:00", end: "2026-10-10" },
    ]);
  });

  it("links an Události event to the first built page in its description", () => {
    const event = (id: string, description?: string) => ({
      id,
      description,
      start: { date: "2026-10-04" },
      end: { date: "2026-10-05" },
    });
    const href = (calendar: "events" | "services", ...events: ReturnType<typeof event>[]) =>
      toEntries(events, calendar, pages).map((e) => e.href);
    expect(
      href(
        "events",
        event("a", "https://farakurim.cz/aktuality/hody/"),
        event("b", "/aktuality/neni-postaveno/ a /aktuality/hody/"),
        event("c", "https://farakurim.cz/aktuality/neni-postaveno/"),
        event("d"),
      ),
    ).toEqual(["/aktuality/hody/", "/aktuality/hody/", undefined, undefined]);
    // Bohoslužby events never link.
    expect(href("services", event("a", "https://farakurim.cz/aktuality/hody/"))).toEqual([undefined]);
  });

  it('turns the title prefix "Zrušeno: " into the cancelled status', () => {
    const day = { start: { date: "2026-10-16" }, end: { date: "2026-10-17" } };
    const entries = toEntries(
      [
        { id: "a", summary: "Zrušeno: Přednáška o Turínském plátně", ...day },
        { id: "b", summary: "zrušeno:Drakiáda", ...day },
        { id: "c", summary: "Přednáška (zrušeno)", ...day },
      ],
      "events",
      pages,
    );
    expect(entries.map((e) => [e.title, e.cancelled])).toEqual([
      ["Přednáška o Turínském plátně", true],
      ["Drakiáda", true],
      ["Přednáška (zrušeno)", undefined],
    ]);
  });

  it('turns the title prefix "Změna: " into the changed status', () => {
    expect(parseTitle("Změna: Mše svatá v Kuřimi")).toEqual({
      title: "Mše svatá v Kuřimi",
      cancelled: false,
      changed: true,
    });
    expect(parseTitle("změna:Adorace v Kuřimi").changed).toBe(true);
    expect(parseTitle("Zrušeno: Mše svatá v Kuřimi")).toEqual({
      title: "Mše svatá v Kuřimi",
      cancelled: true,
      changed: false,
    });
    expect(parseTitle("Mše svatá (změna)").changed).toBe(false);
    const day = { start: { date: "2026-10-16" }, end: { date: "2026-10-17" } };
    const entries = toEntries(
      [
        { id: "a", summary: "Změna: Mše svatá v Kuřimi", ...day },
        { id: "b", summary: "Mše svatá v Kuřimi", ...day },
      ],
      "services",
      pages,
    );
    expect(entries.map((e) => [e.title, e.changed])).toEqual([
      ["Mše svatá v Kuřimi", true],
      ["Mše svatá v Kuřimi", undefined],
    ]);
  });

  it("drops cancelled instances", () => {
    expect(toEntries([{ id: "x", status: "cancelled", start: {}, end: {} }], "services", pages)).toEqual([]);
  });
});

describe("fetchGoogleCalendar", () => {
  const range = { from: "2026-10-01", to: "2026-10-31" };
  const item = (id: string) => ({ id, start: { date: "2026-10-04" }, end: { date: "2026-10-05" } });

  /** Answers each request with the next of `pages` and records the page tokens asked for. */
  function stubFetch(...pages: { status?: number; body?: unknown }[]) {
    const tokens: (string | null)[] = [];
    const fetch = vi.fn(async (url: string) => {
      tokens.push(new URL(url).searchParams.get("pageToken"));
      const { status = 200, body = {} } = pages[tokens.length - 1];
      return jsonResponse(body, status);
    });
    vi.stubGlobal("fetch", fetch);
    return tokens;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows the result pages and joins their events", async () => {
    const tokens = stubFetch(
      { body: { items: [item("a"), item("b")], nextPageToken: "p2" } },
      { body: { items: [item("c")], nextPageToken: "p3" } },
      { body: { items: [] } },
    );
    const events = await fetchGoogleCalendar("cal", "KEY", range);
    expect(events.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(tokens).toEqual([null, "p2", "p3"]);
  });

  it("throws when the API fails, also on a later page", async () => {
    stubFetch({ status: 403 });
    await expect(fetchGoogleCalendar("cal", "KEY", range)).rejects.toThrow("Google Calendar cal: HTTP 403");

    stubFetch({ body: { items: [item("a")], nextPageToken: "p2" } }, { status: 500 });
    await expect(fetchGoogleCalendar("cal", "KEY", range)).rejects.toThrow("HTTP 500");
  });

  it("throws when the answer is not a result page", async () => {
    stubFetch({ body: { items: "nothing" } });
    await expect(fetchGoogleCalendar("cal", "KEY", range)).rejects.toThrow();
  });
});
