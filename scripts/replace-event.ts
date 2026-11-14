// pnpm replace-event: corrects an event already in src/content/news/ (parish-correct-event and parish-cancel-event
// skills), formats the month files and runs the news tests.
// A failure restores src/content/ and removes the files it staged.
//
// Usage: pnpm replace-event <record.json | -> [--check]
//        pnpm replace-event --draft <id> --out <record.json>
// The record is the whole corrected NewsEvent as JSON (`-` reads stdin); its id names the event, which keeps its
// `published` and its pin (pnpm pin-event moves the pin). --check only validates it and prints where it goes and
// the fields that change, without writing. --draft writes the record of that id as it stands, whole, to edit into
// the corrected one. A corrected or added file is staged with `pnpm stage-content event … --corrected` instead.
import { runCommand } from "./lib/command";
import { withContentRestore } from "./lib/content-files";
import { execute, parseCommand } from "./lib/news/replace-event";

runCommand("replace-event", import.meta.url, parseCommand, withContentRestore(execute));
