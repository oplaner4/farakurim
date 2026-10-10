// Checks that an aktualita is in the Události Google Calendar, linked to its page. The command and its usage: scripts/lib/news/aktualita-calendar.ts.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/aktualita-calendar";

runCommand("aktualita-calendar", import.meta.url, parseCommand, execute);
