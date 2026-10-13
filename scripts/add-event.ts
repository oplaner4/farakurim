// pnpm add-event: adds a confirmed event to src/content/news/ (parish-create-event skill), formats its
// month file, runs the news tests and checks the event in the Události calendar (as pnpm event-calendar).
//
// Usage: pnpm add-event <record.json | -> [--check]
// The record is a NewsEvent as JSON (`-` reads stdin), upload paths root-relative ("/uploads/aktuality/x.webp").
// --check only validates the record and the news files and prints the target file, without writing. A record with
// `"pinned": true` takes the pin from the record pinned before, named in the output. An event with files to
// upload is added by `pnpm stage event … --record`, one already there is corrected with `pnpm replace-event`.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/add-event";

runCommand("add-event", import.meta.url, parseCommand, execute);
