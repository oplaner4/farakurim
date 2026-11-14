import { readFileSync } from "node:fs";
import { relative, sep } from "node:path";
import type * as z from "zod";
import { parseOrThrow } from "./parse";

// Reading a JSON content file that is read rather than imported (the event month files, and every file the
// content scripts change), checked by its schema (parse.ts): a broken file throws naming the file and the field.

/**
 * The JSON file `file`, checked by `schema`; a file that is not JSON or breaks the schema throws, naming it (with `/`
 * on every OS).
 */
export function readJsonFile<T>(file: string, schema: z.ZodType<T>): T {
  const name = relative(process.cwd(), file).replaceAll(sep, "/");
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${name} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }
  return parseOrThrow(schema, data, name);
}
