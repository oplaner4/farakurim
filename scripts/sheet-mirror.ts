// pnpm sheet-mirror: prints the "Mirror in the calendar" section of a service sheet PR for the service-sheet workflow
// (only that workflow runs it): one Czech line per day of each sheet in src/content/service-sheets.json that is new
// or changed against the base file, its services without the intentions. Prints nothing when no sheet changed.
//
// Usage: pnpm --silent sheet-mirror <base service-sheets.json>
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/services/sheet-mirror";

runCommand("sheet-mirror", import.meta.url, parseCommand, execute);
