import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parishCalendars } from "@/content/site";
import { at, event } from "@/test/fixtures";
import { googlePage } from "@/test/fetch";

// Fixed records and no sheets, so the entries do not change with the content.
vi.mock("@/content/news", () => ({
  events: [
    event("hody", "2026-10-18", undefined, { startTime: "10:00" }),
    event("tabor", "2026-07-20", "2026-07-26"),
    event("pout", "2025-10-20"),
    event("stare", "2025-10-10"),
  ],
}));
vi.mock("@/server/services", () => ({ currentExceptions: [] }));

/** The module evaluated afresh at the build time `now` with the API key `key` ("" = none). */
async function load(key: string, now = at("2026-10-14")) {
  vi.setSystemTime(now);
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", key);
  vi.resetModules();
  return import("./calendar");
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("linkablePages", () => {
  it("holds the detail pages of the records that ended within a year of the build", async () => {
    const { linkablePages } = await load("");
    expect(linkablePages).toEqual(["/aktuality/hody/", "/aktuality/tabor/", "/aktuality/pout/"]);
  });

  it("follows the build day", async () => {
    const { linkablePages } = await load("", at("2026-10-05"));
    expect(linkablePages).toContain("/aktuality/stare/");
  });
});

describe("loadCalendarEntries without an API key", () => {
  it("generates the regular services and the records of the range, fetching nothing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { loadCalendarEntries } = await load("");
    const entries = await loadCalendarEntries({ from: "2026-10-17", to: "2026-10-18" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(entries.filter((e) => e.calendar === "events")).toEqual([
      expect.objectContaining({ id: "hody", date: "2026-10-18", time: "10:00", href: "/aktuality/hody/" }),
    ]);
    const services = entries.filter((e) => e.calendar === "services");
    expect(services.some((e) => e.date === "2026-10-18")).toBe(true);
    expect(services.every((e) => e.date >= "2026-10-17" && e.date <= "2026-10-18")).toBe(true);
  });

  it("keeps a multi-day record that overlaps the range on either side", async () => {
    const { loadCalendarEntries } = await load("");
    const ids = async (from: string, to: string) =>
      (await loadCalendarEntries({ from, to })).filter((e) => e.calendar === "events").map((e) => e.id);
    expect(await ids("2026-07-15", "2026-07-20")).toEqual(["tabor"]);
    expect(await ids("2026-07-26", "2026-07-31")).toEqual(["tabor"]);
    expect(await ids("2026-07-27", "2026-07-31")).toEqual([]);
  });
});

describe("loadCalendarEntries with an API key", () => {
  it("reads both calendars with the site as referrer and links the built detail pages", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url.includes(encodeURIComponent(parishCalendars.services.googleId))
          ? googlePage([{ id: "m1", summary: "Mše svatá", start: { dateTime: "2026-10-18T08:00:00+02:00" }, end: {} }])
          : googlePage([
              {
                id: "e1",
                summary: "Zrušeno: Hody",
                description: "https://farakurim.cz/aktuality/hody/",
                start: { date: "2026-10-18" },
                end: { date: "2026-10-19" },
              },
            ]),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { loadCalendarEntries } = await load("KEY");
    const entries = await loadCalendarEntries({ from: "2026-10-12", to: "2026-10-18" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url, init] of fetchMock.mock.calls as unknown as [string, RequestInit][]) {
      expect(new URL(url).searchParams.get("key")).toBe("KEY");
      expect(init.headers).toEqual({ Referer: "https://farakurim.cz/" });
    }
    expect(entries).toEqual([
      { id: "m1", calendar: "services", title: "Mše svatá", date: "2026-10-18", time: "8:00" },
      {
        id: "e1",
        calendar: "events",
        title: "Hody",
        cancelled: true,
        href: "/aktuality/hody/",
        date: "2026-10-18",
      },
    ]);
  });

  it("fails when a calendar cannot be read, so the build never ships an empty calendar", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("", { status: 403 })));
    const { loadCalendarEntries } = await load("KEY");
    await expect(loadCalendarEntries({ from: "2026-10-12", to: "2026-10-18" })).rejects.toThrow("HTTP 403");
  });
});
