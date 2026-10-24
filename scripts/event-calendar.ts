// pnpm event-calendar: previews what `pnpm calendar-sync` would do in the Události Google Calendar for one event, by
// hand (the release previews all of them): the record is planned with all the others, and only its changes and
// reports are printed. It never writes: the sync writes on a release.
// It reads the calendar with NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY from .env.local; without the key, or when Google
// does not answer, it says the calendar was not checked.
//
// Usage: pnpm event-calendar <id>
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/event-calendar";

runCommand("event-calendar", import.meta.url, parseCommand, execute);
