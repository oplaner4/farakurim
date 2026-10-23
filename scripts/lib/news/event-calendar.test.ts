import { afterEach, describe, expect, it, vi } from "vitest";
import { events } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import { googlePage } from "@/test/fetch";
import { parseCommand, reportCalendar } from "./event-calendar";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const testEvent = (fields: Partial<NewsEvent> = {}): NewsEvent => ({
  id: "zkusebni-akce-2099",
  title: "Zkušební akce",
  start: "2099-01-05",
  text: "Text.",
  ...fields,
});

describe("parseCommand", () => {
  const USAGE = "Usage: pnpm event-calendar <id>";

  it("finds the event of the id", async () => {
    expect(await parseCommand([events[0].id])).toEqual({ event: events[0] });
  });

  it("shows the usage without exactly one id or with --out, and refuses an unknown id", async () => {
    await expect(parseCommand([])).rejects.toThrow(USAGE);
    await expect(parseCommand(["a", "b"])).rejects.toThrow(USAGE);
    await expect(parseCommand(["x", "--out", "d"])).rejects.toThrow(USAGE);
    await expect(parseCommand(["neni-takova-akce"])).rejects.toThrow("no event with the id neni-takova-akce");
  });
});

describe("reportCalendar", () => {
  it("prints the sync preview of the record alone, planned among the records on disk", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    const fetch = vi.fn(async () => googlePage([]));
    vi.stubGlobal("fetch", fetch);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await reportCalendar(testEvent());
    expect(log).toHaveBeenCalledWith('Události, 2099-01-05: Would add "Zkušební akce"');
  });

  it("replaces the record of the same id instead of adding a second", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([])),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await reportCalendar(testEvent({ id: events[0].id, start: "2099-02-02", title: "Nový název" }));
    expect(log.mock.calls).toEqual([['Události, 2099-02-02: Would add "Nový název"']]);
  });

  it("says the calendar was not checked without the key, and never throws", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await reportCalendar(testEvent());
    expect(log.mock.calls[0][0]).toMatch(/^Události: not checked \(no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY/);
  });
});
