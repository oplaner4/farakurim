import { afterEach, describe, expect, it, vi } from "vitest";
import { googlePage } from "@/test/fetch";
import { syncGuardTests } from "../test-helpers";
import { syncEvents } from "./events-sync";
import { accessToken, applyChange } from "./write";

vi.mock("./write", () => ({ accessToken: vi.fn(), applyChange: vi.fn() }));
vi.mock("@/content/news", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/content/news")>()),
  readEvents: () => [
    { id: "a", title: "Alfa", start: "2099-01-05", text: "Text." },
    { id: "b", title: "Beta", start: "2099-01-06", text: "Text." },
  ],
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("syncEvents", () => {
  syncGuardTests("Události", syncEvents);

  it("previews the plan of all records", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([])),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await syncEvents({ apply: false, problems: false });
    expect(log).toHaveBeenCalledWith(
      ['Události, 2099-01-05: Would add "Alfa"', 'Události, 2099-01-06: Would add "Beta"'].join("\n"),
    );
  });

  it("with --problems prints only what needs a person, and nothing when nothing does", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([])),
    );
    await syncEvents({ apply: false, problems: true });
    expect(log).not.toHaveBeenCalled();

    const alfa = (id: string) => ({ id, summary: "Alfa", start: { date: "2099-01-05" }, end: { date: "2099-01-06" } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([alfa("x"), alfa("y")])),
    );
    await syncEvents({ apply: false, problems: true });
    expect(log).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^ask: Události, 2099-01-05: "Alfa" on 2099-01-05/),
    );
  });

  it("with --problems still says the calendar was not checked, and fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(syncEvents({ apply: false, problems: true })).rejects.toThrow(
      "no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY",
    );
    expect(log).toHaveBeenCalledWith("Události: not checked (no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local).");
  });

  it("with --apply rereads with the token, goes on after a failed change, and throws when any failed", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_SERVICE_ACCOUNT", "KEY-JSON");
    vi.mocked(accessToken).mockResolvedValue("TOKEN");
    vi.mocked(applyChange).mockRejectedValueOnce(new Error("quota exceeded")).mockResolvedValueOnce(undefined);
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () => googlePage([]));
    vi.stubGlobal("fetch", fetchMock);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(syncEvents({ apply: true, problems: false })).rejects.toThrow("1 calendar changes failed");

    expect(accessToken).toHaveBeenCalledWith("KEY-JSON");
    expect(fetchMock).toHaveBeenCalled();
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.headers).toEqual({ Authorization: "Bearer TOKEN" });
    }
    expect(applyChange).toHaveBeenCalledTimes(2);
    expect(vi.mocked(applyChange).mock.calls.every(([, token]) => token === "TOKEN")).toBe(true);
    expect(log).toHaveBeenCalledWith(
      ['Události, 2099-01-05: Added "Alfa" — failed: quota exceeded', 'Události, 2099-01-06: Added "Beta"'].join("\n"),
    );
  });
});
