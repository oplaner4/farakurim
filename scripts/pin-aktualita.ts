// Pins an aktualita for "Doporučujeme", unpinning every other one. The command and its usage: scripts/lib/news/pin-aktualita.ts.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/pin-aktualita";

runCommand("pin-aktualita", import.meta.url, parseCommand, execute);
