// The helpers the content scripts share (add-aktualita, add-ohlasky, aktualita-calendar, stage/): the repo's
// paths, the aktuality IDs, and formatting and testing the files written.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import { readEvents } from "@/content/news";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const NEWS_DIR = join(ROOT, "src/content/news");
export const OHLASKY_FILE = join(ROOT, "src/content/ohlasky.json");

/** The IDs of every aktualita in the news folder `newsDir`; a broken month file throws, naming it. */
export const newsIds = (newsDir: string) => new Set(readEvents(newsDir).map((e) => e.id));

/** Formats `files` (absolute paths) with the repo's Prettier config, wherever they are. */
export async function formatFiles(files: string[]) {
  const options = await prettier.resolveConfig(ROOT, { config: join(ROOT, ".prettierrc.json") });
  for (const file of files) {
    writeFileSync(file, await prettier.format(readFileSync(file, "utf8"), { ...options, filepath: file }));
  }
}

/**
 * Formats `files` (absolute paths) and runs the content tests under `tests` (with Node itself, so no shell is needed
 * to start pnpm on Windows). Throws when a test fails.
 */
export async function formatAndTest(files: string[], tests: string) {
  await formatFiles(files);
  const vitest = join(ROOT, "node_modules/vitest/vitest.mjs");
  execFileSync(process.execPath, [vitest, "run", tests], { cwd: ROOT, stdio: "inherit" });
}
