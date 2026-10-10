// Stages a content file in uploads/ for /uploads/ on the server. The commands and their usage:
// scripts/lib/stage/command.ts.
import { runCommand } from "./lib/command";
import { execute } from "./lib/stage/command";

runCommand("stage", import.meta.url, (args) => args, execute);
