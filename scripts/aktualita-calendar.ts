// pnpm aktualita-calendar: checks that an aktualita is in the Události Google Calendar, linked to its detail page
// (farnost-create-aktualita skill). For each meeting it prints one of:
//   linked     an event that day already links the page: nothing to do;
//   no link    an event that day has a matching title but not the URL: paste the URL into its description;
//   missing    no such event: when no meeting is in the calendar, it writes the aktualita's .ics to import into
//              Události (the file of "Přidat do kalendáře", whose description holds the URL).
// It reads the calendar with NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY from .env.local; without the key, or when Google
// does not answer, it writes the .ics and says the calendar was not checked.
//
// Usage: pnpm aktualita-calendar <id> [--out <dir>]   (the .ics goes to ~/Downloads/ by default)
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/aktualita-calendar";

runCommand("aktualita-calendar", import.meta.url, parseCommand, execute);
