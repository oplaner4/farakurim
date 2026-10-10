// Adds a confirmed aktualita to src/content/news/. The command and its usage: scripts/lib/news/add-aktualita.ts.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/add-aktualita";

runCommand("add-aktualita", import.meta.url, parseCommand, execute);
