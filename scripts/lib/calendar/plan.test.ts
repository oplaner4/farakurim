import { describe, expect, it } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import type { GoogleEvent } from "@/lib/calendar/google-calendar";
import { calendarEventId } from "./desired";
import { planSync } from "./plan";
import type { CalendarSnapshot } from "./read";

const TODAY = "2026-10-01";
const URL_OF = "https://farakurim.cz/aktuality/adoracni-den-2026/";
const DESCRIPTION = `Adorační den naší farnosti.\n\n${URL_OF}`;
const PLACE = "Kuřim, kostel sv. Maří Magdalény";

const testEvent = (fields: Partial<NewsEvent> = {}): NewsEvent => ({
  id: "adoracni-den-2026",
  title: "Adorační den kuřimské farnosti",
  start: "2026-10-12",
  startTime: "13:00",
  endTime: "18:00",
  place: PLACE,
  text: "Adorační den naší farnosti.",
  ...fields,
});

/** A timed Události event on `date`, 13:00–18:00. */
const google = (id: string, date: string, summary: string, description?: string): GoogleEvent => ({
  id,
  summary,
  description,
  start: { dateTime: `${date}T13:00:00+02:00` },
  end: { dateTime: `${date}T18:00:00+02:00` },
});

/** The Události event the sync would write for `testEvent()` on `date`. */
const linked = (id: string, date: string): GoogleEvent => ({
  ...google(id, date, "Adorační den kuřimské farnosti", DESCRIPTION),
  location: PLACE,
});

const snapshot = (instances: GoogleEvent[], masters: GoogleEvent[] = []): CalendarSnapshot => ({ instances, masters });

const series = testEvent({
  start: "2026-10-05",
  end: "2026-10-19",
  sessions: ["2026-10-05", "2026-10-12", "2026-10-19"],
});

const weekly = testEvent({
  id: "obnova",
  title: "Obnova v Duchu svatém",
  start: "2026-10-01",
  end: "2027-04-29",
  startTime: undefined,
  endTime: undefined,
  place: undefined,
  text: "Obnova.",
  longTerm: { weeklyAt: "18:30" },
});

/** A repeating Události event from 1 October 2026, weekly at 18:30–20:00. */
const master = (id: string, description?: string, until = "20270429T215900Z"): GoogleEvent => ({
  id,
  summary: "Obnova v Duchu svatém",
  description,
  start: { dateTime: "2026-10-01T18:30:00+02:00" },
  end: { dateTime: "2026-10-01T20:00:00+02:00" },
  recurrence: [`RRULE:FREQ=WEEKLY;UNTIL=${until}`],
});

describe("planSync", () => {
  it("changes nothing for an owned event in line", () => {
    expect(planSync([testEvent()], snapshot([linked("a", "2026-10-12")]), TODAY)).toEqual({ changes: [], reports: [] });
  });

  it("updates the times of an owned event", () => {
    const moved = {
      ...linked("a", "2026-10-12"),
      start: { dateTime: "2026-10-12T14:00:00+02:00" },
      end: { dateTime: "2026-10-12T19:00:00+02:00" },
    };
    const { changes } = planSync([testEvent()], snapshot([moved]), TODAY);
    expect(changes).toEqual([
      expect.objectContaining({
        kind: "update",
        claim: false,
        target: moved,
        fields: ["start", "end"],
        body: {
          start: { dateTime: "2026-10-12T13:00:00+02:00", timeZone: "Europe/Prague" },
          end: { dateTime: "2026-10-12T18:00:00+02:00", timeZone: "Europe/Prague" },
        },
      }),
    ]);
  });

  it("compares times as instants", () => {
    const utc = {
      ...linked("a", "2026-10-12"),
      start: { dateTime: "2026-10-12T11:00:00Z" },
      end: { dateTime: "2026-10-12T16:00:00Z" },
    };
    expect(planSync([testEvent()], snapshot([utc]), TODAY).changes).toEqual([]);
  });

  it("finds an owned event by an HTML link in its description", () => {
    const html = {
      ...linked("a", "2026-10-12"),
      description: `<p>Zveme.</p><a href="${URL_OF}">${URL_OF}</a>`,
    };
    const { changes, reports } = planSync([testEvent()], snapshot([html]), TODAY);
    expect(changes).toEqual([expect.objectContaining({ kind: "update", claim: false, fields: ["description"] })]);
    expect(reports).toEqual([]);
  });

  it("clears the place of an owned event when the record has none", () => {
    const { changes } = planSync([testEvent({ place: undefined })], snapshot([linked("a", "2026-10-12")]), TODAY);
    expect(changes).toEqual([expect.objectContaining({ fields: ["location"], body: { location: "" } })]);
  });

  it("keeps the end of an owned event when the meeting has no end time", () => {
    const record = testEvent({ endTime: undefined });
    expect(planSync([record], snapshot([linked("a", "2026-10-12")]), TODAY).changes).toEqual([]);
  });

  it('prefixes "Zrušeno: " on the owned event of a cancelled record', () => {
    const record = testEvent({ change: { status: "cancelled" } });
    const { changes } = planSync([record], snapshot([linked("a", "2026-10-12")]), TODAY);
    expect(changes).toEqual([
      expect.objectContaining({
        kind: "update",
        fields: ["summary"],
        body: { summary: "Zrušeno: Adorační den kuřimské farnosti" },
      }),
    ]);
  });

  it("adds nothing for a cancelled record without a calendar event", () => {
    const record = testEvent({ change: { status: "cancelled" } });
    expect(planSync([record], snapshot([]), TODAY)).toEqual({ changes: [], reports: [] });
  });

  it("claims the one free event with a matching title that day", () => {
    const free = google("b", "2026-10-12", "Adorační den");
    const { changes, reports } = planSync([testEvent()], snapshot([free]), TODAY);
    expect(reports).toEqual([]);
    expect(changes).toEqual([expect.objectContaining({ kind: "update", claim: true, target: free })]);
    const [change] = changes;
    expect(change.kind === "update" && change.fields).toContain("description");
    expect(change.body.description).toBe(DESCRIPTION);
  });

  it("asks when two free events that day match the title", () => {
    const first = google("b", "2026-10-12", "Adorační den");
    const second = google("c", "2026-10-12", "Adorace – adorační den farnosti");
    const { changes, reports } = planSync([testEvent()], snapshot([first, second]), TODAY);
    expect(changes).toEqual([]);
    expect(reports).toEqual([expect.objectContaining({ kind: "ask", candidates: [first, second] })]);
  });

  it("adds an event when the free event that day has another title", () => {
    const { changes, reports } = planSync([testEvent()], snapshot([google("b", "2026-10-12", "Schola")]), TODAY);
    expect(reports).toEqual([]);
    expect(changes).toEqual([
      expect.objectContaining({
        kind: "add",
        desired: expect.objectContaining({ googleId: calendarEventId("adoracni-den-2026", "2026-10-12") }),
        body: expect.objectContaining({ summary: "Adorační den kuřimské farnosti", description: DESCRIPTION }),
      }),
    ]);
  });

  it("asks when a free event with a matching title is on another day", () => {
    const elsewhere = google("b", "2026-10-05", "Adorační den");
    const { changes, reports } = planSync([testEvent()], snapshot([elsewhere]), TODAY);
    expect(changes).toEqual([]);
    expect(reports).toEqual([expect.objectContaining({ kind: "ask", candidates: [elsewhere] })]);
  });

  it("leaves out a past free event with a matching title in the meeting's year", () => {
    const past = google("b", "2026-09-05", "Adorační den");
    const { changes, reports } = planSync([testEvent()], snapshot([past]), TODAY);
    expect(reports).toEqual([]);
    expect(changes).toEqual([expect.objectContaining({ kind: "add" })]);
  });

  it("claims a free event on the day before the move of a moved record", () => {
    const record = testEvent({ start: "2026-10-19", change: { status: "moved", previousStart: "2026-10-12" } });
    const old = google("b", "2026-10-12", "Adorační den");
    const { changes, reports } = planSync([record], snapshot([old]), TODAY);
    expect(reports).toEqual([]);
    expect(changes).toEqual([expect.objectContaining({ kind: "update", claim: true, target: old })]);
    expect(changes[0].body.start).toEqual({ dateTime: "2026-10-19T13:00:00+02:00", timeZone: "Europe/Prague" });
  });

  it("follows the URL of a moved record to its old day", () => {
    const record = testEvent({ start: "2026-10-19", change: { status: "moved", previousStart: "2026-10-12" } });
    const { changes } = planSync([record], snapshot([linked("a", "2026-10-12")]), TODAY);
    expect(changes).toEqual([expect.objectContaining({ kind: "update", claim: false, fields: ["start", "end"] })]);
  });

  it("lets only the first of two records claim the same free event", () => {
    const youth = testEvent({ id: "adoracni-den-mladeze", title: "Adorační den mládeže" });
    const free = google("b", "2026-10-12", "Adorační den");
    const { changes, reports } = planSync([testEvent(), youth], snapshot([free]), TODAY);
    expect(changes).toEqual([
      expect.objectContaining({
        kind: "update",
        claim: true,
        desired: expect.objectContaining({ newsId: "adoracni-den-2026" }),
      }),
    ]);
    expect(reports).toEqual([
      expect.objectContaining({
        kind: "ask",
        desired: expect.objectContaining({ newsId: "adoracni-den-mladeze" }),
        candidates: [free],
      }),
    ]);
  });

  it("ignores a cancelled Google occurrence with the record's title", () => {
    const deleted = {
      ...google("b", "2026-10-12", "Adorační den kuřimské farnosti", DESCRIPTION),
      status: "cancelled",
    };
    const { changes, reports } = planSync([testEvent()], snapshot([deleted]), TODAY);
    expect(reports).toEqual([]);
    expect(changes).toEqual([expect.objectContaining({ kind: "add" })]);
  });

  it("reports the sync's own event deleted by hand and does not add it again", () => {
    const deleted: GoogleEvent = {
      id: calendarEventId("adoracni-den-2026", "2026-10-12"),
      status: "cancelled",
      start: {},
      end: {},
    };
    const { changes, reports } = planSync([testEvent()], snapshot([deleted]), TODAY);
    expect(changes).toEqual([]);
    expect(reports).toEqual([
      expect.objectContaining({ kind: "deleted", desired: expect.objectContaining({ key: "2026-10-12" }) }),
    ]);
  });

  it("reports a weekly event the sync added and someone deleted, and does not add it again", () => {
    const deleted: GoogleEvent = {
      id: calendarEventId(weekly.id, "weekly"),
      status: "cancelled",
      start: {},
      end: {},
    };
    const { changes, reports } = planSync([weekly], snapshot([], [deleted]), TODAY);
    expect(changes).toEqual([]);
    expect(reports).toEqual([
      expect.objectContaining({ kind: "deleted", desired: expect.objectContaining({ key: "weekly" }) }),
    ]);
  });

  it("pairs a series' owned events by date and adds the meeting without one", () => {
    const owned = [linked("a", "2026-10-05"), linked("b", "2026-10-12")];
    const { changes, reports } = planSync([series], snapshot(owned), TODAY);
    expect(reports).toEqual([]);
    expect(changes).toEqual([
      expect.objectContaining({ kind: "add", desired: expect.objectContaining({ key: "2026-10-19" }) }),
    ]);
  });

  it("reports a series whose leftover owned events cannot be paired", () => {
    const unknown = [linked("c", "2026-10-06"), linked("d", "2026-10-07")];
    const owned = [linked("a", "2026-10-05"), linked("b", "2026-10-12"), ...unknown];
    const { changes, reports } = planSync([series], snapshot(owned), TODAY);
    expect(changes).toEqual([]);
    expect(reports).toEqual([
      { kind: "unpaired", newsId: "adoracni-den-2026", meetings: ["2026-10-19"], events: unknown },
    ]);
  });

  it("pairs one leftover owned event with one leftover meeting", () => {
    const owned = [linked("a", "2026-10-05"), linked("b", "2026-10-12"), linked("c", "2026-10-20")];
    const { changes, reports } = planSync([series], snapshot(owned), TODAY);
    expect(reports).toEqual([]);
    expect(changes).toEqual([
      expect.objectContaining({ kind: "update", claim: false, target: owned[2], fields: ["start", "end"] }),
    ]);
  });

  it("reports an owned event of a meeting no longer in the record as an orphan", () => {
    const owned = [linked("a", "2026-10-05"), linked("b", "2026-10-12"), linked("c", "2026-10-19")];
    const extra = linked("d", "2026-10-26");
    const { changes, reports } = planSync([series], snapshot([...owned, extra]), TODAY);
    expect(changes).toEqual([]);
    expect(reports).toEqual([{ kind: "orphan", path: "/aktuality/adoracni-den-2026/", event: extra }]);
  });

  it("leaves the owned event of a past meeting of a series alone", () => {
    const owned = [linked("a", "2026-10-05"), linked("b", "2026-10-12"), linked("c", "2026-10-19")];
    expect(planSync([series], snapshot(owned), "2026-10-10")).toEqual({ changes: [], reports: [] });
  });

  it("adds a meeting of a series whose only matches are claimed by its other meetings", () => {
    const free = [google("b", "2026-10-12", "Adorační den"), google("c", "2026-10-19", "Adorační den")];
    const { changes, reports } = planSync([series], snapshot(free), TODAY);
    expect(reports).toEqual([]);
    expect(changes).toEqual([
      expect.objectContaining({ kind: "update", claim: true, target: free[0] }),
      expect.objectContaining({ kind: "update", claim: true, target: free[1] }),
      expect.objectContaining({ kind: "add", desired: expect.objectContaining({ key: "2026-10-05" }) }),
    ]);
  });

  it("adds a record whose only match elsewhere a later record claims on its own day", () => {
    const youth = testEvent({ id: "adoracni-den-mladeze", title: "Adorační den mládeže", start: "2026-10-19" });
    const free = google("b", "2026-10-19", "Adorační den");
    const { changes, reports } = planSync([testEvent(), youth], snapshot([free]), TODAY);
    expect(reports).toEqual([]);
    expect(changes).toEqual([
      expect.objectContaining({
        kind: "update",
        claim: true,
        desired: expect.objectContaining({ newsId: "adoracni-den-mladeze" }),
      }),
      expect.objectContaining({ kind: "add", desired: expect.objectContaining({ newsId: "adoracni-den-2026" }) }),
    ]);
  });

  it("looks for a matching event elsewhere only in the meeting's year", () => {
    const nextYear = google("b", "2027-01-10", "Adorační den");
    const { changes, reports } = planSync([testEvent()], snapshot([nextYear]), TODAY);
    expect(reports).toEqual([]);
    expect(changes).toEqual([expect.objectContaining({ kind: "add" })]);
  });

  it("pairs a leftover owned event from before today with a leftover meeting of a moved record", () => {
    const record = testEvent({ start: "2026-10-19", change: { status: "moved", previousStart: "2026-10-05" } });
    const past = linked("a", "2026-10-05");
    const { changes, reports } = planSync([record], snapshot([past]), "2026-10-10");
    expect(reports).toEqual([]);
    expect(changes).toEqual([
      expect.objectContaining({ kind: "update", claim: false, target: past, fields: ["start", "end"] }),
    ]);
  });

  it("leaves a leftover owned event from before today alone when the record was not moved", () => {
    const record = testEvent({ start: "2026-10-19" });
    const { changes, reports } = planSync([record], snapshot([linked("a", "2026-10-05")]), "2026-10-10");
    expect(reports).toEqual([]);
    expect(changes).toEqual([
      expect.objectContaining({ kind: "add", desired: expect.objectContaining({ key: "2026-10-19" }) }),
    ]);
  });

  it("reports the sync's own event of a moved record deleted by hand and does not add it again", () => {
    const record = testEvent({ start: "2026-10-19", change: { status: "moved", previousStart: "2026-10-12" } });
    const deleted: GoogleEvent = {
      id: calendarEventId("adoracni-den-2026", "2026-10-12"),
      status: "cancelled",
      start: {},
      end: {},
    };
    const { changes, reports } = planSync([record], snapshot([deleted]), TODAY);
    expect(changes).toEqual([]);
    expect(reports).toEqual([
      expect.objectContaining({ kind: "deleted", desired: expect.objectContaining({ key: "2026-10-19" }) }),
    ]);
  });

  it("does not take the deleted event of a past meeting of a series for another meeting's", () => {
    const deleted: GoogleEvent = {
      id: calendarEventId("adoracni-den-2026", "2026-10-05"),
      status: "cancelled",
      start: {},
      end: {},
    };
    const { changes, reports } = planSync([series], snapshot([deleted]), "2026-10-10");
    expect(reports).toEqual([]);
    expect(changes).toEqual([
      expect.objectContaining({ kind: "add", desired: expect.objectContaining({ key: "2026-10-12" }) }),
      expect.objectContaining({ kind: "add", desired: expect.objectContaining({ key: "2026-10-19" }) }),
    ]);
  });

  it("reports a second owned repeating event as an orphan although it started before today", () => {
    const url = "Obnova.\n\nhttps://farakurim.cz/aktuality/obnova/";
    const old = {
      ...master("old", url),
      start: { dateTime: "2026-09-03T18:30:00+02:00" },
      end: { dateTime: "2026-09-03T20:00:00+02:00" },
    };
    const { changes, reports } = planSync([weekly], snapshot([], [master("m", url), old]), TODAY);
    expect(changes).toEqual([]);
    expect(reports).toEqual([{ kind: "orphan", path: "/aktuality/obnova/", event: old }]);
  });

  it("claims a free repeating event starting on a weekly record's start", () => {
    const free = master("m");
    const { changes, reports } = planSync([weekly], snapshot([], [free]), TODAY);
    expect(reports).toEqual([]);
    expect(changes).toEqual([expect.objectContaining({ kind: "update", claim: true, target: free })]);
    const [change] = changes;
    expect(change.kind === "update" && change.fields).toEqual(["description"]);
  });

  it("updates the rule of an owned repeating event when the record's end changes", () => {
    const owned = master("m", "Obnova.\n\nhttps://farakurim.cz/aktuality/obnova/", "20270331T215900Z");
    const { changes } = planSync([weekly], snapshot([], [owned]), TODAY);
    expect(changes).toEqual([
      expect.objectContaining({
        kind: "update",
        claim: false,
        fields: ["recurrence"],
        body: { recurrence: ["RRULE:FREQ=WEEKLY;UNTIL=20270429T215900Z"] },
      }),
    ]);
  });

  it("reports a future event linking a page no record has as an orphan, a past one not", () => {
    const gone = (id: string, date: string) =>
      google(id, date, "Pouť", "Pouť.\n\nhttps://farakurim.cz/aktuality/pout-2026/");
    const future = gone("a", "2026-10-20");
    const { reports } = planSync([], snapshot([future, gone("b", "2026-09-20")]), TODAY);
    expect(reports).toEqual([{ kind: "orphan", path: "/aktuality/pout-2026/", event: future }]);
  });

  it("changes nothing for a record whose meetings are all over", () => {
    const past = testEvent({ start: "2026-09-12" });
    const events = [google("b", "2026-09-12", "Adorační den"), google("c", "2026-09-05", "Adorační den")];
    expect(planSync([past], snapshot(events), TODAY)).toEqual({ changes: [], reports: [] });
  });
});
