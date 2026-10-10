// The next release version for scripts/release.sh, from the Conventional Commits since the last tag: minor when
// a feat outside the content scope is among them, patch otherwise. Major only on request (--major): a `feat!:`
// is still minor, because the one major change the site expects is a redesign.
//
// Usage: git log --format=%s v1.1.0..HEAD | tsx scripts/release-version.ts [--major]
// Prints the bump and the version, e.g. "minor 1.2.0", for the version in package.json.

import { readFileSync } from "node:fs";
import { runCommand } from "./command";

/** Subject of a new feature: `feat:`, `feat(scope):` or `feat!:`. */
const FEAT = /^feat(\(([^)]*)\))?!?:/;

export type Bump = "major" | "minor" | "patch";

/** "major", "minor" or "patch" for the commit subjects since the last release. */
export function releaseBump(subjects: string[], { major = false } = {}): Bump {
  if (major) return "major";
  const feature = subjects.some((subject) => {
    const match = FEAT.exec(subject);
    return match !== null && match[2] !== "content";
  });
  return feature ? "minor" : "patch";
}

/** `version` ("1.1.0") raised by `bump`. */
export function nextVersion(version: string, bump: Bump): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`Not a release version: ${version}`);
  }
  const [a, b, c] = parts;
  return { major: [a + 1, 0, 0], minor: [a, b + 1, 0], patch: [a, b, c + 1] }[bump].join(".");
}

runCommand(
  "release-version",
  import.meta.url,
  (args) => ({ major: args.includes("--major") }),
  ({ major }) => {
    const subjects = readFileSync(0, "utf8").split("\n").filter(Boolean);
    const bump = releaseBump(subjects, { major });
    const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      version: string;
    };
    console.log(`${bump} ${nextVersion(version, bump)}`);
  },
);
