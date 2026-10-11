// pnpm pin-aktualita: pins an aktualita for "Doporučujeme" on Aktuality (farnost-pin-aktualita skill), unpinning
// every other one, then formats the changed month files and runs the news tests.
//
// Usage: pnpm pin-aktualita <id> | --none [--check]
// --none unpins every record. --check only validates and prints what would change, without writing.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/pin-aktualita";

runCommand("pin-aktualita", import.meta.url, parseCommand, execute);
