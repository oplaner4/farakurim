import { afterEach, describe, expect, it, vi } from "vitest";
import { parishCalendars } from "@/content/site";
import { googlePage } from "@/test/fetch";
import { syncServices } from "./services-sync";
import { accessToken, applyServicesChange } from "./write";

vi.mock("./write", () => ({ accessToken: vi.fn(), applyServicesChange: vi.fn() }));
vi.mock("../services/add-service-sheet", () => ({
  readServiceSheets: () => ({ sheets: [] }),
  readScheduleExceptions: () => ({ exceptions: [] }),
}));
vi.mock("@/content/masses", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/content/masses")>()),
  regularServices: [{ weekday: 0, time: "8:00", place: "kurim" }],
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// A Saturday: the first Sunday of the window is the next day.
const freezeAt = (iso: string) => vi.useFakeTimers({ toFake: ["Date"], now: new Date(iso) });

describe("syncServices", () => {
  it("fails --apply without the service account, before reading anything", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_SERVICE_ACCOUNT", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(syncServices({ apply: true, problems: false })).rejects.toThrow("no GOOGLE_CALENDAR_SERVICE_ACCOUNT");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("previews: says the calendar was not checked without the key, and fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(syncServices({ apply: false, problems: false })).rejects.toThrow(
      "no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local",
    );
    expect(log).toHaveBeenCalledWith("Bohoslužby: not checked (no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local).");
  });

  it("previews: says the calendar was not checked when Google does not answer, and fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([], 403)),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(syncServices({ apply: false, problems: false })).rejects.toThrow("HTTP 403");
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^Bohoslužby: not checked \(.*HTTP 403.*\)\.$/));
  });

  it("previews the adds of an empty calendar, and writes nothing", async () => {
    freezeAt("2026-10-24T10:00:00Z");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    const fetchMock = vi.fn(async () => googlePage([]));
    vi.stubGlobal("fetch", fetchMock);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await syncServices({ apply: false, problems: false });
    const [printed] = log.mock.calls[0] as [string];
    const lines = printed.split("\n");
    expect(lines[0]).toBe('Bohoslužby, 2026-10-25: add 8:00 "Mše svatá v Kuřimi"');
    expect(lines.every((l) => l.startsWith("Bohoslužby, ") && l.includes(": add "))).toBe(true);
    expect(applyServicesChange).not.toHaveBeenCalled();
    // Read from the Bohoslužby calendar, today to six months ahead.
    const url = new URL((fetchMock.mock.calls[0] as unknown as [string])[0]);
    expect(url.pathname).toContain(encodeURIComponent("hho1ik2s8pu7742kv6eojt0tno@group.calendar.google.com"));
  });

  it("with problems prints nothing when no hand-made event doubles a service", async () => {
    freezeAt("2026-10-24T10:00:00Z");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([])),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await syncServices({ apply: false, problems: true });
    expect(log).not.toHaveBeenCalled();
  });

  it("applies with the service account's token, reports a failed write and carries on, then fails", async () => {
    freezeAt("2026-10-24T10:00:00Z");
    vi.stubEnv("GOOGLE_CALENDAR_SERVICE_ACCOUNT", "{}");
    vi.mocked(accessToken).mockResolvedValue("TOKEN");
    vi.mocked(applyServicesChange).mockRejectedValueOnce(new Error("quota exceeded")).mockResolvedValue(undefined);
    const fetchMock = vi.fn(async () => googlePage([]));
    vi.stubGlobal("fetch", fetchMock);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(syncServices({ apply: true, problems: false })).rejects.toThrow(/^1 calendar changes failed$/);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).pathname).toContain(encodeURIComponent(parishCalendars.services.googleId));
    expect(init.headers).toMatchObject({ Authorization: "Bearer TOKEN" });
    const calls = vi.mocked(applyServicesChange).mock.calls;
    expect(calls.length).toBeGreaterThan(20);
    expect(calls.every(([, token]) => token === "TOKEN")).toBe(true);
    const lines = (log.mock.calls[0] as [string])[0].split("\n");
    expect(lines[0]).toBe('Bohoslužby, 2026-10-25: added 8:00 "Mše svatá v Kuřimi" — failed: quota exceeded');
    expect(lines[1]).toBe('Bohoslužby, 2026-11-01: added 8:00 "Mše svatá v Kuřimi"');
  });
});
