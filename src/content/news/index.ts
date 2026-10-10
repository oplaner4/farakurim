import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import * as z from "zod";
import type { NewsEvent } from "@/content/types/news";
import { newsEventSchema } from "@/lib/news/schema";

// Every aktualita, one JSON file per start month: news/<year>/<MM>.json, each in start-date order. 2019–2025 were
// migrated once from the old site's database (farakurim.cz); scripts/lib/news/add-aktualita.ts (farnost-create-aktualita
// skill) adds the new ones. Which ones are current and which archived is decided by date (src/lib/news/), not by the
// file they are in. The folder is read, not imported, so a new month needs no code, and every file is checked with
// the record schema on import: a broken file fails the tests, the build and the scripts, naming the file and field.

const YEAR = /^\d{4}$/;
const MONTH = /^\d{2}\.json$/;
const monthSchema = z.array(newsEventSchema);

/** The month files under `dir` as `<year>/<MM>.json`: newest year first, the months of a year in order. */
export function monthFiles(dir: string): string[] {
  const years = readdirSync(dir).filter((name) => YEAR.test(name));
  return years
    .toSorted()
    .toReversed()
    .flatMap((year) =>
      readdirSync(join(dir, year))
        .filter((name) => MONTH.test(name))
        .toSorted()
        .map((name) => `${year}/${name}`),
    );
}

/** The records of the month file `file` (`<year>/<MM>.json`) under `dir`, checked by the record schema. */
export function readMonth(dir: string, file: string): NewsEvent[] {
  const path = join(dir, file);
  const name = relative(process.cwd(), path);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${name} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }
  const parsed = monthSchema.safeParse(data);
  if (!parsed.success) throw new Error(`${name} is not valid:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

/** Every aktualita under `dir`: newest year first, each year's months in order, each file in its order. */
export const readEvents = (dir: string): NewsEvent[] => monthFiles(dir).flatMap((file) => readMonth(dir, file));

export const events: NewsEvent[] = readEvents(join(process.cwd(), "src/content/news"));
