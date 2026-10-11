// The next release version for scripts/release.sh, from the Conventional Commits since the last tag.
//
// Usage: git log --format=%s v1.1.0..HEAD | tsx scripts/release-version.ts [--major]
// Prints the bump and the version, e.g. "minor 1.2.0", for the version in package.json.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/release-version";

runCommand("release-version", import.meta.url, parseCommand, execute);
