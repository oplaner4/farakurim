// pnpm services-calendar-sync: brings the Bohoslužby Google Calendar in line with the services of the Pořad
// bohoslužeb page (the regular schedule, the service sheets and the changes announced for later): one event per
// service of the next six months. It adds the services the calendar lacks, claims a hand-made event at a service's
// time and church, updates the title, time, place and description of the events it owns, writes again one deleted by
// hand, and deletes its own events that no service wants any more; it never touches another hand-made event, it only
// reports the ones that double a service.
//   (no flag)  preview: reads the calendar with NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY and prints one line per change
//              and per report; writes nothing.
//   --apply    rereads the calendar with the service account, writes the changes, prints what it did; a failed
//              write is reported and the rest goes on, then it exits 1.
//
// Usage: pnpm services-calendar-sync [--apply]
// Environment (.env.local): NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY (preview), GOOGLE_CALENDAR_SERVICE_ACCOUNT (--apply:
// the credentials that act as the service account, as for pnpm calendar-sync; never printed).
import { execute, parseCommand } from "./lib/calendar/services-sync";
import { runCommand } from "./lib/command";

runCommand("services-calendar-sync", import.meta.url, parseCommand, execute);
