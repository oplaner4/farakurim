// The next release version for scripts/release.sh. The command and its usage: scripts/lib/release-version.ts.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/release-version";

runCommand("release-version", import.meta.url, parseCommand, execute);
