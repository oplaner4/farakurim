import { describe, expect, it } from "vitest";
import { places } from "@/content/masses";
import type { GoogleEvent } from "@/lib/calendar/google-calendar";
import { isOwned, planServices } from "./services-plan";
import { SERVICES_URL, serviceEventId, type DesiredService } from "./services-desired";

const NOW = new Date("2026-10-24T08:00:00Z");
const DESCRIPTION = `Pořad bohoslužeb: ${SERVICES_URL}`;

/** The desired Mass in Kuřim at `time` (a Prague hour) on `date`. */
const service = (date: string, hour: number, place: "kurim" | "moravske-kninice" = "kurim"): DesiredService => {
  const time = `${hour}:00`;
  const at = (h: number) => ({
    dateTime: `${date}T${String(h).padStart(2, "0")}:00:00+01:00`,
    timeZone: "Europe/Prague",
  });
  return {
    googleId: serviceEventId(date, time, place),
    date,
    time,
    place,
    status: "regular",
    body: {
      summary: `Mše svatá ${places[place].locative}`,
      location: places[place].address,
      description: DESCRIPTION,
      start: at(hour),
      end: at(hour + 1),
    },
  };
};

/** The Google event the sync writes for `desired`. */
const written = (desired: DesiredService, fields: Partial<GoogleEvent> = {}): GoogleEvent => ({
  id: desired.googleId,
  ...desired.body,
  start: { dateTime: desired.body.start.dateTime },
  end: { dateTime: desired.body.end.dateTime },
  ...fields,
});

const hand = (id: string, hour: number, fields: Partial<GoogleEvent> = {}): GoogleEvent => ({
  id,
  summary: "Mše svatá",
  start: { dateTime: `2026-10-25T${String(hour).padStart(2, "0")}:00:00+01:00` },
  end: { dateTime: `2026-10-25T${String(hour + 1).padStart(2, "0")}:00:00+01:00` },
  ...fields,
});

const sunday = service("2026-10-25", 9);

describe("isOwned", () => {
  it("finds the marker in plain text and in an HTML description", () => {
    const e = written(sunday);
    expect(isOwned(e)).toBe(true);
    expect(isOwned({ ...e, description: `<a href="${SERVICES_URL}">Pořad bohoslužeb</a>` })).toBe(true);
    expect(isOwned({ ...e, description: "Něco jiného" })).toBe(false);
    expect(isOwned({ ...e, description: undefined })).toBe(false);
  });
});

describe("planServices", () => {
  it("changes nothing for an owned event in line, even in another offset", () => {
    const e = written(sunday, {
      start: { dateTime: "2026-10-25T08:00:00Z" },
      end: { dateTime: "2026-10-25T09:00:00Z" },
    });
    expect(planServices([sunday], [e], NOW)).toEqual({ changes: [], reports: [] });
  });

  it("updates the start and end of an owned event with another start", () => {
    const e = written(sunday, {
      start: { dateTime: "2026-10-25T10:00:00+01:00" },
      end: { dateTime: "2026-10-25T11:00:00+01:00" },
    });
    const { changes } = planServices([sunday], [e], NOW);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ kind: "update", claim: false, fields: ["start", "end"], target: e });
  });

  it("adds a service no event holds", () => {
    expect(planServices([sunday], [], NOW)).toEqual({ changes: [{ kind: "add", desired: sunday }], reports: [] });
  });

  it("restores a service deleted by hand", () => {
    const e: GoogleEvent = { id: sunday.googleId, status: "cancelled", start: {}, end: {} };
    expect(planServices([sunday], [e], NOW).changes).toEqual([{ kind: "restore", desired: sunday, target: e }]);
  });

  it("deletes an owned event no service wants after now, and leaves one before now", () => {
    const later = written(service("2026-10-26", 18));
    const earlier = written(service("2026-10-20", 18));
    const { changes } = planServices([sunday], [later, earlier, written(sunday)], NOW);
    expect(changes).toEqual([{ kind: "delete", target: later }]);
  });

  it("matches an owned event with another id by date, start and church", () => {
    const e = written(sunday, { id: "claimedbefore", summary: "Mše svatá" });
    const { changes } = planServices([sunday], [e], NOW);
    expect(changes[0]).toMatchObject({ kind: "update", claim: false, fields: ["summary"], target: e });
  });

  it("claims the only unmarked single event at the time naming the church", () => {
    const e = hand("manual", 9, { location: "Kostel sv. Maří Magdalény, Kuřim", summary: "Modlitba" });
    const { changes, reports } = planServices([sunday], [e], NOW);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ kind: "update", claim: true, target: e });
    expect(changes[0].kind === "update" && changes[0].fields).toContain("description");
    expect(reports).toEqual([]);
  });

  it("claims an event by its title when it has no location", () => {
    const knin = service("2026-10-25", 11, "moravske-kninice");
    const e = hand("manual", 11, { summary: "Mše svatá v Moravských Knínicích" });
    expect(planServices([knin], [e], NOW).changes[0]).toMatchObject({ kind: "update", claim: true, target: e });
  });

  it("adds and reports when two unmarked single events could be claimed", () => {
    const a = hand("a", 9, { location: "Kuřim" });
    const b = hand("b", 9, { location: "Kuřim" });
    expect(planServices([sunday], [a, b], NOW)).toEqual({
      changes: [{ kind: "add", desired: sunday }],
      reports: [{ kind: "duplicate", desired: sunday, events: [a, b] }],
    });
  });

  it("never claims an occurrence of a repeating event: adds and reports", () => {
    const e = hand("occurrence", 9, { location: "Kuřim", recurringEventId: "series" });
    expect(planServices([sunday], [e], NOW)).toEqual({
      changes: [{ kind: "add", desired: sunday }],
      reports: [{ kind: "duplicate", desired: sunday, events: [e] }],
    });
  });

  it("reports a repeating occurrence beside a claimed single event", () => {
    const single = hand("single", 9, { location: "Kuřim" });
    const occurrence = hand("occurrence", 9, { location: "Kuřim", recurringEventId: "series" });
    const plan = planServices([sunday], [single, occurrence], NOW);
    expect(plan.changes[0]).toMatchObject({ kind: "update", claim: true, target: single });
    expect(plan.reports).toEqual([{ kind: "duplicate", desired: sunday, events: [occurrence] }]);
  });

  it("leaves an unmarked event at another time alone, without a report", () => {
    const e = hand("other", 15, { location: "Kuřim" });
    expect(planServices([sunday], [e], NOW)).toEqual({ changes: [{ kind: "add", desired: sunday }], reports: [] });
  });

  it("ignores a cancelled unmarked event", () => {
    const e = hand("gone", 9, { location: "Kuřim", status: "cancelled" });
    expect(planServices([sunday], [e], NOW)).toEqual({ changes: [{ kind: "add", desired: sunday }], reports: [] });
  });

  it("claims an event once", () => {
    const twin: DesiredService = { ...service("2026-10-25", 9), googleId: "twin" };
    const e = hand("manual", 9, { location: "Kuřim" });
    const { changes } = planServices([sunday, twin], [e], NOW);
    expect(changes.map((c) => c.kind)).toEqual(["update", "add"]);
  });

  it("reports an unmarked repeating occurrence beside an owned event", () => {
    const owned = written(sunday);
    const occurrence = hand("occurrence", 9, { location: "Kuřim", recurringEventId: "series" });
    expect(planServices([sunday], [owned, occurrence], NOW)).toEqual({
      changes: [],
      reports: [{ kind: "duplicate", desired: sunday, events: [occurrence] }],
    });
  });

  it("reports an unmarked single event beside a restored one", () => {
    const gone: GoogleEvent = { id: sunday.googleId, status: "cancelled", start: {}, end: {} };
    const single = hand("single", 9, { location: "Kuřim" });
    const plan = planServices([sunday], [gone, single], NOW);
    expect(plan.changes).toEqual([{ kind: "restore", desired: sunday, target: gone }]);
    expect(plan.reports).toEqual([{ kind: "duplicate", desired: sunday, events: [single] }]);
  });

  it("does not take the villages' postal address for Kuřim", () => {
    const knin = service("2026-10-25", 9, "moravske-kninice");
    for (const location of [
      "Kostel svaté Markéty, 386, 664 34 Moravské Knínice-Kuřim, Česko",
      places.jinacovice.address,
    ]) {
      const e = hand("village", 9, { location });
      expect(planServices([sunday], [e], NOW)).toEqual({ changes: [{ kind: "add", desired: sunday }], reports: [] });
    }
    const e = hand("village", 9, { location: "Kostel svaté Markéty, 386, 664 34 Moravské Knínice-Kuřim, Česko" });
    expect(planServices([knin], [e], NOW).changes[0]).toMatchObject({ kind: "update", claim: true, target: e });
  });

  it("claims an unmarked event holding the desired id", () => {
    const e = written(sunday, { description: "Ručně", summary: "Mše" });
    const { changes } = planServices([sunday], [e], NOW);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ kind: "update", claim: true, target: e });
    expect(changes[0].kind === "update" && changes[0].fields).toEqual(["summary", "description"]);
  });
});
