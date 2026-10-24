import { parishCalendars } from "@/content/site";
import type { NewsEvent } from "@/content/types/news";
import { readEvents } from "@/content/news";
import { pragueDate } from "@/lib/shared/prague";
import { errorMessage } from "../command";
import { NEWS_DIR } from "../content-files";
import { applyAll, loadEnvLocal, type SyncOptions } from "./apply";
import { planLines, problemLines } from "./lines";
import { planSync, type SyncPlan } from "./plan";
import { readSnapshot, snapshotRange, type CalendarAccess } from "./read";
import { accessToken, applyChange } from "./write";

// The Události sync: the event records (src/content/news/) against the Události calendar.

/** The plan for `events` read through `access`, as of today in Prague. */
async function planFor(events: NewsEvent[], access: CalendarAccess): Promise<SyncPlan> {
  const today = pragueDate(Date.now());
  return planSync(
    events,
    await readSnapshot(access, parishCalendars.events.googleId, snapshotRange(events, today)),
    today,
  );
}

/**
 * Prints the plan of all records (with `problems`, only the lines that need a person, if any), or that the calendar
 * was not checked and why (then it throws, with the reason); with `apply`, rereads the calendar with the service
 * account and writes it.
 */
export async function syncEvents({ apply, problems }: SyncOptions): Promise<void> {
  loadEnvLocal();
  const serviceAccount = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT;
  if (apply && !serviceAccount) throw new Error("no GOOGLE_CALENDAR_SERVICE_ACCOUNT");
  const events = readEvents(NEWS_DIR);
  if (!apply) {
    const { lines, failure } = await preview(events, problems ? problemLines : (plan) => planLines(plan, false));
    if (lines.length > 0) console.log(lines.join("\n"));
    if (failure !== undefined) throw new Error(failure);
    return;
  }
  const token = await accessToken(serviceAccount!);
  const plan = await planFor(events, { token });
  const failures = await applyAll(plan.changes, (change) => applyChange(change, token));
  console.log(planLines(plan, true, failures).join("\n"));
  if (failures.size > 0) throw new Error(`${failures.size} calendar changes failed`);
}

/** The lines `toLines` gives for the plan of `events`, or that the calendar was not checked and why. */
async function preview(
  events: NewsEvent[],
  toLines: (plan: SyncPlan) => string[],
): Promise<{ lines: string[]; failure?: string }> {
  const unchecked = (failure: string) => ({ lines: [`Události: not checked (${failure}).`], failure });
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
  if (!apiKey) return unchecked("no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local");
  try {
    return { lines: toLines(await planFor(events, { apiKey })) };
  } catch (error) {
    return unchecked(errorMessage(error));
  }
}
