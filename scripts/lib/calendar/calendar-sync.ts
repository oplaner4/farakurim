import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NewsEvent } from "@/content/types/news";
import { readEvents } from "@/content/news";
import { pragueDate } from "@/lib/shared/prague";
import { errorMessage, parseCommandLine } from "../command";
import { NEWS_DIR, ROOT } from "../content-files";
import { planLines, problemLines } from "./lines";
import { planSync, type Change, type SyncPlan } from "./plan";
import { readSnapshot, snapshotRange, type CalendarAccess } from "./read";
import { accessToken, applyChange } from "./write";

const USAGE = "Usage: pnpm calendar-sync [--apply | --problems]";

type Options = { apply: boolean; problems: boolean };

/**
 * Reads the command line `args`: --apply writes to the calendar, else it is a preview, of only the lines that need
 * a person with --problems; throws with the usage.
 */
export function parseCommand(args: string[]): Options {
  const options = { apply: { type: "boolean" }, problems: { type: "boolean" } } as const;
  const { values, positionals } = parseCommandLine(args, options, USAGE);
  if (positionals.length > 0 || (values.apply && values.problems)) throw new Error(USAGE);
  return { apply: values.apply ?? false, problems: values.problems ?? false };
}

/** Loads .env.local into the environment when it exists; a variable already set stays. */
function loadEnvLocal() {
  const env = join(ROOT, ".env.local");
  if (existsSync(env)) process.loadEnvFile(env);
}

/** The plan for `events` read through `access`, as of today in Prague. */
async function planFor(events: NewsEvent[], access: CalendarAccess): Promise<SyncPlan> {
  const today = pragueDate(Date.now());
  return planSync(events, await readSnapshot(access, snapshotRange(events, today)), today);
}

/**
 * Prints the plan of all records (with `problems`, only the lines that need a person, if any), or that the calendar
 * was not checked and why (then it throws, with the reason); with --apply, rereads the calendar with the service
 * account and writes it.
 */
export async function execute({ apply, problems }: Options): Promise<void> {
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
