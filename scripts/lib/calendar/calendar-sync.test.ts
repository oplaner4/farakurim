import { afterEach, describe, expect, it, vi } from "vitest";
import { execute, parseCommand } from "./calendar-sync";
import { syncEvents } from "./events-sync";
import { syncServices } from "./services-sync";

vi.mock("./events-sync", () => ({ syncEvents: vi.fn() }));
vi.mock("./services-sync", () => ({ syncServices: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
});

describe("parseCommand", () => {
  it("reads both calendars without --calendar, and no flag means a preview", () => {
    expect(parseCommand([])).toEqual({ calendars: ["events", "services"], apply: false, problems: false });
    expect(parseCommand(["--apply"])).toEqual({ calendars: ["events", "services"], apply: true, problems: false });
    expect(parseCommand(["--problems"])).toEqual({ calendars: ["events", "services"], apply: false, problems: true });
  });

  it("reads one calendar with --calendar", () => {
    expect(parseCommand(["--calendar", "events", "--apply"])).toEqual({
      calendars: ["events"],
      apply: true,
      problems: false,
    });
    expect(parseCommand(["--calendar", "services"])).toEqual({
      calendars: ["services"],
      apply: false,
      problems: false,
    });
  });

  it("throws with the usage for an unknown option or calendar, a positional, or --apply with --problems", () => {
    const usage = "Usage: pnpm calendar-sync [--calendar events|services] [--apply | --problems]";
    expect(() => parseCommand(["--aply"])).toThrow(usage);
    expect(() => parseCommand(["x"])).toThrow(usage);
    expect(() => parseCommand(["--apply", "--problems"])).toThrow(usage);
    expect(() => parseCommand(["--calendar", "bohosluzby"])).toThrow(usage);
    expect(() => parseCommand(["--calendar"])).toThrow(usage);
  });
});

describe("execute", () => {
  it("runs the sync of each calendar with the options", async () => {
    await execute({ calendars: ["events", "services"], apply: true, problems: false });
    expect(syncEvents).toHaveBeenCalledExactlyOnceWith({ apply: true, problems: false });
    expect(syncServices).toHaveBeenCalledExactlyOnceWith({ apply: true, problems: false });
  });

  it("runs only the calendar asked for", async () => {
    await execute({ calendars: ["services"], apply: false, problems: true });
    expect(syncEvents).not.toHaveBeenCalled();
    expect(syncServices).toHaveBeenCalledExactlyOnceWith({ apply: false, problems: true });
  });

  it("goes on to the next calendar after a failed one, then fails with each reason", async () => {
    vi.mocked(syncEvents).mockRejectedValue(new Error("HTTP 403"));
    vi.mocked(syncServices).mockRejectedValue(new Error("2 calendar changes failed"));
    await expect(execute({ calendars: ["events", "services"], apply: true, problems: false })).rejects.toThrow(
      "HTTP 403; 2 calendar changes failed",
    );
    expect(syncServices).toHaveBeenCalledOnce();
  });
});
