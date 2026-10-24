import { existsSync } from "node:fs";
import { join } from "node:path";
import { errorMessage } from "../command";
import { ROOT } from "../content-files";

// What the two calendar syncs share to run: the environment file and the write loop.

/** What one run of a calendar sync does: write (`apply`), or preview all its lines or only the `problems`. */
export type SyncOptions = { apply: boolean; problems: boolean };

/** Loads .env.local into the environment when it exists; a variable already set stays. */
export function loadEnvLocal() {
  const env = join(ROOT, ".env.local");
  if (existsSync(env)) process.loadEnvFile(env);
}

/**
 * Writes every change with `write`, one after the other; a failed write does not stop the rest. Returns the reason of
 * each failed change.
 */
export async function applyAll<C>(changes: C[], write: (change: C) => Promise<void>): Promise<Map<C, string>> {
  const failures = new Map<C, string>();
  for (const change of changes) {
    try {
      await write(change);
    } catch (error) {
      failures.set(change, errorMessage(error));
    }
  }
  return failures;
}
