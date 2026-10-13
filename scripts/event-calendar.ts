// pnpm event-calendar: checks that an event is in the Události Google Calendar, linked to its detail page
// (parish-create-event and parish-cancel-event skills). For each meeting it prints one of:
//   linked     an event that day already links the page: nothing to do;
//   no link    an event that day has a matching title but not the URL: paste the URL into its description;
//   missing    no such event: when no meeting is in the calendar, it writes the event's .ics to import into
//              Události (the file of "Přidat do kalendáře", whose description holds the URL); a cancelled meeting
//              needs none.
//   moved      a moved event's calendar event is still on the date before the move: move it to the new date (no .ics).
// A found event whose "Zrušeno: " title prefix does not match the meeting (cancelled or dropped on the site, or no
// longer) is to be renamed, as the calendars take the cancelled status from that prefix alone.
// It reads the calendar with NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY from .env.local; without the key, or when Google
// does not answer, it writes the .ics and says the calendar was not checked.
//
// Usage: pnpm event-calendar <id> [--out <dir>]   (the .ics goes to ~/Downloads/ by default)
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/event-calendar";

runCommand("event-calendar", import.meta.url, parseCommand, execute);
