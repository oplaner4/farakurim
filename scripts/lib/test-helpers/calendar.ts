// The tests every calendar sync shares, and the setup of a preview against an empty calendar.

import { expect, it, vi } from "vitest";
import { googlePage } from "@/test/fetch";

/**
 * A preview against an empty calendar: the API key set, Google answering with no events and console.log captured
 * (the caller's afterEach() restores them). Returns the fetch mock and the log spy.
 */
export function emptyCalendarPreview() {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
  const fetchMock = vi.fn(async () => googlePage([]));
  vi.stubGlobal("fetch", fetchMock);
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  return { fetchMock, log };
}

/**
 * The checks every calendar sync makes before it plans, as tests: --apply without the service account fails before
 * reading anything, and a preview without the API key or with Google refusing says `calendar` was not checked and
 * fails. The caller's afterEach() restores the env, the globals and console.log.
 */
export function syncGuardTests(
  calendar: string,
  sync: (options: { apply: boolean; problems: boolean }) => Promise<unknown>,
) {
  it("fails --apply without the service account, before reading anything", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_SERVICE_ACCOUNT", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sync({ apply: true, problems: false })).rejects.toThrow("no GOOGLE_CALENDAR_SERVICE_ACCOUNT");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("previews: says the calendar was not checked without the key, and fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(sync({ apply: false, problems: false })).rejects.toThrow(
      "no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local",
    );
    expect(log).toHaveBeenCalledWith(
      `${calendar}: not checked (no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local).`,
    );
  });

  it("previews: says the calendar was not checked when Google does not answer, and fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([], 403)),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(sync({ apply: false, problems: false })).rejects.toThrow("HTTP 403");
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${calendar}: not checked \\(.*HTTP 403.*\\)\\.$`)),
    );
  });
}
