// Temp folders, git and the repo's files for the script tests.

import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach } from "vitest";
import { ROOT } from "../content-files";
import { git } from "../git";

/** Whether this user may create a symlink (Windows allows it only in Developer Mode or as an administrator). */
export const canSymlink = (() => {
  const dir = mkdtempSync(join(tmpdir(), "symlink-"));
  try {
    symlinkSync(join(dir, "target"), join(dir, "link"));
    return true;
  } catch {
    return false;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
})();

/** The value of `name` in the top-level `env:` of the workflow `file` (.github/workflows/<file>); undefined without it. */
export const workflowEnv = (file: string, name: string) =>
  new RegExp(`^env:\\n(?: {2}.*\\n)*? {2}${name}: (\\S+)$`, "m").exec(
    readFileSync(join(ROOT, ".github/workflows", file), "utf8"),
  )?.[1];

/** A temp folder for each test, created before it and removed after it; returns a getter of its path. */
export function freshTempDir(prefix: string): () => string {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), `${prefix}-`));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  return () => dir;
}

const TEST_GIT_CONFIG = [
  "user.name=t",
  "user.email=t@t",
  "commit.gpgsign=false",
  "maintenance.auto=false",
  "gc.auto=0",
];

/**
 * Runs git in `cwd` as a test user and returns its trimmed output. No signing, and no auto maintenance: a commit starts
 * it detached, and it could still write in .git while freshTempDir() removes the folder (ENOTEMPTY).
 */
export const testGit = (cwd: string, ...args: string[]) =>
  git(cwd, ...TEST_GIT_CONFIG.flatMap((setting) => ["-c", setting]), ...args).trim();
