import { afterEach, describe, expect, it, vi } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import { googlePage } from "@/test/fetch";
import { execute, parseCommand, previewLines } from "./calendar-sync";
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

const record = (id: string, title: string, start: string): NewsEvent => ({ id, title, start, text: "Text." });

describe("parseCommand", () => {
  it("reads --apply, and no flag means a preview", () => {
    expect(parseCommand(["--apply"])).toEqual({ apply: true });
    expect(parseCommand([])).toEqual({ apply: false });
  });

  it("throws with the usage for an unknown option or a positional", () => {
    expect(() => parseCommand(["--aply"])).toThrow("Usage: pnpm calendar-sync [--apply]");
    expect(() => parseCommand(["x"])).toThrow("Usage: pnpm calendar-sync [--apply]");
  });
});

describe("execute", () => {
  it("fails --apply without the service account, before reading anything", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_SERVICE_ACCOUNT", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(execute({ apply: true })).rejects.toThrow("no GOOGLE_CALENDAR_SERVICE_ACCOUNT");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("previews: says the calendar was not checked without the key, and fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(execute({ apply: false })).rejects.toThrow("no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local");
    expect(log).toHaveBeenCalledWith("Události: not checked (no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local).");
  });

  it("previews: says the calendar was not checked when Google does not answer, and fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([], 403)),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(execute({ apply: false })).rejects.toThrow("HTTP 403");
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^Události: not checked \(.*HTTP 403.*\)\.$/));
  });

  it("previews the plan of all records", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([])),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await execute({ apply: false });
    expect(log).toHaveBeenCalledWith(
      ['Události, 2099-01-05: Would add "Alfa"', 'Události, 2099-01-06: Would add "Beta"'].join("\n"),
    );
  });

  it("with --apply rereads with the token, goes on after a failed change, and throws when any failed", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_SERVICE_ACCOUNT", "KEY-JSON");
    vi.mocked(accessToken).mockResolvedValue("TOKEN");
    vi.mocked(applyChange).mockRejectedValueOnce(new Error("quota exceeded")).mockResolvedValueOnce(undefined);
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () => googlePage([]));
    vi.stubGlobal("fetch", fetchMock);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(execute({ apply: true })).rejects.toThrow("1 calendar changes failed");

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

describe("previewLines", () => {
  it("says the calendar was not checked without the key", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "");
    expect(await previewLines([record("a", "A", "2099-01-05")])).toEqual([
      "Události: not checked (no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local).",
    ]);
  });

  it("says the calendar was not checked when Google does not answer", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([], 403)),
    );
    expect(await previewLines([record("a", "A", "2099-01-05")])).toEqual([
      expect.stringMatching(/^Události: not checked \(.*HTTP 403.*\)\.$/),
    ]);
  });

  it("plans all records but keeps only the one asked for", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", "KEY");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => googlePage([])),
    );
    const events = [record("a", "Alfa", "2099-01-05"), record("b", "Beta", "2099-01-06")];
    expect(await previewLines(events)).toEqual([
      'Události, 2099-01-05: Would add "Alfa"',
      'Události, 2099-01-06: Would add "Beta"',
    ]);
    expect(await previewLines(events, "b")).toEqual(['Události, 2099-01-06: Would add "Beta"']);
  });
});
