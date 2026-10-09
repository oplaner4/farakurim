// The helpers the content scripts share (add-aktualita, add-ohlasky, aktualita-calendar, stage-upload): the repo's
// paths, the source of a record as a JS expression, the aktuality IDs, and formatting and testing the files written.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const NEWS_DIR = join(ROOT, "src/content/news");
export const OHLASKY_DIR = join(ROOT, "src/content/ohlasky");

const UPLOADS_PATH = "/uploads/aktuality/";

/** A JS expression for `value`: plain object keys, upload paths as `${UPLOADS}/…`. Prettier formats it later. */
export function toSource(value: unknown): string {
  if (typeof value === "string") {
    const file = value.startsWith(UPLOADS_PATH) ? value.slice(UPLOADS_PATH.length) : null;
    return file !== null && /^[\w.-]+$/.test(file) ? `\`\${UPLOADS}/${file}\`` : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(toSource).join(", ")}]`;
  if (value !== null && typeof value === "object") return `{ ${entries(value as Record<string, unknown>).join(", ")} }`;
  return JSON.stringify(value);
}

/** The `key: value` sources of an object's defined fields, in `keys` order. */
export const entries = (object: Record<string, unknown>, keys = Object.keys(object)) =>
  keys
    .filter((key) => object[key] !== undefined)
    .map((key) => `${/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: ${toSource(object[key])}`);

/** The IDs of every record in the news files' sources. */
export function existingIds(sources: string[]): Set<string> {
  return new Set(sources.flatMap((source) => [...source.matchAll(/^\s+id: "([^"]+)",$/gm)].map((m) => m[1])));
}

/** Every content .ts file under `dir`, recursively. */
const tsFiles = (dir: string) =>
  readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .map((file) => join(dir, file));

/** The IDs of every aktualita in the news folder `newsDir`. */
export const newsIds = (newsDir: string) => existingIds(tsFiles(newsDir).map((f) => readFileSync(f, "utf8")));

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
