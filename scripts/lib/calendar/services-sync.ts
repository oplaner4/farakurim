import { places, regularServices } from "@/content/masses";
import { parishCalendars } from "@/content/site";
import { pragueDate } from "@/lib/shared/prague";
import { errorMessage, parseCommandLine } from "../command";
import { EXCEPTIONS_FILE, SERVICE_SHEETS_FILE } from "../content-files";
import { readScheduleExceptions, readServiceSheets } from "../services/add-service-sheet";
import { applyAll, loadEnvLocal } from "./apply";
import { readInstances, type CalendarAccess } from "./read";
import { desiredServices, servicesWindow, type ServicesContent } from "./services-desired";
import { servicesLines } from "./services-lines";
import { planServices, type ServicesPlan } from "./services-plan";
import { accessToken, applyServicesChange } from "./write";

const USAGE = "Usage: pnpm services-calendar-sync [--apply]";

type Options = { apply: boolean };

/** Reads the command line `args`: --apply writes to the calendar, else it is a preview; throws with the usage. */
export function parseCommand(args: string[]): Options {
  const { values, positionals } = parseCommandLine(args, { apply: { type: "boolean" } } as const, USAGE);
  if (positionals.length > 0) throw new Error(USAGE);
  return { apply: values.apply ?? false };
}

/** What the Pořad bohoslužeb page is built from: the regular schedule, the service sheets and the later changes. */
function readContent(): ServicesContent {
  const sheets = readServiceSheets(SERVICE_SHEETS_FILE).sheets.toSorted((a, b) =>
    a.validFrom.localeCompare(b.validFrom),
  );
  return { regular: regularServices, sheets, later: readScheduleExceptions(EXCEPTIONS_FILE).exceptions, places };
}

/** The plan for the services of the next six months, as of now, read through `access`. */
async function planFor(access: CalendarAccess): Promise<ServicesPlan> {
  const now = new Date();
  const range = servicesWindow(pragueDate(now));
  const desired = desiredServices(readContent(), range);
  return planServices(desired, await readInstances(access, parishCalendars.services.googleId, range), now);
}

/**
 * Prints the plan, or that the calendar was not checked and why (then it throws, with the reason); with --apply,
 * rereads the calendar with the service account, writes the changes and prints what it did.
 */
export async function execute({ apply }: Options): Promise<void> {
  loadEnvLocal();
  const serviceAccount = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT;
  if (apply && !serviceAccount) throw new Error("no GOOGLE_CALENDAR_SERVICE_ACCOUNT");
  if (!apply) {
    const unchecked = (failure: string) => {
      console.log(`Bohoslužby: not checked (${failure}).`);
      throw new Error(failure);
    };
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
    if (!apiKey) return unchecked("no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local");
    let plan: ServicesPlan;
    try {
      plan = await planFor({ apiKey });
    } catch (error) {
      return unchecked(errorMessage(error));
    }
    console.log(servicesLines(plan, false).join("\n"));
    return;
  }
  const token = await accessToken(serviceAccount!);
  const plan = await planFor({ token });
  const failures = await applyAll(plan.changes, (change) => applyServicesChange(change, token));
  console.log(servicesLines(plan, true, failures).join("\n"));
  if (failures.size > 0) throw new Error(`${failures.size} calendar changes failed`);
}
