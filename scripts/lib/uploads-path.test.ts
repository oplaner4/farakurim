import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SHEETS_FOLDER } from "@/lib/services/service-sheet";
import { UPLOADS_PATH } from "@/lib/shared/uploads";
import { ROOT } from "./content-files";
import { EVENTS_FOLDER } from "./stage/event";
import { UPLOADS_PATH as SERVED_UPLOADS_PATH } from "./server-files.mjs";
import { workflowEnv } from "./test-helpers";

const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

// The uploads path is UPLOADS_PATH; the shell script, the workflows, .gitignore and the plain-Node servers cannot import
// it, so they keep a copy.
describe("the copies of UPLOADS_PATH", () => {
  it("is UPLOADS in scripts/deploy.sh", () => {
    expect(`/${/^UPLOADS=(\S+)$/m.exec(read("scripts/deploy.sh"))?.[1]}/`).toBe(UPLOADS_PATH);
  });

  it.each(["service-sheet.yml", "events.yml", "content-fix-run.yml"])("is UPLOADS in %s", (file) => {
    expect(`/${workflowEnv(file, "UPLOADS")}/`).toBe(UPLOADS_PATH);
  });

  it("is ignored by .gitignore", () => {
    expect(read(".gitignore").split("\n")).toContain(UPLOADS_PATH);
  });

  it("is UPLOADS_PATH in scripts/lib/server-files.mjs", () => {
    expect(SERVED_UPLOADS_PATH).toBe(UPLOADS_PATH);
  });
});

describe("the copies of SHEETS_FOLDER", () => {
  it.each(["service-sheet.yml"])("is SHEETS in %s", (file) => {
    expect(`${workflowEnv(file, "SHEETS")}/`).toBe(SHEETS_FOLDER);
  });
});

describe("the copy of EVENTS_FOLDER", () => {
  it("is EVENTS in events.yml", () => {
    expect(`${workflowEnv("events.yml", "EVENTS")}/`).toBe(EVENTS_FOLDER);
  });
});
