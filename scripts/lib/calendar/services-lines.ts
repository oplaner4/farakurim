import { eventDays, type GoogleEvent } from "@/lib/calendar/google-calendar";
import type { DesiredService } from "./services-desired";
import { fieldNames } from "./lines";
import type { ServicesChange, ServicesPlan, ServicesReport } from "./services-plan";

// The lines the Bohoslužby sync prints: one per change (the adds of a date share one) and per report, in English,
// quoting Czech titles as they are.

type Entry = { date: string; text: string };

const quoted = (summary: string | undefined) => `"${summary ?? ""}"`;

const slot = (service: DesiredService) => `${service.time} ${quoted(service.body.summary)}`;

/** An event's start time as "8:00", its day as "2026-10-13". */
const eventSlot = (event: GoogleEvent) => {
  const days = eventDays(event);
  return { date: days?.date ?? "an unknown day", slot: `${days?.time ?? "?"} ${quoted(event.summary)}` };
};

const isRepeating = (event: GoogleEvent) => Boolean(event.recurringEventId || event.recurrence);

/** The text of a change that is not an add, without the failure of its write. */
function changeEntry(change: Exclude<ServicesChange, { kind: "add" }>, apply: boolean): Entry {
  const did = (verb: string, done: string) => (apply ? done : verb);
  switch (change.kind) {
    case "update": {
      const { slot: target } = eventSlot(change.target);
      const fields = fieldNames(change.fields);
      return {
        date: change.desired.date,
        text: change.claim
          ? `${did("claim", "claimed")} ${target} and ${did("update", "updated")} its ${fields}`
          : `${did("update", "updated")} ${target}: ${fields}`,
      };
    }
    case "restore":
      return {
        date: change.desired.date,
        text: `${did("restore", "restored")} ${slot(change.desired)} (deleted by hand)`,
      };
    case "delete": {
      const { date, slot: target } = eventSlot(change.target);
      return { date, text: `${did("delete", "deleted")} ${target}` };
    }
  }
}

function reportEntry(report: ServicesReport): Entry {
  const events = report.events.map((event) => `${quoted(event.summary)}${isRepeating(event) ? " (repeating)" : ""}`);
  return {
    date: report.desired.date,
    text: `${slot(report.desired)} doubles ${events.join(", ")}: remove ${events.length > 1 ? "them" : "it"} by hand`,
  };
}

const startOf = (service: DesiredService) => Date.parse(service.body.start.dateTime ?? "");

const line = ({ date, text }: Entry) => `Bohoslužby, ${date}: ${text}`;

const byDate = (a: Entry, b: Entry) => a.date.localeCompare(b.date);

/**
 * The lines for `plan`: what would change (`apply` false) or changed, in date order, then the reports; failed writes
 * say why. The adds of a date that went through share a line, in time order; a failed one has a line of its own.
 */
export function servicesLines(
  plan: ServicesPlan,
  apply: boolean,
  failures: Map<ServicesChange, string> = new Map(),
): string[] {
  const failed = (change: ServicesChange, text: string) => {
    const failure = failures.get(change);
    return failure === undefined ? text : `${text} — failed: ${failure}`;
  };
  const grouped = new Map<string, DesiredService[]>();
  const single: Entry[] = [];
  for (const change of plan.changes) {
    if (change.kind === "add" && !failures.has(change)) {
      grouped.set(change.desired.date, [...(grouped.get(change.desired.date) ?? []), change.desired]);
      continue;
    }
    const entry =
      change.kind === "add"
        ? { date: change.desired.date, text: `${apply ? "added" : "add"} ${slot(change.desired)}` }
        : changeEntry(change, apply);
    single.push({ ...entry, text: failed(change, entry.text) });
  }
  const adds = [...grouped].map(([date, day]) => ({
    date,
    text: `${apply ? "added" : "add"} ${day
      .toSorted((a, b) => startOf(a) - startOf(b))
      .map(slot)
      .join(", ")}`,
  }));
  // The sort is stable: on one date the adds come first, then the other changes in the plan's order.
  const lines = [...adds, ...single].sort(byDate).map(line);
  const reports = plan.reports.map(reportEntry).sort(byDate).map(line);
  const all = [...lines, ...reports];
  return all.length > 0 ? all : ["Bohoslužby: nothing to do."];
}
