import * as z from "zod";

// Checking a value against its schema, wherever it comes from (an imported content file, a record a script reads):
// a value that breaks it throws with every problem, naming the field. It reads no file, so a module a client bundle
// imports may use it (json-file.ts reads one).

/** `input` checked by `schema`; throws "<what> is not valid:" with every problem. */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown, what: string): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error(`${what} is not valid:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}
