// Adds or removes a change announced for a day no ohlášky sheet covers. The command and its usage:
// scripts/lib/services/add-exception.ts.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/services/add-exception";

runCommand("add-exception", import.meta.url, parseCommand, execute);
