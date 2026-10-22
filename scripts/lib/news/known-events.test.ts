import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newsEvent } from "@/test/fixtures";
import { freshTempDir } from "../test-helpers";
import { eventsAt, openEventPulls, pullEvents, takenIds, upcomingEvents, type KnownEvent } from "./known-events";

const repo = "oplaner4/farakurim";

describe("upcomingEvents", () => {
  it("keeps what has not ended, long-term events without an end too", () => {
    const events = [
      newsEvent({ id: "vcera", start: "2026-10-21" }),
      newsEvent({ id: "dnes", start: "2026-10-22", startTime: "18:00" }),
      newsEvent({ id: "tyden", start: "2026-10-20", end: "2026-10-25" }),
      newsEvent({ id: "trvale", start: "2025-09-01", longTerm: { weeklyAt: "18:30" } }),
    ];
    expect(upcomingEvents(events, "2026-10-22")).toEqual([
      {
        id: "dnes",
        title: "Hody v České",
        start: "2026-10-22",
        startTime: "18:00",
        place: "Česká, náves",
        where: "main",
      },
      {
        id: "tyden",
        title: "Hody v České",
        start: "2026-10-20",
        end: "2026-10-25",
        place: "Česká, náves",
        where: "main",
      },
      { id: "trvale", title: "Hody v České", start: "2025-09-01", place: "Česká, náves", where: "main" },
    ]);
  });
});

describe("pullEvents", () => {
  it("lists the records a PR adds or changes, with its number", () => {
    const base = [newsEvent({ id: "a" }), newsEvent({ id: "b" })];
    const branch = [newsEvent({ id: "a" }), newsEvent({ id: "b", place: "Kuřim" }), newsEvent({ id: "c" })];
    expect(pullEvents(base, branch, 12).map((e) => [e.id, e.where])).toEqual([
      ["b", 12],
      ["c", 12],
    ]);
  });
});

describe("eventsAt", () => {
  const dir = freshTempDir("known-events");
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args], {
      cwd: dir(),
      stdio: "pipe",
    });

  it("reads every month file at a ref", () => {
    git("init", "-q");
    const month = join(dir(), "src/content/news/2026");
    mkdirSync(month, { recursive: true });
    writeFileSync(join(month, "11.json"), JSON.stringify([newsEvent({ id: "a", start: "2026-11-01" })]));
    writeFileSync(join(month, "12.json"), JSON.stringify([newsEvent({ id: "b", start: "2026-12-01" })]));
    git("add", "-A");
    git("commit", "--no-verify", "-q", "-m", "x");
    expect(eventsAt("HEAD", dir()).map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("openEventPulls", () => {
  it("lists this repo's open events PRs only", async () => {
    const pull = (number: number, ref: string, fullName: string | null) => ({
      number,
      head: { ref, repo: fullName ? { full_name: fullName } : null },
    });
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify([
          pull(12, "events/2026-10-22", repo),
          pull(13, "events/x", "someone/farakurim"),
          pull(14, "service-sheet/2026-10-19", repo),
          pull(15, "events/2026-10-23", null),
        ]),
      )) as unknown as typeof fetch;
    expect(await openEventPulls(repo, "t0k", fetchImpl)).toEqual([{ number: 12, branch: "events/2026-10-22" }]);
  });
});

describe("takenIds", () => {
  it("names the added ids an open PR holds", () => {
    const known: KnownEvent[] = [
      { id: "koncert-2026", title: "Koncert", start: "2026-11-15", place: "Kuřim", where: 12 },
      { id: "hody-v-ceske", title: "Hody v České", start: "2026-10-18", place: "Česká", where: "main" },
    ];
    expect(takenIds(known, ["koncert-2026", "pout-2026", "hody-v-ceske"])).toEqual(["koncert-2026"]);
  });
});
