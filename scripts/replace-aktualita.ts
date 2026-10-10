// Corrects an aktualita already in src/content/news/. The command and its usage: scripts/lib/news/replace-aktualita.ts.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/replace-aktualita";

runCommand("replace-aktualita", import.meta.url, parseCommand, execute);
