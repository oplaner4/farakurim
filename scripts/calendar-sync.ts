// pnpm calendar-sync: brings the Události Google Calendar in line with the event records (src/content/news/): adds
// the events it lacks, links a calendar event a person made to its record's page, and updates the title, time,
// place and description of linked ones. Used by pnpm release (its preview), the deploy workflow, which applies it
// after a release, and the events workflow (--problems in the PR).
//   (no flag)  preview: reads the calendar with NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY and prints one line per change
//              and per report; writes nothing.
//   --problems the preview's lines that need a person only (an `ask:`, meetings it cannot pair: until a person
//              acts, that record stays out of line), nothing when none does.
//   --apply    rereads the calendar with the service account, writes the changes, prints what it did; a failed
//              write is reported and the rest goes on, then it exits 1. It never deletes an event.
//
// Usage: pnpm calendar-sync [--apply | --problems]
// Environment (.env.local): NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY (preview, --problems), GOOGLE_CALENDAR_SERVICE_ACCOUNT
// (--apply: the credentials that act as the service account, as JSON or the path of the file: a login impersonating
// it, the workload identity federation of the deploy workflow, or its JSON key; never printed).
import { execute, parseCommand } from "./lib/calendar/calendar-sync";
import { runCommand } from "./lib/command";

runCommand("calendar-sync", import.meta.url, parseCommand, execute);
