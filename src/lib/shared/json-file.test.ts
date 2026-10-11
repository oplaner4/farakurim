import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as z from "zod";
import { parseOrThrow, readJsonFile } from "./json-file";

describe("parseOrThrow", () => {
  const schema = z.strictObject({ items: z.array(z.string()) });

  it("returns the checked data, or throws naming what is not valid and every problem", () => {
    expect(parseOrThrow(schema, { items: ["a"] }, "the record")).toEqual({ items: ["a"] });
    expect(() => parseOrThrow(schema, { items: [1] }, "the record")).toThrow(
      /^the record is not valid:\n[^]*items\[0\]/,
    );
  });
});

describe("readJsonFile", () => {
  let dir: string;
  const schema = z.strictObject({ items: z.array(z.string()) });
  const file = (content: string) => {
    const path = join(dir, "data.json");
    writeFileSync(path, content);
    return path;
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "json-file-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("returns the data its schema checked", () => {
    expect(readJsonFile(file('{ "items": ["a"] }'), schema)).toEqual({ items: ["a"] });
  });

  it("names the file when it is not JSON, and the field when it breaks the schema", () => {
    expect(() => readJsonFile(file('{ "items": ['), schema)).toThrow("data.json is not valid JSON");
    expect(() => readJsonFile(file('{ "items": [1] }'), schema)).toThrow(/data\.json is not valid:\n[^]*items\[0\]/);
  });
});
