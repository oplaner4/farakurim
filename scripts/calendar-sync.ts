// pnpm calendar-sync: brings the Události Google Calendar in line with the event records (src/content/news/): adds
// the events it lacks, links a calendar event a person made to its record's page, and updates the title, time,
// place and description of linked ones. Used by the parish-create-event, parish-correct-event and
// parish-cancel-event skills (through the release preview) and by the deploy workflow, which applies it after a
// release.
//   (no flag)  preview: reads the calendar with NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY and prints one line per change
//              and per report (what needs a person); writes nothing.
//   --apply    rereads the calendar with the service account, writes the changes, prints what it did; a failed
//              write is reported and the rest goes on, then it exits 1. It never deletes an event.
//
// Usage: pnpm calendar-sync [--apply]
// Environment (.env.local): NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY (preview), GOOGLE_CALENDAR_SERVICE_ACCOUNT (--apply:
// the service account's JSON key, or the path of its file; a secret, never printed).
import { execute, parseCommand } from "./lib/calendar/calendar-sync";
import { runCommand } from "./lib/command";

runCommand("calendar-sync", import.meta.url, parseCommand, execute);
