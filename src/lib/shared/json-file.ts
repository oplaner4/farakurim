import { readFileSync } from "node:fs";
import { relative } from "node:path";
import * as z from "zod";

// Reading a JSON content file that is read rather than imported (the Aktuality month files, and every file the
// content scripts change), checked by its schema: a broken file throws naming the file and the field.

/** `input` checked by `schema`; throws "<what> is not valid:" with every problem. */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown, what: string): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error(`${what} is not valid:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

/** The JSON file `file`, checked by `schema`; a file that is not JSON or breaks the schema throws, naming it. */
export function readJsonFile<T>(file: string, schema: z.ZodType<T>): T {
  const name = relative(process.cwd(), file);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${name} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }
  return parseOrThrow(schema, data, name);
}
