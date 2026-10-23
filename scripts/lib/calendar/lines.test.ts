import { describe, expect, it } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import type { GoogleEvent } from "@/lib/calendar/google-calendar";
import { desiredEvents, eventBody } from "./desired";
import { planLines } from "./lines";
import type { Change, Report, SyncPlan } from "./plan";

const TODAY = "2026-10-01";

const testEvent = (fields: Partial<NewsEvent> = {}): NewsEvent => ({
  id: "adoracni-den-2026",
  title: "Adorační den kuřimské farnosti",
  start: "2026-10-12",
  startTime: "13:00",
  endTime: "18:00",
  place: "Kuřim, kostel sv. Maří Magdalény",
  text: "Adorační den naší farnosti.",
  ...fields,
});

const [item] = desiredEvents(testEvent(), TODAY);
const [weeklyItem] = desiredEvents(
  testEvent({ id: "obnova", title: "Obnova", start: "2026-10-01", end: "2027-04-29", longTerm: { weeklyAt: "18:30" } }),
  TODAY,
);

const google = (id: string, date: string, summary: string): GoogleEvent => ({
  id,
  summary,
  start: { date },
  end: { date },
});

const add: Change = { kind: "add", desired: item, body: eventBody(item) };
const update = (claim: boolean, fields: Extract<Change, { kind: "update" }>["fields"]): Change => ({
  kind: "update",
  desired: item,
  target: google("a", "2026-10-12", "Adorace"),
  claim,
  fields,
  body: {},
});

const plan = (changes: Change[], reports: SyncPlan["reports"] = []): SyncPlan => ({ changes, reports });
const PREFIX = "Události, 2026-10-12: ";
const FIELDS = ["summary", "start", "end", "description"] as const;
const PAGE = "https://farakurim.cz/aktuality/adoracni-den-2026/";

describe("planLines", () => {
  it("says nothing to do for an empty plan", () => {
    expect(planLines(plan([]), false)).toEqual(["Události: nothing to do."]);
    expect(planLines(plan([]), true)).toEqual(["Události: nothing to do."]);
  });

  it("prints an add", () => {
    expect(planLines(plan([add]), false)).toEqual([`${PREFIX}Would add "Adorační den kuřimské farnosti"`]);
    expect(planLines(plan([add]), true)).toEqual([`${PREFIX}Added "Adorační den kuřimské farnosti"`]);
  });

  it("dates a weekly event from its start", () => {
    const weekly: Change = { kind: "add", desired: weeklyItem, body: eventBody(weeklyItem) };
    expect(planLines(plan([weekly]), false)).toEqual(['Události, weekly from 2026-10-01: Would add "Obnova"']);
  });

  it("prints an update with its fields named once each", () => {
    expect(planLines(plan([update(false, [...FIELDS])]), false)).toEqual([
      `${PREFIX}Would update "Adorace": title, time, description`,
    ]);
    expect(planLines(plan([update(false, [...FIELDS])]), true)).toEqual([
      `${PREFIX}Updated "Adorace": title, time, description`,
    ]);
  });

  it("prints a claim as a link", () => {
    expect(planLines(plan([update(true, [...FIELDS])]), false)).toEqual([
      `${PREFIX}Would link "Adorace" to /aktuality/adoracni-den-2026/ and update its title, time, description`,
    ]);
    expect(planLines(plan([update(true, [...FIELDS])]), true)).toEqual([
      `${PREFIX}Linked "Adorace" to /aktuality/adoracni-den-2026/ and updated its title, time, description`,
    ]);
  });

  it("names location and recurrence as place and repeat", () => {
    expect(planLines(plan([update(false, ["location", "recurrence"])]), false)).toEqual([
      `${PREFIX}Would update "Adorace": place, repeat`,
    ]);
  });

  it("prints the reports", () => {
    const a = google("a", "2026-10-12", "Adorace");
    const b = google("b", "2026-10-14", "Adorační den");
    expect(planLines(plan([], [{ kind: "ask", desired: item, candidates: [a, b] }]), false)).toEqual([
      `${PREFIX}ask: "Adorace" on 2026-10-12, "Adorační den" on 2026-10-14: paste ${PAGE} into its description if it is this event; until then nothing changes`,
    ]);
    const unpaired: Report = {
      kind: "unpaired",
      newsId: "adoracni-den-2026",
      meetings: ["2026-10-19", "2026-10-26"],
      events: [a, b],
    };
    expect(planLines(plan([], [unpaired]), false)).toEqual([
      'Události, 2026-10-19: cannot pair the meetings 2026-10-19, 2026-10-26 with "Adorace" on 2026-10-12, "Adorační den" on 2026-10-14: nothing changes',
    ]);
    expect(planLines(plan([], [{ kind: "orphan", path: "/aktuality/x/", event: a }]), false)).toEqual([
      'Události, 2026-10-12: "Adorace" on 2026-10-12 links /aktuality/x/, which no record has: left alone',
    ]);
    expect(planLines(plan([], [{ kind: "deleted", desired: item }]), false)).toEqual([
      `${PREFIX}"Adorační den kuřimské farnosti" was added by the site and deleted by hand: left alone`,
    ]);
  });

  it("follows a failed write with its message", () => {
    const failures = new Map([[add, "HTTP 403"]]);
    expect(planLines(plan([add, update(false, [...FIELDS])]), true, failures)).toEqual([
      `${PREFIX}Added "Adorační den kuřimské farnosti" — failed: HTTP 403`,
      `${PREFIX}Updated "Adorace": title, time, description`,
    ]);
  });
});
