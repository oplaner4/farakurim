import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { canSymlink, freshTempDir, testGit } from "../test-helpers/files";
import { VENUE_LIST, venueRecord } from "../test-helpers/venues";
import { applyContentPatch, hasChange } from "./patch";

describe("applyContentPatch", () => {
  const dir = freshTempDir("content-pr");
  let repo = "";
  const sheets = () => join(repo, "src/content/service-sheets.json");
  const month = () => join(repo, "src/content/news/2026/11.json");
  const venuesFile = () => join(repo, "src/content/venues.json");
  const writeVenues = (venues: unknown[]) => writeFileSync(venuesFile(), `${JSON.stringify({ venues })}\n`);

  beforeEach(() => {
    repo = join(dir(), "repo");
    mkdirSync(join(repo, "src/content/news/2026"), { recursive: true });
    writeFileSync(sheets(), "{}\n");
    writeVenues(VENUE_LIST);
    writeFileSync(join(repo, "package.json"), "{}\n");
    testGit(repo, "init", "-q");
    // A checkout keeps the files as written (Git for Windows turns autocrlf on).
    testGit(repo, "config", "core.autocrlf", "false");
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

  it("applies an events change that adds a venue and an alias to the venue list", () => {
    const [kostel, fara, kaple] = VENUE_LIST;
    const sokolovna = venueRecord("ceska-sokolovna", "Sokolovna", "Česká");
    const patch = patchOf(() => {
      writeVenues([kostel, { ...fara, aliases: ["areál za farou", "farní zahrada"] }, kaple, sokolovna]);
      writeFileSync(month(), "[]\n");
    });
    applyContentPatch(repo, "events", patch);
    expect(readFileSync(venuesFile(), "utf8")).toContain("ceska-sokolovna");
  });

  it("applies nothing when the venue list loses or changes a venue, for any kind", () => {
    const [kostel, fara, kaple] = VENUE_LIST;
    const before = readFileSync(venuesFile(), "utf8");
    const removed = patchOf(() => {
      writeVenues([kostel, kaple]);
      writeFileSync(month(), "[]\n");
    });
    expect(() => applyContentPatch(repo, "events", removed)).toThrow(
      "does more than add venues and aliases (it removes the venue kurim-fara): not applied",
    );
    expect(readFileSync(venuesFile(), "utf8")).toBe(before);
    expect(existsSync(month())).toBe(false);
    const changed = patchOf(() => writeVenues([kostel, { ...fara, name: "Farní úřad" }, kaple]));
    expect(() => applyContentPatch(repo, "sheet", changed)).toThrow("it changes the venue kurim-fara");
    expect(readFileSync(venuesFile(), "utf8")).toBe(before);
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
