// pnpm replace-event: corrects an event already in src/content/news/ (parish-correct-event skill),
// formats the month files, runs the news tests and checks the event in the Události calendar.
//
// Usage: pnpm replace-event <record.json | -> [--check]
// The record is the whole corrected NewsEvent as JSON (`-` reads stdin); its id names the event, which keeps its
// `published` and its pin (pnpm pin-event moves the pin). --check only validates it and prints where it goes and
// the fields that change, without writing. A corrected or added file is staged with
// `pnpm stage event … --corrected` instead.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/replace-event";

runCommand("replace-event", import.meta.url, parseCommand, execute);
