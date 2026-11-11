// Applies the change the agent made to the content (a `git diff --binary` patch) to a fresh checkout, only when it
// touches nothing but the content files of its kind: a patch from a workspace the agent touched never reaches a script,
// a workflow or a hook. A change to the venue list may only add venues and aliases.

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { venueFileSchema } from "@/lib/venues/schema";
import type { Kind } from "../content-release/plan";
import { git } from "../git";
import { venueListChangeProblem } from "../venues/changes";

const VENUES = "src/content/venues.json";

/** The files a content PR of each kind may change. */
export const CONTENT_FILES = {
  sheet: { pattern: /^src\/content\/[^/]+\.json$/, name: "src/content/*.json" },
  events: {
    pattern: /^src\/content\/(news\/\d{4}\/\d{2}|venues)\.json$/,
    name: "the news month files and the venue list",
  },
} as const satisfies Record<Kind, { pattern: RegExp; name: string }>;

/** Whether the patch file holds a change: missing or empty is none. */
export const hasChange = (patch: string) => existsSync(patch) && statSync(patch).size > 0;

/** The venues of the venue list at HEAD in `cwd` (none when it has no list), and as the checkout holds it now. */
const venuesAtHead = (cwd: string) => {
  const text = git(cwd, "ls-tree", "--name-only", "HEAD", VENUES).trim() ? git(cwd, "show", `HEAD:${VENUES}`) : "";
  return text ? venueFileSchema.parse(JSON.parse(text)).venues : [];
};

/** Why the venue list in `cwd` is more than the one at HEAD with venues and aliases added, if it is. */
function venueProblem(cwd: string, before: ReturnType<typeof venuesAtHead>): string | undefined {
  const file = join(cwd, VENUES);
  if (!existsSync(file)) return "it removes the venue list";
  const parsed = venueFileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success)
    return `the venue list breaks its rules: ${parsed.error.issues.map((i) => i.message).join("; ")}`;
  return venueListChangeProblem(before, parsed.data.venues);
}

/**
 * Applies `patch` to the checkout `cwd` after checking that every path it touches is a content file of `kind` and that
 * it makes no symlink, and, when it touches the venue list, that it only adds venues and aliases. Throws, applying
 * nothing, otherwise.
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
  const venues = paths.includes(VENUES) ? venuesAtHead(cwd) : undefined;
  git(cwd, "apply", patch);
  if (!venues) return;
  let problem: string | undefined;
  try {
    problem = venueProblem(cwd, venues);
  } catch (error) {
    problem = `the venue list is not JSON (${error instanceof Error ? error.message : error})`;
  }
  if (problem) {
    git(cwd, "apply", "--reverse", patch);
    throw new Error(`The change to the venue list does more than add venues and aliases (${problem}): not applied.`);
  }
}
