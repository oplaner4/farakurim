import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UPLOADS_PATH } from "@/lib/shared/uploads";
import { ROOT } from "./content-files";
import { UPLOADS_PATH as SERVED_UPLOADS_PATH } from "./server-files.mjs";

const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

// The uploads path is UPLOADS_PATH; the shell script, the workflows, .gitignore and the plain-Node servers cannot import
// it, so they keep a copy.
describe("the copies of UPLOADS_PATH", () => {
  it("is UPLOADS in scripts/deploy.sh", () => {
    expect(`/${/^UPLOADS=(\S+)$/m.exec(read("scripts/deploy.sh"))?.[1]}/`).toBe(UPLOADS_PATH);
  });

  it.each([".github/workflows/service-sheet.yml", ".github/workflows/service-sheet-release.yml"])(
    "is UPLOADS in %s",
    (path) => {
      expect(`/${/^env:\n(?: {2}.*\n)*? {2}UPLOADS: (\S+)$/m.exec(read(path))?.[1]}/`).toBe(UPLOADS_PATH);
    },
  );

  it("is ignored by .gitignore", () => {
    expect(read(".gitignore").split("\n")).toContain(UPLOADS_PATH);
  });

  it("is UPLOADS_PATH in scripts/lib/server-files.mjs", () => {
    expect(SERVED_UPLOADS_PATH).toBe(UPLOADS_PATH);
  });
});
