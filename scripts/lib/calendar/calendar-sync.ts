import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NewsEvent } from "@/content/types/news";
import { readEvents } from "@/content/news";
import { pragueDate } from "@/lib/shared/prague";
import { errorMessage, parseCommandLine } from "../command";
import { NEWS_DIR, ROOT } from "../content-files";
import { planLines } from "./lines";
import { planSync, type Change, type SyncPlan } from "./plan";
import { readSnapshot, snapshotRange, type CalendarAccess } from "./read";
import { accessToken, applyChange } from "./write";

const USAGE = "Usage: pnpm calendar-sync [--apply]";

/** Reads the command line `args`: --apply writes to the calendar, else it is a preview; throws with the usage. */
export function parseCommand(args: string[]): { apply: boolean } {
  const { values, positionals } = parseCommandLine(args, { apply: { type: "boolean" } }, USAGE);
  if (positionals.length > 0) throw new Error(USAGE);
  return { apply: values.apply ?? false };
}

/** Loads .env.local into the environment when it exists; a variable already set stays. */
export function loadEnvLocal() {
  const env = join(ROOT, ".env.local");
  if (existsSync(env)) process.loadEnvFile(env);
}

/** The plan for `events` read through `access`, as of today in Prague. */
async function planFor(events: NewsEvent[], access: CalendarAccess): Promise<SyncPlan> {
  const today = pragueDate(Date.now());
  return planSync(events, await readSnapshot(access, snapshotRange(events, today)), today);
}

/** Prints the plan of all records; with --apply, rereads the calendar with the service account and writes it. */
export async function execute({ apply }: { apply: boolean }): Promise<void> {
  loadEnvLocal();
  const serviceAccount = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
  if (apply && !serviceAccount) throw new Error("no GOOGLE_CALENDAR_SERVICE_ACCOUNT");
  if (!apply && !apiKey) throw new Error("no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local");
  const events = readEvents(NEWS_DIR);
  if (!apply) {
    console.log(planLines(await planFor(events, { apiKey: apiKey! }), false).join("\n"));
    return;
  }
  const token = await accessToken(serviceAccount!);
  const plan = await planFor(events, { token });
  const failures = new Map<Change, string>();
  for (const change of plan.changes) {
    try {
      await applyChange(change, token);
    } catch (error) {
      failures.set(change, errorMessage(error));
    }
  }
  console.log(planLines(plan, true, failures).join("\n"));
  if (failures.size > 0) throw new Error(`${failures.size} calendar changes failed`);
}

/** Whether `report` is about the record `id`; an orphan is about no record. */
const reportIsOf = (report: SyncPlan["reports"][number], id: string) =>
  report.kind === "unpaired" ? report.newsId === id : report.kind !== "orphan" && report.desired.newsId === id;

/**
 * The preview lines for `events`, planned together (a record may claim what another leaves): all of them, or with
 * `onlyId` only that record's changes and reports. Reads with NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY; never throws.
 */
export async function previewLines(events: NewsEvent[], onlyId?: string): Promise<string[]> {
  const unchecked = (reason: string) => [`Události: not checked (${reason}).`];
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
  if (!apiKey) return unchecked("no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local");
  try {
    const plan = await planFor(events, { apiKey });
    if (onlyId === undefined) return planLines(plan, false);
    return planLines(
      {
        changes: plan.changes.filter((change) => change.desired.newsId === onlyId),
        reports: plan.reports.filter((report) => reportIsOf(report, onlyId)),
      },
      false,
    );
  } catch (error) {
    return unchecked(errorMessage(error));
  }
}
