// Content files: the repo's paths, writing a JSON content file (reading one is readJsonFile(),
// src/lib/shared/json-file.ts), the event IDs and month files, and formatting and testing the files written.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import { readEvents } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import { UPLOADS_DIR } from "./uploads";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const NEWS_DIR = join(ROOT, "src/content/news");
export const SERVICE_SHEETS_FILE = join(ROOT, "src/content/service-sheets.json");
export const GALLERY_FILE = join(ROOT, "src/content/gallery.json");
export const PETRKLIC_FILE = join(ROOT, "src/content/petrklic.json");
export const EXCEPTIONS_FILE = join(ROOT, "src/content/schedule-exceptions.json");
/** The tests of the service sheets and the changes announced for later, which a sheet prunes. */
export const SERVICE_SHEETS_TESTS = ["src/content/service-sheets.test.ts", "src/content/schedule-exceptions.test.ts"];

/** Writes `data` to the JSON content file `file`; Prettier formats it later. */
export const writeContentFile = (file: string, data: unknown) =>
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

/** The IDs of every event in the news folder `newsDir`; a broken month file throws, naming it. */
export const newsIds = (newsDir: string) => new Set(readEvents(newsDir).map((e) => e.id));

/** Writes the month file `file` (`<year>/<MM>.json`) under `newsDir`, creating its year folder; Prettier formats it later. */
export function writeMonth(newsDir: string, file: string, list: NewsEvent[]) {
  const path = join(newsDir, file);
  mkdirSync(dirname(path), { recursive: true });
  writeContentFile(path, list);
}

/** Formats `files` (absolute paths) with the repo's Prettier config, wherever they are. */
export async function formatFiles(files: string[]) {
  const options = await prettier.resolveConfig(ROOT, { config: join(ROOT, ".prettierrc.json") });
  for (const file of files) {
    writeFileSync(file, await prettier.format(readFileSync(file, "utf8"), { ...options, filepath: file }));
  }
}

/** Formats the news month files `written` (relative to NEWS_DIR) and runs the news tests; nothing when none. */
export async function formatAndTestNews(written: string[]) {
  if (written.length > 0)
    await formatAndTest(
      written.map((f) => join(NEWS_DIR, f)),
      "src/content/news",
    );
}

/**
 * Formats `files` (absolute paths) and runs the content tests under `tests` (with Node itself, so no shell is needed
 * to start pnpm on Windows). Throws when a test fails.
 */
export async function formatAndTest(files: string[], tests: string | string[]) {
  await formatFiles(files);
  const vitest = join(ROOT, "node_modules/vitest/vitest.mjs");
  execFileSync(process.execPath, [vitest, "run", ...[tests].flat()], { cwd: ROOT, stdio: "inherit" });
}

/** The paths under `dir` (relative, folders included); none when the folder is missing. */
const listDir = (dir: string) => (existsSync(dir) ? readdirSync(dir, { recursive: true, encoding: "utf8" }) : []);

/**
 * Takes a restore point of the content under `contentDir` (every file's content) and of the files under `uploadsDir`
 * (their list); the function it returns rewrites the content files changed or deleted since, and deletes the files
 * added since in either folder. The uploads that were there before stay as they are.
 */
export function contentRestorePoint(contentDir: string, uploadsDir: string) {
  const contents = new Map<string, Buffer>();
  const contentPaths = new Set(listDir(contentDir));
  for (const rel of contentPaths) {
    const path = join(contentDir, rel);
    if (statSync(path).isFile()) contents.set(path, readFileSync(path));
  }
  const uploadPaths = new Set(listDir(uploadsDir));
  return () => {
    for (const rel of listDir(contentDir))
      if (!contentPaths.has(rel)) rmSync(join(contentDir, rel), { recursive: true, force: true });
    for (const rel of listDir(uploadsDir))
      if (!uploadPaths.has(rel)) rmSync(join(uploadsDir, rel), { recursive: true, force: true });
    for (const [path, content] of contents) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    }
  };
}

/**
 * Wraps a command's `run` so that a failure (typically the tests after the files were written) puts the content and
 * the staged uploads back as they were, then rethrows.
 */
export function withContentRestore<T>(
  run: (command: T) => unknown,
  dirs = { content: join(ROOT, "src/content"), uploads: join(ROOT, UPLOADS_DIR) },
) {
  return async (command: T) => {
    const restore = contentRestorePoint(dirs.content, dirs.uploads);
    try {
      await run(command);
    } catch (error) {
      restore();
      throw error;
    }
  };
}
