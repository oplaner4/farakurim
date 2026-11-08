import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { canSymlink, freshTempDir, testGit } from "../test-helpers";
import { applyContentPatch, hasChange } from "./patch";

describe("applyContentPatch", () => {
  const dir = freshTempDir("content-pr");
  let repo = "";
  const sheets = () => join(repo, "src/content/service-sheets.json");
  const month = () => join(repo, "src/content/news/2026/11.json");

  beforeEach(() => {
    repo = join(dir(), "repo");
    mkdirSync(join(repo, "src/content/news/2026"), { recursive: true });
    writeFileSync(sheets(), "{}\n");
    writeFileSync(join(repo, "package.json"), "{}\n");
    testGit(repo, "init", "-q");
    testGit(repo, "add", "-A");
    testGit(repo, "commit", "-q", "-m", "x");
  });

  /** The patch of the changes `edit` makes (new files included), written outside the repo; the repo is reset after. */
  function patchOf(edit: () => void): string {
    edit();
    testGit(repo, "add", "--intent-to-add", "-A");
    const patch = join(dir(), "content.patch");
    writeFileSync(patch, `${testGit(repo, "diff", "--binary", "HEAD")}\n`);
    testGit(repo, "reset", "-q", "--hard");
    testGit(repo, "clean", "-qfd");
    return patch;
  }

  it("applies a sheet change to src/content/*.json", () => {
    const patch = patchOf(() => writeFileSync(sheets(), '{"sheets":[]}\n'));
    applyContentPatch(repo, "sheet", patch);
    expect(readFileSync(sheets(), "utf8")).toBe('{"sheets":[]}\n');
  });

  it("applies a new news month file for events, but not for a sheet", () => {
    const patch = patchOf(() => writeFileSync(month(), "[]\n"));
    expect(() => applyContentPatch(repo, "sheet", patch)).toThrow("touches more than src/content/*.json");
    applyContentPatch(repo, "events", patch);
    expect(readFileSync(month(), "utf8")).toBe("[]\n");
  });

  it("applies nothing when one path is outside the kind's files", () => {
    const patch = patchOf(() => {
      writeFileSync(sheets(), '{"sheets":[]}\n');
      writeFileSync(join(repo, "package.json"), '{"scripts":{}}\n');
    });
    expect(() => applyContentPatch(repo, "sheet", patch)).toThrow("not applied");
    expect(readFileSync(sheets(), "utf8")).toBe("{}\n");
  });

  it.runIf(canSymlink)("refuses a symlink, even under a content file's name", () => {
    const patch = patchOf(() => symlinkSync("/etc/passwd", join(repo, "src/content/link.json")));
    expect(() => applyContentPatch(repo, "sheet", patch)).toThrow("not applied");
  });
});

describe("hasChange", () => {
  const dir = freshTempDir("content-pr");

  it("is false for a missing or empty patch", () => {
    expect(hasChange(join(dir(), "none.patch"))).toBe(false);
    writeFileSync(join(dir(), "empty.patch"), "");
    expect(hasChange(join(dir(), "empty.patch"))).toBe(false);
    writeFileSync(join(dir(), "some.patch"), "diff");
    expect(hasChange(join(dir(), "some.patch"))).toBe(true);
  });
});
