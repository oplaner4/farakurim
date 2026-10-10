// Adds a Zonerama album to the Fotogalerie. The command and its usage: scripts/lib/gallery/add-album.ts.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/gallery/add-album";

runCommand("add-album", import.meta.url, parseCommand, execute);
