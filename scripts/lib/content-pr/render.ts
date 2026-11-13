// Renders the JSON report of a content PR agent as the Markdown the PR body shows: one section per week (oldest first)
// or event, then the report-level questions and, for events, the dropped attachments.

import { itemLabel, outcomeText } from "./report";
import type { EventEntry, Question, Report, WeekEntry } from "./report-schema";

function questionLine({ id, blocking, status, where, text, proposal, answer }: Question): string {
  const parts = [`- **${id}** (${blocking ? "blocking" : "non-blocking"}, ${status}) ${where}: ${text}`];
  if (proposal) parts.push(`proposal: ${proposal}`);
  if (answer) parts.push(`answer: ${answer}`);
  return parts.join(" — ");
}

function venueLines({ venues }: EventEntry): string[] {
  return venues.map((venue) =>
    venue.kind === "new"
      ? `New venue ${venue.id}: ${venue.name}, ${venue.address} — pin: ${venue.pin}`
      : `New alias "${venue.text}" for ${venue.id}`,
  );
}

/** The blocks of a section (each a list of lines), joined by a blank line. */
function section(label: string, head: string[], body: string[], extra: string[][], questions: Question[]): string {
  const blocks = [[`## ${label}`, ...head], body, ...extra];
  if (questions.length > 0) blocks.push(["### Questions", ...questions.map(questionLine)]);
  return blocks
    .filter((block) => block.length > 0)
    .map((block) => block.join("\n"))
    .join("\n\n");
}

function weekSection(label: string, week: WeekEntry): string {
  const head = [`Outcome: ${outcomeText(week.outcome)}`, ...(week.notOnTheNewest ? [week.notOnTheNewest] : [])];
  const note = week.senderNote?.length ? [["### Sender's note", ...week.senderNote.map((line) => `- ${line}`)]] : [];
  return section(label, head, [week.summary], note, week.questions);
}

function eventSection(label: string, event: EventEntry): string {
  const body = [...(event.origin ? [event.origin] : []), ...venueLines(event)];
  return section(label, [`Outcome: ${outcomeText(event.outcome)}`], body, [], event.questions);
}

export function renderReport(report: Report): string {
  const sections: string[] = [];
  if (report.kind === "sheet") {
    report.weeks
      .map((week, index) => ({ week, index }))
      .sort((a, b) => a.week.validFrom.localeCompare(b.week.validFrom))
      .forEach(({ week, index }) => sections.push(weekSection(itemLabel(report, index), week)));
  } else {
    report.events.forEach((event, index) => sections.push(eventSection(itemLabel(report, index), event)));
  }
  if (report.questions.length > 0) sections.push(["## Questions", ...report.questions.map(questionLine)].join("\n"));
  if (report.kind === "events" && report.droppedAttachments.length > 0) {
    sections.push(["## Dropped attachments", ...report.droppedAttachments.map((line) => `- ${line}`)].join("\n"));
  }
  return sections.join("\n\n");
}
