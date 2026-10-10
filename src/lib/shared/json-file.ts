import { readFileSync } from "node:fs";
import { relative } from "node:path";
import * as z from "zod";

// Reading a JSON content file that is read rather than imported (the Aktuality month files, and every file the
// content scripts change), checked by its schema: a broken file throws naming the file and the field.

/** The JSON file `file`, checked by `schema`; a file that is not JSON or breaks the schema throws, naming it. */
export function readJsonFile<T>(file: string, schema: z.ZodType<T>): T {
  const name = relative(process.cwd(), file);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${name} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error(`${name} is not valid:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}
