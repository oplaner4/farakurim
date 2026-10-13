// pnpm pin-event: pins an event for "Doporučujeme" on Aktuality (parish-pin-event skill), unpinning
// every other one, then formats the changed month files and runs the news tests.
//
// Usage: pnpm pin-event <id> | --none [--check]
// --none unpins every record. --check only validates and prints what would change, without writing.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/pin-event";

runCommand("pin-event", import.meta.url, parseCommand, execute);
