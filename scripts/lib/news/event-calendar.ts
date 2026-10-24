// The Události calendar sync preview for one event: what `pnpm calendar-sync` would do for the record, planned with
// all records as the sync does (a record may claim what another leaves).

import type { NewsEvent } from "@/content/types/news";
import { readEvents } from "@/content/news";
import { errorMessage, parseCommandLine } from "../command";
import { NEWS_DIR } from "../content-files";
import { loadEnvLocal, previewLines } from "../calendar/calendar-sync";

/** The records on disk with `event` replacing the one of its id, or added when it is new. */
function withRecord(event: NewsEvent): NewsEvent[] {
  const events = readEvents(NEWS_DIR);
  const index = events.findIndex((e) => e.id === event.id);
  return index === -1 ? [...events, event] : events.with(index, event);
}

/** Loads .env.local and prints the sync preview for `event`; never throws (a failure is printed instead). */
export async function reportCalendar(event: NewsEvent) {
  try {
    loadEnvLocal();
    console.log((await previewLines(withRecord(event), event.id)).join("\n"));
  } catch (error) {
    console.error(`event-calendar: ${errorMessage(error)}`);
  }
}

const USAGE = "Usage: pnpm event-calendar <id>";

/** Reads the command line `args`: the event of the id; throws with the usage or for an unknown id. */
export async function parseCommand(args: string[]): Promise<{ event: NewsEvent }> {
  const { positionals } = parseCommandLine(args, {}, USAGE);
  if (positionals.length !== 1) throw new Error(USAGE);
  const event = readEvents(NEWS_DIR).find((e) => e.id === positionals[0]);
  if (!event) throw new Error(`no event with the id ${positionals[0]}`);
  return { event };
}

/** Prints what the calendar sync would do for the event. */
export const execute = ({ event }: { event: NewsEvent }) => reportCalendar(event);
