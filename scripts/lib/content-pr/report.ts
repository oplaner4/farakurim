// Reads the report the agent writes in a mail workflow (service sheet, events) and checks it against the change it
// made: line 1 `blocking: yes|no`, an optional line 2 `commit: <message>`, then the PR body, one `## ` section per item
// (a week, an event) with exactly one `Outcome:` line, and its questions (`- **q1** (blocking|note[, resolved|, still
// open]) …`).

import type { Kind } from "../content-release/plan";

/** What each kind's report holds: its items, their outcomes and the default commit message. */
export const REPORT_RULES = {
  sheet: {
    item: "week",
    source: "sheet",
    /** The `## ` sections that are no item. */
    notItems: undefined,
    outcomes: [/^created$/, /^corrected$/, /^refused: /, /^document error: /],
    /** The outcomes that need a change: a report without one of them must carry none. */
    changing: [/^created$/, /^corrected$/],
    /** Whether a report with no item at all (a mail without an event) is answered, without a change. */
    empty: false,
    defaultMessage: "feat(content): update the service sheets",
  },
  events: {
    item: "event",
    source: "mail",
    notItems: /^(Questions|Dropped attachments)$/,
    outcomes: [/^created$/, /^refused: /],
    changing: [/^created$/],
    empty: true,
    defaultMessage: "feat(content): add events",
  },
} as const satisfies Record<Kind, unknown>;

/** The outcome an `Outcome:` line gives, tolerating a list marker and bold around `Outcome:`; null for another line. */
export function outcomeOf(line: string): string | null {
  const plain = line
    .replace(/^\s*[-*]\s+/, "")
    .replace(/^\*\*(Outcome:[^*]*)\*\*/, "$1")
    .replace(/^\*\*Outcome\*\*:/, "Outcome:");
  const match = /^Outcome:\s*(.*)$/.exec(plain);
  return match ? match[1].trim() : null;
}

export type ReportItem = { name: string; outcomes: string[] };

export type ReportQuestion = { id: string; blocking: boolean; resolved: boolean };

/** The question a line asks (`- **q1** (blocking, still open) …`), null for another line. */
export function questionOf(line: string): ReportQuestion | null {
  const match = /^\s*[-*]\s+\*\*(q\d+)\*\*\s*\(([^)]*)\)/i.exec(line);
  if (!match) return null;
  const marks = match[2].split(",").map((mark) => mark.trim().toLowerCase());
  return { id: match[1].toLowerCase(), blocking: marks.includes("blocking"), resolved: marks.includes("resolved") };
}

export type MailReport = {
  /** From line 1, `blocking: yes|no`; undefined when it is missing or malformed. */
  blocking?: boolean;
  /** From line 2, `commit: <message>`; undefined without it. */
  commit?: string;
  /** The PR body: everything after the header lines. */
  body: string;
  /** The `## ` sections that are items of `kind`, with their outcomes in order. */
  items: ReportItem[];
  /** The questions of the whole report, in order. */
  questions: ReportQuestion[];
};

/**
 * The header of the report `text` (`blocking:`, then an optional `commit:`) and the lines after it. A byte order mark
 * or blank lines before the header are no reason to retry the mail.
 */
function splitHeader(text: string) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  while (lines.length > 0 && !lines[0].trim()) lines.shift();
  const take = (key: string) => (lines[0]?.startsWith(`${key}:`) ? (lines.shift() ?? "").trim() : "");
  const blocking = /^blocking: (yes|no)$/.exec(take("blocking"))?.[1];
  const commit = /^commit: (.+)$/.exec(take("commit"))?.[1].trim();
  return { blocking, commit, lines };
}

/** Reads the report `text` of `kind`. */
export function parseMailReport(kind: Kind, text: string): MailReport {
  const { blocking, commit, lines } = splitHeader(text);
  const { notItems } = REPORT_RULES[kind];
  const items: ReportItem[] = [];
  const questions: ReportQuestion[] = [];
  let item: ReportItem | undefined;
  for (const line of lines) {
    const question = questionOf(line);
    if (question) questions.push(question);
    if (line.startsWith("## ")) {
      const name = line.slice(3).trim();
      item = notItems?.test(name) ? undefined : { name, outcomes: [] };
      if (item) items.push(item);
      continue;
    }
    const outcome = outcomeOf(line);
    if (outcome !== null && item) item.outcomes.push(outcome);
  }
  return {
    ...(blocking && { blocking: blocking === "yes" }),
    ...(commit && { commit }),
    body: lines.join("\n").trim(),
    items,
    questions,
  };
}

/** The outcome lines of a summary: `<item>: <outcome>`, all of them or only the items not published. */
export function outcomeLines(kind: Kind, text: string, { failed = false } = {}): string[] {
  const { changing } = REPORT_RULES[kind];
  return parseMailReport(kind, text).items.flatMap(({ name, outcomes }) =>
    outcomes
      .filter((outcome) => !failed || !(changing as readonly RegExp[]).some((re) => re.test(outcome)))
      .map((outcome) => `${name}: ${outcome}`),
  );
}

export type ReportVerdict = {
  changed: boolean;
  draft: boolean;
  commit?: string;
  /** The open blocking questions of a report that says `blocking: no`, which make the PR a draft all the same. */
  undeclared: string[];
};

const matches = (patterns: readonly RegExp[], outcome: string) => patterns.some((re) => re.test(outcome));

/**
 * Checks the report `text` of `kind` against whether the run changed the content (`changed`): each item has exactly
 * one known outcome, a change needs an item created (or corrected), and no change needs a report explaining why.
 * Throws with the reason, so the mail stays unread for the next run. Only an exact `blocking: no` without an open
 * blocking question makes a ready PR.
 */
export function checkReport(kind: Kind, text: string, changed: boolean): ReportVerdict {
  const rules = REPORT_RULES[kind];
  const report = parseMailReport(kind, text);
  const unread = `the ${rules.source} stays unread`;
  if (report.blocking === undefined) {
    throw new Error(`The report lacks its first line, \`blocking: yes|no\`: ${unread}.`);
  }
  const open = report.questions.filter((question) => question.blocking && !question.resolved).map((q) => q.id);
  const undeclared = report.blocking ? [] : [...new Set(open)];
  const verdict = {
    changed,
    draft: report.blocking || open.length > 0,
    ...(report.commit && { commit: report.commit }),
    undeclared,
  };
  // A mail the agent found no event in (a thank-you with a logo) is answered, not retried.
  if (rules.empty && report.items.length === 0 && !changed) return verdict;
  const outcomes = report.items.flatMap((item) => item.outcomes);
  if (
    report.items.length === 0 ||
    report.items.some((item) => item.outcomes.length !== 1) ||
    outcomes.some((outcome) => !matches(rules.outcomes, outcome))
  ) {
    throw new Error(`The report does not give each ${rules.item} exactly one Outcome line: ${unread}.`);
  }
  if (!changed && outcomes.includes("created")) {
    throw new Error(`The report says a ${rules.item} was created, but nothing changed: ${unread}.`);
  }
  // The scripts restore their files when a test fails, but a report that refuses every item must not carry a change.
  if (changed && !outcomes.some((outcome) => matches(rules.changing, outcome))) {
    throw new Error("The report creates nothing, but the change is not empty: not applied.");
  }
  return verdict;
}
