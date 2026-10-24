import { places, regularServices } from "@/content/masses";
import { parishCalendars } from "@/content/site";
import { pragueDate } from "@/lib/shared/prague";
import { errorMessage } from "../command";
import { EXCEPTIONS_FILE, SERVICE_SHEETS_FILE } from "../content-files";
import { readScheduleExceptions, readServiceSheets } from "../services/add-service-sheet";
import { applyAll, loadEnvLocal, type SyncOptions } from "./apply";
import { readInstances, type CalendarAccess } from "./read";
import { desiredServices, servicesWindow, type ServicesContent } from "./services-desired";
import { servicesLines, servicesProblemLines } from "./services-lines";
import { planServices, type ServicesPlan } from "./services-plan";
import { accessToken, applyServicesChange } from "./write";

// The Bohoslužby sync: the services of the Pořad bohoslužeb page against the Bohoslužby calendar.

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
 * Prints the plan (with `problems`, only the lines that need a person, if any), or that the calendar was not checked
 * and why (then it throws, with the reason); with `apply`, rereads the calendar with the service account, writes the
 * changes and prints what it did.
 */
export async function syncServices({ apply, problems }: SyncOptions): Promise<void> {
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
    const lines = problems ? servicesProblemLines(plan) : servicesLines(plan, false);
    if (lines.length > 0) console.log(lines.join("\n"));
    return;
  }
  const token = await accessToken(serviceAccount!);
  const plan = await planFor({ token });
  const failures = await applyAll(plan.changes, (change) => applyServicesChange(change, token));
  console.log(servicesLines(plan, true, failures).join("\n"));
  if (failures.size > 0) throw new Error(`${failures.size} calendar changes failed`);
}
