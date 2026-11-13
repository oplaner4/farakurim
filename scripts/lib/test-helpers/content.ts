// Content fixtures for the script tests: news folders, the `pnpm stage` staging folder, empty sheet weeks.

import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { beforeEach, vi } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import { periodDates } from "@/lib/services/service-sheet";
import { EXCEPTIONS_FILE, NEWS_DIR, PETRKLIC_FILE, SERVICE_SHEETS_FILE } from "../content-files";
import type { StageEnv } from "../stage/core";
import { UPLOADS_DIR } from "../uploads";
import { freshTempDir } from "./files";

/** The days of a service sheet record from `validFrom` to `validTo`, all without services. */
export const emptyWeek = (validFrom: string, validTo: string) =>
  periodDates(validFrom, validTo).map((date) => ({ date, rows: [] }));

/**
 * A temp news folder holding only `months` (`"<year>/<MM>.json"` → records), fresh for each test; `dir()` is its
 * path. For the tests that must not depend on the real records (which event is pinned).
 */
export function useNewsFixture(months: Record<string, NewsEvent[]>) {
  const dir = freshTempDir("news");
  beforeEach(() => {
    for (const [file, list] of Object.entries(months)) {
      mkdirSync(join(dir(), file.slice(0, 4)), { recursive: true });
      writeFileSync(join(dir(), file), `${JSON.stringify(list, null, 2)}\n`);
    }
  });
  return { dir };
}

/**
 * A temp staging folder, news/, service-sheets.json, schedule-exceptions.json, petrklic.json and home for the `pnpm stage` tests, fresh for each test: `env`
 * points there and asks a fetch stub that answers 404 (the name is free) until `status()` changes it.
 */
export function useStageFixture() {
  const fetchMock = vi.fn();
  const env = { fetch: fetchMock as unknown as typeof fetch, site: "https://example.cz" } as StageEnv;
  const tempDir = freshTempDir("stage");
  const status = (code: number) => fetchMock.mockResolvedValue(new Response(null, { status: code }));

  beforeEach(() => {
    const dir = tempDir();
    mkdirSync(join(dir, "home", "Downloads"), { recursive: true });
    cpSync(NEWS_DIR, join(dir, "news"), { recursive: true });
    cpSync(SERVICE_SHEETS_FILE, join(dir, "service-sheets.json"));
    cpSync(EXCEPTIONS_FILE, join(dir, "schedule-exceptions.json"));
    cpSync(PETRKLIC_FILE, join(dir, "petrklic.json"));
    fetchMock.mockReset();
    status(404);
    Object.assign(env, {
      uploadsDir: join(dir, UPLOADS_DIR),
      newsDir: join(dir, "news"),
      serviceSheetsFile: join(dir, "service-sheets.json"),
      exceptionsFile: join(dir, "schedule-exceptions.json"),
      petrklicFile: join(dir, "petrklic.json"),
      htaccessFile: join(dir, ".htaccess"),
      home: join(dir, "home"),
    });
  });

  /** A file in ~/Downloads/; returns its name. */
  const download = (name: string, content: Buffer | string) => {
    writeFileSync(join(env.home, "Downloads", name), content);
    return name;
  };

  return {
    env,
    fetchMock,
    status,
    download,
    /** A path in the temp staging folder. */
    uploaded: (...rel: string[]) => join(env.uploadsDir, ...rel),
    /** A poster image in ~/Downloads/; returns its name. */
    poster: async (name = "Plakát akce.jpg", width = 1000) => {
      await sharp({ create: { width, height: 1414, channels: 3, background: { r: 200, g: 30, b: 90 } } })
        .jpeg()
        .toFile(join(env.home, "Downloads", name));
      return name;
    },
  };
}
