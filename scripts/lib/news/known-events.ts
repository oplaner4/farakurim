// The events a mailed event is checked against before it is added: the upcoming events on main and the events every
// open events/ PR of this repo adds or changes. The unattended parish-create-event run reads them to refuse a
// duplicate, and takenIds() refuses an id an open PR already holds (add-event refuses one main holds).

import { execFileSync } from "node:child_process";
import type { NewsEvent } from "@/content/types/news";
import { gitHubGet } from "../github";
import { notEndedBy } from "./upcoming-events";

/** An event as the duplicate check needs it; `where` is main or the number of the open PR that adds it. */
export type KnownEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  startTime?: string;
  place: string;
  where: "main" | number;
};

/** The branch prefix of the events PRs (KINDS.events.prefix of the content release). */
const EVENTS_BRANCH = "events/";

/** A month file of the news folder in the repo: "src/content/news/2026/11.json". */
const MONTH_FILE = /^src\/content\/news\/\d{4}\/\d{2}\.json$/;

const known = (event: NewsEvent, where: KnownEvent["where"]): KnownEvent => {
  const { id, title, start, end, startTime, place } = event;
  return { id, title, start, ...(end && { end }), ...(startTime && { startTime }), place: place ?? "", where };
};

/** The events of `events` that have not ended by `today` (a long-term event without an end never has). */
export function upcomingEvents(events: NewsEvent[], today: string): KnownEvent[] {
  return notEndedBy(events, today).map((event) => known(event, "main"));
}

/** The records `branch` adds to `base` or changes in it, as the PR `number`'s. */
export function pullEvents(base: NewsEvent[], branch: NewsEvent[], number: number): KnownEvent[] {
  const before = new Map(base.map((event) => [event.id, JSON.stringify(event)]));
  return branch.filter((event) => before.get(event.id) !== JSON.stringify(event)).map((event) => known(event, number));
}

/** `events` as a JSON array with one event per line: compact for the unattended run, which reads it all. */
export const knownJson = (events: KnownEvent[]) =>
  `[\n${events.map((event) => JSON.stringify(event)).join(",\n")}\n]\n`;

/** The added `ids` that an open PR already holds. */
export function takenIds(events: KnownEvent[], ids: string[]): string[] {
  const held = new Set(events.filter((event) => event.where !== "main").map((event) => event.id));
  return ids.filter((id) => held.has(id));
}

const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" });

/** Every event record of the news folder at the git `ref` of the repo in `cwd`. */
export function eventsAt(ref: string, cwd = process.cwd()): NewsEvent[] {
  return git(cwd, "ls-tree", "-r", "--name-only", ref, "--", "src/content/news")
    .split("\n")
    .filter((file) => MONTH_FILE.test(file))
    .flatMap((file) => JSON.parse(git(cwd, "show", `${ref}:${file}`)) as NewsEvent[]);
}

/** This repo's open PRs from an events/ branch (a fork's PR can carry any branch name). */
export async function openEventPulls(
  repo: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ number: number; branch: string }[]> {
  const pulls = await gitHubGet(
    repo,
    token,
    fetchImpl,
  )<
    {
      number: number;
      head: { ref: string; repo: { full_name: string } | null };
    }[]
  >("/pulls?state=open&per_page=100");
  return pulls
    .filter((pull) => pull.head.ref.startsWith(EVENTS_BRANCH) && pull.head.repo?.full_name === repo)
    .map((pull) => ({ number: pull.number, branch: pull.head.ref }));
}

/**
 * The known events: the upcoming events of origin/main and, for each open events PR, the records its branch adds or
 * changes since it left main (fetched from origin).
 */
export async function loadKnownEvents({
  repo,
  token,
  today,
  cwd = process.cwd(),
}: {
  repo: string;
  token: string;
  today: string;
  cwd?: string;
}): Promise<KnownEvent[]> {
  git(cwd, "fetch", "--quiet", "origin", "main");
  const found = upcomingEvents(eventsAt("origin/main", cwd), today);
  for (const { number, branch } of await openEventPulls(repo, token)) {
    git(cwd, "fetch", "--quiet", "origin", `${branch}:refs/remotes/origin/${branch}`);
    const base = git(cwd, "merge-base", "origin/main", `origin/${branch}`).trim();
    found.push(...pullEvents(eventsAt(base, cwd), eventsAt(`origin/${branch}`, cwd), number));
  }
  return found;
}

/** The ids of the news folder in the working tree of `cwd` that its HEAD does not have. */
export function addedIds(working: NewsEvent[], cwd = process.cwd()): string[] {
  const before = new Set(eventsAt("HEAD", cwd).map((event) => event.id));
  return working.map((event) => event.id).filter((id) => !before.has(id));
}
