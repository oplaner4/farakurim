import { afterEach, describe, expect, it, vi } from "vitest";
import { googlePage } from "@/test/fetch";
import { execute, parseCommand } from "./calendar-sync";
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

describe("parseCommand", () => {
  it("reads --apply, and no flag means a preview", () => {
    expect(parseCommand(["--apply"])).toEqual({ apply: true, problems: false });
    expect(parseCommand([])).toEqual({ apply: false, problems: false });
    expect(parseCommand(["--problems"])).toEqual({ apply: false, problems: true });
  });

  it("throws with the usage for an unknown option, a positional, or --apply with --problems", () => {
    const usage = "Usage: pnpm calendar-sync [--apply | --problems]";
    expect(() => parseCommand(["--aply"])).toThrow(usage);
    expect(() => parseCommand(["x"])).toThrow(usage);
    expect(() => parseCommand(["--apply", "--problems"])).toThrow(usage);
  });
});

describe("execute", () => {
  it("fails --apply without the service account, before reading anything", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_SERVICE_ACCOUNT", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(execute({ apply: true, problems: false })).rejects.toThrow("no GOOGLE_CALENDAR_SERVICE_ACCOUNT");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("previews: says the calendar was not checked without the key, and fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(execute({ apply: false, problems: false })).rejects.toThrow(
      "no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local",
    );
    expect(log).toHaveBeenCalledWith("Události: not checked (no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local).");
  });

  it("previews: says the calendar was not checked when Google does not answer, and fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([], 403)),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(execute({ apply: false, problems: false })).rejects.toThrow("HTTP 403");
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^Události: not checked \(.*HTTP 403.*\)\.$/));
  });

  it("previews the plan of all records", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([])),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await execute({ apply: false, problems: false });
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
    await execute({ apply: false, problems: true });
    expect(log).not.toHaveBeenCalled();

    const alfa = (id: string) => ({ id, summary: "Alfa", start: { date: "2099-01-05" }, end: { date: "2099-01-06" } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([alfa("x"), alfa("y")])),
    );
    await execute({ apply: false, problems: true });
    expect(log).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^Události, 2099-01-05: ask: "Alfa" on 2099-01-05/),
    );
  });

  it("with --problems still says the calendar was not checked, and fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(execute({ apply: false, problems: true })).rejects.toThrow("no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY");
    expect(log).toHaveBeenCalledWith("Události: not checked (no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local).");
  });

  it("with --apply rereads with the token, goes on after a failed change, and throws when any failed", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_SERVICE_ACCOUNT", "KEY-JSON");
    vi.mocked(accessToken).mockResolvedValue("TOKEN");
    vi.mocked(applyChange).mockRejectedValueOnce(new Error("quota exceeded")).mockResolvedValueOnce(undefined);
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () => googlePage([]));
    vi.stubGlobal("fetch", fetchMock);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(execute({ apply: true, problems: false })).rejects.toThrow("1 calendar changes failed");

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
