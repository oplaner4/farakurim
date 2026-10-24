// pnpm calendar-sync: brings the parish's Google Calendars in line with the content, both or the one --calendar names.
//   events    Události, from the event records (src/content/news/): adds the events it lacks, links a calendar event
//             a person made to its record's page, and updates the title, time, place and description of linked ones;
//             it never deletes an event.
//   services  Bohoslužby, from the services of the Pořad bohoslužeb page (the regular schedule, the service sheets and
//             the changes announced for later): one event per service of the next six months. It adds the services
//             the calendar lacks, claims a hand-made event at a service's time and church, updates the events it
//             owns, writes again one deleted by hand and deletes its own events no service wants any more; it never
//             touches another hand-made event, it only reports the ones that double a service.
// Used by pnpm release (its preview), the deploy workflow, which applies each calendar after a release, and the events
// workflow (--calendar events --problems in the PR). A failed calendar does not stop the other; the run then exits 1.
//   (no flag)  preview: reads the calendars with NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY and prints one line per change
//              and per report; writes nothing.
//   --problems the preview's lines that need a person only (Události: an `ask:`, meetings it cannot pair; Bohoslužby:
//              a hand-made event doubling a service), nothing when none does.
//   --apply    rereads the calendars with the service account, writes the changes, prints what it did; a failed
//              write is reported and the rest goes on, then it exits 1.
//
// Usage: pnpm calendar-sync [--calendar events|services] [--apply | --problems]
// Environment (.env.local): NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY (preview, --problems), GOOGLE_CALENDAR_SERVICE_ACCOUNT
// (--apply: the credentials that act as the service account, as JSON or the path of the file: a login impersonating
// it, the workload identity federation of the deploy workflow, or its JSON key; never printed).
import { execute, parseCommand } from "./lib/calendar/calendar-sync";
import { runCommand } from "./lib/command";

runCommand("calendar-sync", import.meta.url, parseCommand, execute);
