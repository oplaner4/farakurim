// The next release version for scripts/release.sh, from the Conventional Commits since the last tag: minor when
// a feat outside the content scope is among them, patch otherwise. Major only on request (--major): a `feat!:`
// is still minor, because the one major change the site expects is a redesign.
//
// Usage: git log --format=%s v1.1.0..HEAD | node scripts/release-version.mjs [--major]
// Prints the bump and the version, e.g. "minor 1.2.0", for the version in package.json.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Subject of a new feature: `feat:`, `feat(scope):` or `feat!:`. */
const FEAT = /^feat(\(([^)]*)\))?!?:/;

/** "major", "minor" or "patch" for the commit subjects since the last release. */
export function releaseBump(subjects, { major = false } = {}) {
  if (major) return "major";
  const feature = subjects.some((subject) => {
    const match = FEAT.exec(subject);
    return match !== null && match[2] !== "content";
  });
  return feature ? "minor" : "patch";
}

/** `version` ("1.1.0") raised by `bump`. */
export function nextVersion(version, bump) {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`Not a release version: ${version}`);
  }
  const [a, b, c] = parts;
  return { major: [a + 1, 0, 0], minor: [a, b + 1, 0], patch: [a, b, c + 1] }[bump].join(".");
}

// Run as a command, not imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const subjects = readFileSync(0, "utf8").split("\n").filter(Boolean);
  const bump = releaseBump(subjects, { major: process.argv.includes("--major") });
  const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  console.log(`${bump} ${nextVersion(version, bump)}`);
}
