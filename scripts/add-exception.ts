// pnpm add-exception: adds or removes a change the parish announces for a day no service sheet covers, in
// src/content/schedule-exceptions.json (parish-manage-exceptions skill), then formats the file and runs the service
// sheet tests. The record is one ScheduleException: every service of that date at the parish churches (`services: []`
// cancels the day); a record for a date already there replaces it. A date a sheet covers is refused (correct that
// sheet instead), and so is a past one.
// A failure restores src/content/ and removes the files it staged.
//
// Usage: pnpm add-exception <record.json | -> | --remove <YYYY-MM-DD> [--check]
//        pnpm add-exception --draft <YYYY-MM-DD> --out <record.json>
// --remove takes the change on that date out (an announcement withdrawn) and prints the regular services the day gets
// back. --check only validates and prints what would change, without writing. --draft writes the record of that date
// as it stands to edit: its change, or else its regular services (refused like an added record for a covered or past
// date).
import { runCommand } from "./lib/command";
import { withContentRestore } from "./lib/content-files";
import { execute, parseCommand } from "./lib/services/add-exception";

runCommand("add-exception", import.meta.url, parseCommand, withContentRestore(execute));
