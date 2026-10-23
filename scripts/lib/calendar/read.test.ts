import { afterEach, describe, expect, it, vi } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import { googlePage } from "@/test/fetch";
import { readSnapshot, snapshotRange } from "./read";

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

    const snapshot = await readSnapshot({ token: "TOKEN" }, range);

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
    await readSnapshot({ apiKey: "KEY" }, range);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).searchParams.get("key")).toBe("KEY");
    expect(init.headers).toMatchObject({ Referer: "https://farakurim.cz/" });
  });

  it("keeps a deleted event that carries only its id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([{ id: "gone", status: "cancelled" }])),
    );
    const snapshot = await readSnapshot({ token: "T" }, range);
    expect(snapshot.instances).toMatchObject([{ id: "gone", status: "cancelled" }]);
    expect(snapshot.masters).toEqual([]);
  });

  it("throws on an HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([], 403)),
    );
    await expect(readSnapshot({ token: "T" }, range)).rejects.toThrow("HTTP 403");
  });
});
