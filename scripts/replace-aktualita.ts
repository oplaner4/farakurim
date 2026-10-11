// pnpm replace-aktualita: corrects an aktualita already in src/content/news/ (farnost-correct-aktualita skill),
// formats the month files, runs the news tests and checks the event in the Události calendar.
//
// Usage: pnpm replace-aktualita <record.json | -> [--check]
// The record is the whole corrected NewsEvent as JSON (`-` reads stdin); its id names the aktualita, which keeps its
// `published` and its pin (pnpm pin-aktualita moves the pin). --check only validates it and prints where it goes and
// the fields that change, without writing. A corrected or added file is staged with
// `pnpm stage aktualita … --corrected` instead.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/replace-aktualita";

runCommand("replace-aktualita", import.meta.url, parseCommand, execute);
