// pnpm add-exception: adds or removes a change the parish announces for a day no ohlášky sheet covers, in
// src/content/schedule-exceptions.json (farnost-create-vyjimka skill), then formats the file and runs the ohlášky
// tests. The record is one ScheduleException: every service of that date at the parish churches (`services: []`
// cancels the day); a record for a date already there replaces it. A date a sheet covers is refused (correct that
// sheet instead), and so is a past one.
//
// Usage: pnpm add-exception <record.json | -> | --remove <YYYY-MM-DD> [--check]
// --remove takes the change on that date out (an announcement withdrawn). --check only validates and prints what
// would change, without writing.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/services/add-exception";

runCommand("add-exception", import.meta.url, parseCommand, execute);
