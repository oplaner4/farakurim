import { eventDays, type GoogleEvent } from "@/lib/calendar/google-calendar";
import { actionVerb } from "../command";
import type { DesiredEvent } from "./desired";
import type { BodyField, Change, Report, SyncPlan } from "./plan";

// The lines the calendar sync prints: one per change and per report, in English, quoting Czech titles as they are.

const FIELD_NAMES: Record<BodyField, string> = {
  summary: "title",
  start: "time",
  end: "time",
  location: "place",
  description: "description",
  recurrence: "repeat",
};

const fieldNames = (fields: BodyField[]) => [...new Set(fields.map((field) => FIELD_NAMES[field]))].join(", ");

const pagePath = (newsId: string) => `/aktuality/${newsId}/`;

const dateOf = ({ key, meeting }: DesiredEvent) => (key === "weekly" ? `weekly from ${meeting.start}` : meeting.start);

const dayOf = (event: GoogleEvent) => eventDays(event)?.date ?? "an unknown day";

const titled = (event: GoogleEvent) => `"${event.summary ?? ""}" on ${dayOf(event)}`;

/** A line of the plan, without the failure of its write. */
function changeLine(change: Change, apply: boolean): string {
  const prefix = `Události, ${dateOf(change.desired)}: `;
  const { summary } = change.desired;
  if (change.kind === "add") return `${prefix}${actionVerb(!apply, "add")} "${summary}"`;
  const target = `"${change.target.summary ?? ""}"`;
  if (change.claim) {
    const link = actionVerb(!apply, "link");
    return `${prefix}${link} ${target} to ${pagePath(change.desired.newsId)} and ${apply ? "updated" : "update"} its ${fieldNames(change.fields)}`;
  }
  return `${prefix}${actionVerb(!apply, "update")} ${target}: ${fieldNames(change.fields)}`;
}

function reportLine(report: Report): string {
  switch (report.kind) {
    case "ask": {
      const candidates = report.candidates.map(titled).join(", ");
      const url = `https://farakurim.cz${pagePath(report.desired.newsId)}`;
      const when = report.desired.key === "weekly" ? dateOf(report.desired) : `on ${report.desired.meeting.start}`;
      return (
        `Události, ${dateOf(report.desired)}: ask: ${candidates}: paste ${url} into its description if it is this ` +
        `event; if none of them is, add it in Události ${when} with that URL in its description; until then nothing ` +
        "changes"
      );
    }
    case "unpaired": {
      const events = report.events.map(titled).join(", ");
      return `Události, ${report.meetings[0]}: cannot pair the meetings ${report.meetings.join(", ")} with ${events}: nothing changes`;
    }
    case "orphan":
      return `Události, ${dayOf(report.event)}: ${titled(report.event)} links ${report.path}, which no record has: left alone`;
    case "deleted":
      return `Události, ${dateOf(report.desired)}: "${report.desired.summary}" was added by the site and deleted by hand: left alone`;
  }
}

/** The lines for `plan`: what would change (`apply` false) or changed, then the reports; failed writes say why. */
export function planLines(plan: SyncPlan, apply: boolean, failures: Map<Change, string> = new Map()): string[] {
  const lines = [
    ...plan.changes.map((change) => {
      const failure = failures.get(change);
      return changeLine(change, apply) + (failure === undefined ? "" : ` — failed: ${failure}`);
    }),
    ...plan.reports.map(reportLine),
  ];
  return lines.length > 0 ? lines : ["Události: nothing to do."];
}

/** The reports that leave a record out of line in the calendar until a person acts. */
const NEEDS_PERSON = new Set<Report["kind"]>(["ask", "unpaired"]);

/** The lines of the reports in `plan` that need a person; none when nothing does. */
export function problemLines(plan: SyncPlan): string[] {
  return plan.reports.filter((report) => NEEDS_PERSON.has(report.kind)).map(reportLine);
}
