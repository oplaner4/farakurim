// Applies the change the agent made to the content (a `git diff --binary` patch) to a fresh checkout, only when it
// touches nothing but the content files of its kind: a patch from a workspace the agent touched never reaches a script,
// a workflow or a hook.

import { existsSync, statSync } from "node:fs";
import type { Kind } from "../content-release/plan";
import { git } from "../git";

/** The files a content PR of each kind may change. */
export const CONTENT_FILES = {
  sheet: { pattern: /^src\/content\/[^/]+\.json$/, name: "src/content/*.json" },
  events: { pattern: /^src\/content\/news\/\d{4}\/\d{2}\.json$/, name: "the news month files" },
} as const satisfies Record<Kind, { pattern: RegExp; name: string }>;

/** Whether the patch file holds a change: missing or empty is none. */
export const hasChange = (patch: string) => existsSync(patch) && statSync(patch).size > 0;

/**
 * Applies `patch` to the checkout `cwd` after checking that every path it touches is a content file of `kind` and that
 * it makes no symlink. Throws, applying nothing, otherwise.
 */
export function applyContentPatch(cwd: string, kind: Kind, patch: string) {
  const { pattern, name } = CONTENT_FILES[kind];
  // --numstat lists each path once, a rename as `old => new`, which matches no pattern.
  const paths = git(cwd, "apply", "--numstat", patch)
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t").slice(2).join("\t"));
  const symlink = / mode 120000/.test(git(cwd, "apply", "--summary", patch));
  if (paths.length === 0 || symlink || paths.some((path) => !pattern.test(path))) {
    throw new Error(`The change touches more than ${name}: not applied.`);
  }
  git(cwd, "apply", patch);
}
