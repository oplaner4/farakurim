import { afterEach, describe, expect, it, vi } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import { googlePage } from "@/test/fetch";
import { parishCalendars } from "@/content/site";
import { readInstances, readSnapshot, snapshotRange } from "./read";

const weekly: NewsEvent = {
  id: "obnova",
  title: "Obnova v Duchu svatém",
  start: "2026-10-01",
  end: "2027-04-29",
  text: "Text.",
  longTerm: { weeklyAt: "18:30" },
};

const item = (id: string, extra: object = {}) => ({
  id,
  start: { date: "2026-10-01" },
  end: { date: "2026-10-02" },
  ...extra,
});

afterEach(() => vi.unstubAllGlobals());

describe("snapshotRange", () => {
  it("reaches the year of the last meeting of a weekly event across New Year", () => {
    expect(snapshotRange([weekly], "2026-10-23")).toEqual({ from: "2026-01-01", to: "2027-12-31" });
  });

  it("is today's year when no record is in scope", () => {
    expect(snapshotRange([], "2026-10-23")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(snapshotRange([{ ...weekly, end: "2026-03-01" }], "2026-10-23")).toEqual({
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });
});

const CALENDAR = parishCalendars.events.googleId;

describe("readSnapshot", () => {
  const range = { from: "2026-01-01", to: "2026-12-31" } as const;

  it("reads instances and masters with the token, and follows the pages", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const u = new URL(url);
      if (u.searchParams.get("singleEvents") === "false") {
        return googlePage([item("m", { recurrence: ["RRULE:FREQ=WEEKLY"] }), item("plain")]);
      }
      if (u.searchParams.get("pageToken") === "2") return googlePage([item("i2")]);
      return Response.json({ items: [item("i1")], nextPageToken: "2" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await readSnapshot({ token: "TOKEN" }, CALENDAR, range);

    expect(snapshot.instances.map((e) => e.id)).toEqual(["i1", "i2"]);
    expect(snapshot.masters.map((e) => e.id)).toEqual(["m"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [url, init] of fetchMock.mock.calls as unknown as [string, RequestInit][]) {
      expect(new URL(url).searchParams.has("key")).toBe(false);
      expect(init.headers).toMatchObject({ Authorization: "Bearer TOKEN" });
    }
    const instanceUrl = new URL(fetchMock.mock.calls[0]![0]);
    expect(instanceUrl.searchParams.get("showDeleted")).toBe("true");
  });

  it("sends the key and the site's Referer for an API key", async () => {
    const fetchMock = vi.fn(async () => googlePage([]));
    vi.stubGlobal("fetch", fetchMock);
    await readSnapshot({ apiKey: "KEY" }, CALENDAR, range);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).searchParams.get("key")).toBe("KEY");
    expect(init.headers).toMatchObject({ Referer: "https://farakurim.cz/" });
  });

  it("keeps a deleted event that carries only its id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([{ id: "gone", status: "cancelled" }])),
    );
    const snapshot = await readSnapshot({ token: "T" }, CALENDAR, range);
    expect(snapshot.instances).toMatchObject([{ id: "gone", status: "cancelled" }]);
    expect(snapshot.masters).toMatchObject([{ id: "gone", status: "cancelled" }]);
  });

  it("reads the repeating events with the deleted ones, and keeps only those and the repeating", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      new URL(url).searchParams.get("singleEvents") === "false"
        ? googlePage([
            item("m", { recurrence: ["RRULE:FREQ=WEEKLY"] }),
            { id: "gone", status: "cancelled" },
            item("plain"),
          ])
        : googlePage([]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const snapshot = await readSnapshot({ token: "T" }, CALENDAR, range);
    const mastersUrl = new URL(fetchMock.mock.calls[1]![0]);
    expect(mastersUrl.searchParams.get("showDeleted")).toBe("true");
    expect(snapshot.masters.map((e) => e.id)).toEqual(["m", "gone"]);
  });

  it("throws on an HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([], 403)),
    );
    await expect(readSnapshot({ token: "T" }, CALENDAR, range)).rejects.toThrow("HTTP 403");
  });
});

describe("readInstances", () => {
  it("reads the expanded events, with the deleted, of the calendar it is given", async () => {
    const fetchMock = vi.fn(async () => googlePage([item("a")]));
    vi.stubGlobal("fetch", fetchMock);
    const events = await readInstances({ apiKey: "KEY" }, "services@group.calendar.google.com", {
      from: "2026-10-24",
      to: "2027-04-24",
    });
    expect(events.map((e) => e.id)).toEqual(["a"]);
    const url = new URL((fetchMock.mock.calls[0] as unknown as [string])[0]);
    expect(url.pathname).toContain(encodeURIComponent("services@group.calendar.google.com"));
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("showDeleted")).toBe("true");
  });
});
