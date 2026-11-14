import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { freshTempDir } from "../test-helpers/files";
import { sheetList } from "../test-helpers/reports";
import {
  commentNewerWeek,
  commentWriter,
  isStaged,
  newerWeekFromEnv,
  newerWeekMarker,
  newerWeekNote,
  type CommentWriter,
} from "./newer-week";

const NEWER = {
  week: { validFrom: "2026-11-08", validTo: "2026-11-15" },
  skipped: { validFrom: "2026-11-15", validTo: "2026-11-22" },
};
const ENV = { WEEK_FROM: "2026-11-08", WEEK_TO: "2026-11-15", SKIPPED_FROM: "2026-11-15", SKIPPED_TO: "2026-11-22" };
const HEAD = "The mail named the week 8.–15. 11. 2026; the DOCX's newest week, 15.–22. 11. 2026, was not handled:";

describe("newerWeekFromEnv", () => {
  it("reads both weeks, none unless all four are dates", () => {
    expect(newerWeekFromEnv(ENV)).toEqual(NEWER);
    expect(newerWeekFromEnv({ ...ENV, SKIPPED_TO: "" })).toBeUndefined();
    expect(newerWeekFromEnv({ ...ENV, WEEK_FROM: "8. 11. 2026" })).toBeUndefined();
    expect(newerWeekFromEnv({})).toBeUndefined();
  });
});

describe("isStaged", () => {
  const dir = freshTempDir("newer-week");

  it("finds the week in the checkout's service sheets, and counts a missing or broken file as not", () => {
    expect(isStaged(dir(), NEWER.skipped)).toBe(false);
    mkdirSync(join(dir(), "src/content"), { recursive: true });
    const file = join(dir(), "src/content/service-sheets.json");
    writeFileSync(file, sheetList(NEWER.week));
    expect(isStaged(dir(), NEWER.skipped)).toBe(false);
    writeFileSync(file, sheetList(NEWER.week, NEWER.skipped));
    expect(isStaged(dir(), NEWER.skipped)).toBe(true);
    writeFileSync(file, "{");
    expect(isStaged(dir(), NEWER.skipped)).toBe(false);
  });
});

describe("newerWeekNote", () => {
  it("says whether the newest week is staged, and that it is likely meant once the named week has ended", () => {
    expect(newerWeekNote(NEWER, true, "2026-11-20")).toBe(
      `${HEAD} it is already staged, and this DOCX's version of it was not checked.`,
    );
    expect(newerWeekNote(NEWER, false, "2026-11-15")).toBe(`${HEAD} it is not staged yet.`);
    expect(newerWeekNote(NEWER, false, "2026-11-16")).toBe(
      `${HEAD} it is not staged yet. The named week has ended, so the newest one is likely the one meant.`,
    );
  });
});

describe("commentNewerWeek", () => {
  /** A PR's comments in memory. */
  const fakeWriter = (bodies: string[] = []): CommentWriter & { bodies: () => Promise<string[]> } => ({
    bodies: async () => bodies,
    post: async (_pr, body) => {
      bodies.push(body);
    },
  });

  it("comments once per left-out week, its marker at the end", async () => {
    const writer = fakeWriter();
    expect(await commentNewerWeek(writer, 7, NEWER, false, "2026-11-12")).toBe(
      "Commented on 15.–22. 11. 2026 in PR #7.",
    );
    expect(await writer.bodies()).toEqual([`${HEAD} it is not staged yet.\n\n<!-- newer-week:2026-11-15 -->`]);
    expect(await commentNewerWeek(writer, 7, NEWER, false)).toBe("PR #7 already has the comment on 15.–22. 11. 2026.");
    // Another left-out week gets its own.
    const later = { ...NEWER, skipped: { validFrom: "2026-11-22", validTo: "2026-11-29" } };
    await commentNewerWeek(writer, 7, later, false);
    expect((await writer.bodies()).at(-1)).toContain(newerWeekMarker(later.skipped));
  });
});

describe("commentWriter", () => {
  it("reads every page of the PR's comments and posts a comment as JSON", async () => {
    const page = (count: number, body: string) => Array.from({ length: count }, (_, id) => ({ id, body }));
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") return new Response("{}", { status: 201 });
      const body = url.endsWith("&page=1") ? page(100, "a") : page(1, "b");
      return new Response(JSON.stringify(body));
    });
    const writer = commentWriter("o/r", "t", fetchMock as unknown as typeof fetch);
    const bodies = await writer.bodies(7);
    expect(bodies).toHaveLength(101);
    expect(bodies.at(-1)).toBe("b");
    await writer.post(7, "Hello");
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe("https://api.github.com/repos/o/r/issues/7/comments");
    expect(init).toMatchObject({ method: "POST", body: JSON.stringify({ body: "Hello" }) });
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer t");
  });

  it("throws on a failed request", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 403 }));
    const writer = commentWriter("o/r", "t", fetchMock as unknown as typeof fetch);
    await expect(writer.post(7, "x")).rejects.toThrow("GitHub /issues/7/comments: 403");
  });
});
