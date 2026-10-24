import type { CalendarId } from "@/content/types/calendar";
import { errorMessage, parseCommandLine } from "../command";
import type { SyncOptions } from "./apply";
import { syncEvents } from "./events-sync";
import { syncServices } from "./services-sync";

// Runs the sync of one parish calendar or of both: Události from the event records, Bohoslužby from the services.

const USAGE = "Usage: pnpm calendar-sync [--calendar events|services] [--apply | --problems]";

const CALENDARS: CalendarId[] = ["events", "services"];

type Options = SyncOptions & { calendars: CalendarId[] };

const SYNCS: Record<CalendarId, (options: SyncOptions) => Promise<void>> = {
  events: syncEvents,
  services: syncServices,
};

/**
 * Reads the command line `args`: --calendar picks one calendar (both without it), --apply writes, else it is a
 * preview, of only the lines that need a person with --problems; throws with the usage.
 */
export function parseCommand(args: string[]): Options {
  const options = {
    calendar: { type: "string" },
    apply: { type: "boolean" },
    problems: { type: "boolean" },
  } as const;
  const { values, positionals } = parseCommandLine(args, options, USAGE);
  const calendar = values.calendar as CalendarId | undefined;
  if (positionals.length > 0 || (values.apply && values.problems) || (calendar && !CALENDARS.includes(calendar))) {
    throw new Error(USAGE);
  }
  return {
    calendars: calendar ? [calendar] : CALENDARS,
    apply: values.apply ?? false,
    problems: values.problems ?? false,
  };
}

/** Runs the sync of each calendar in turn; a failed one does not stop the next, and the run then fails with each reason. */
export async function execute({ calendars, ...options }: Options): Promise<void> {
  const failures: string[] = [];
  for (const calendar of calendars) {
    try {
      await SYNCS[calendar](options);
    } catch (error) {
      failures.push(errorMessage(error));
    }
  }
  if (failures.length > 0) throw new Error(failures.join("; "));
}
