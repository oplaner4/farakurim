// Sets or removes the poster of an aktualita. The command and its usage: scripts/lib/news/poster-aktualita.ts.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/poster-aktualita";

runCommand("poster-aktualita", import.meta.url, parseCommand, execute);
