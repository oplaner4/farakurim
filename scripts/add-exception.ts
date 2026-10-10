// Adds or removes a change announced for a day after the last ohlášky sheet. The command and its usage:
// scripts/lib/services/add-exception.ts.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/services/add-exception";

runCommand("add-exception", import.meta.url, parseCommand, execute);
