// pnpm add-aktualita: adds a confirmed aktualita to src/content/news/ (farnost-create-aktualita skill), formats its
// month file, runs the news tests and checks the event in the Události calendar (as pnpm aktualita-calendar).
//
// Usage: pnpm add-aktualita <record.json | -> [--check]
// The record is a NewsEvent as JSON (`-` reads stdin), upload paths root-relative ("/uploads/aktuality/x.webp").
// --check only validates the record and the news files and prints the target file, without writing. A record with
// `"pinned": true` takes the pin from the record pinned before, named in the output. An aktualita with files to
// upload is added by `pnpm stage aktualita … --record`, one already there is corrected with `pnpm replace-aktualita`.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/add-aktualita";

runCommand("add-aktualita", import.meta.url, parseCommand, execute);
