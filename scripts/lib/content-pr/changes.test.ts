import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { freshTempDir, testGit } from "../test-helpers";
import { changesProblem, commitMessage, contentChanges, type ContentChanges } from "./changes";
import { parseMailReport } from "./report";

const sheet = (validFrom: string, validTo: string, note = "") => ({ validFrom, validTo, days: [], note });
const event = (id: string, title: string, text = "") => ({ id, title, start: "2026-12-19", text });

describe("contentChanges", () => {
  const dir = freshTempDir("content-pr-changes");

  /** A repo whose HEAD holds `before`, with `after` written over it (a missing value removes the file). */
  function repo(before: Record<string, unknown>, after: Record<string, unknown>): string {
    const root = join(dir(), "repo");
    const write = (files: Record<string, unknown>) => {
      for (const [path, data] of Object.entries(files)) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), `${JSON.stringify(data, null, 2)}\n`);
      }
    };
    mkdirSync(root, { recursive: true });
    write({ "README.md": "x", ...before });
    testGit(root, "init", "-q");
    testGit(root, "add", "-A");
    testGit(root, "commit", "-q", "-m", "x");
    write(after);
    return root;
  }

  it("lists the weeks a sheet change adds and changes", () => {
    const old = sheet("2026-10-11", "2026-10-18");
    const cwd = repo(
      { "src/content/service-sheets.json": { sheets: [old, sheet("2026-10-18", "2026-10-25")] } },
      {
        "src/content/service-sheets.json": {
          sheets: [old, sheet("2026-10-18", "2026-10-25", "corrected"), sheet("2026-10-25", "2026-11-01")],
        },
      },
    );
    expect(contentChanges(cwd, "sheet")).toEqual({
      kind: "sheet",
      added: [{ validFrom: "2026-10-25", validTo: "2026-11-01" }],
      changed: [{ validFrom: "2026-10-18", validTo: "2026-10-25" }],
    });
  });

  it("lists the events an events change adds, in new month files too, not the ones it changes", () => {
    const cwd = repo(
      { "src/content/news/2026/12.json": [event("pout-2026", "Pouť")] },
      {
        "src/content/news/2026/12.json": [event("pout-2026", "Pouť", "unpinned"), event("hody-2026", "Hody")],
        "src/content/news/2027/01.json": [event("tri-kralove-2027", "Tři králové")],
        "src/content/venues.json": { venues: [] },
      },
    );
    expect(contentChanges(cwd, "events")).toEqual({
      kind: "events",
      added: [
        { id: "hody-2026", title: "Hody" },
        { id: "tri-kralove-2027", title: "Tři králové" },
      ],
    });
  });
});

describe("changesProblem", () => {
  const report = (kind: "sheet" | "events", ...sections: string[]) =>
    parseMailReport(kind, ["blocking: no", "", ...sections].join("\n"));
  const week = (validFrom: string, validTo: string) => ({ validFrom, validTo });
  const sheetChanges = (added = [week("2026-10-19", "2026-10-25")], changed: ReturnType<typeof week>[] = []) =>
    ({ kind: "sheet", added, changed }) satisfies ContentChanges;

  it("accepts a sheet report giving each added week as created and each changed one as created or corrected", () => {
    const r = report("sheet", "## 12.–18. 10. 2026\nOutcome: corrected", "## 19.–25. 10. 2026\nOutcome: created");
    expect(changesProblem(r, sheetChanges())).toBeUndefined();
    expect(changesProblem(r, sheetChanges([], [week("2026-10-12", "2026-10-18")]))).toBeUndefined();
    // A sheet report covers the whole PR: a week this change leaves alone is no problem.
    expect(changesProblem(r, sheetChanges([], []))).toBeUndefined();
  });

  it("refuses a sheet report missing a week the change adds or changes, or giving it another outcome", () => {
    expect(changesProblem(report("sheet", "## 12.–18. 10. 2026\nOutcome: created"), sheetChanges())).toMatch(
      /^The report does not match the change \(the change adds the week 19\.–25\. 10\. 2026, .*\): not applied\.$/,
    );
    expect(changesProblem(report("sheet", "## 19.–25. 10. 2026\nOutcome: corrected"), sheetChanges())).toContain(
      "does not give as created",
    );
    const refused = report("sheet", "## 19.–25. 10. 2026\nOutcome: refused: overlaps");
    expect(changesProblem(refused, sheetChanges([], [week("2026-10-19", "2026-10-25")]))).toContain(
      "the change corrects the week 19.–25. 10. 2026",
    );
  });

  it("matches an events report's created sections with the added events by title", () => {
    const r = report(
      "events",
      "## Tři Králové\nOutcome: created",
      "## Pouť\nOutcome: refused: already in main as pout",
    );
    const added = [{ id: "tri-kralove-2027", title: "Tři  králové" }];
    expect(changesProblem(r, { kind: "events", added })).toBeUndefined();
    expect(changesProblem(r, { kind: "events", added: [{ id: "hody-2026", title: "Hody" }] })).toContain(
      "the change adds the event hody-2026, which no created section",
    );
    expect(changesProblem(r, { kind: "events", added: [...added, { id: "hody-2026", title: "Hody" }] })).toContain(
      "the report gives 1 events as created, but the change adds 2",
    );
  });
});

describe("commitMessage", () => {
  const report = (...sections: string[]) =>
    parseMailReport("sheet", ["blocking: no", "commit: feat(content): agent's", "", ...sections].join("\n"));
  const none = { kind: "sheet", added: [], changed: [] } satisfies ContentChanges;

  it("names every week the sheet report publishes, feat when one is created", () => {
    expect(commitMessage(report("## 19.–25. 10. 2026\nOutcome: created"), none)).toBe(
      "feat(content): publish the service sheet for 19.–25. 10. 2026",
    );
    expect(commitMessage(report("## 19.–25. 10. 2026\nOutcome: corrected"), none)).toBe(
      "fix(content): correct the service sheet for 19.–25. 10. 2026",
    );
    const two = report(
      "## 26. 10.–1. 11. 2026\nOutcome: corrected",
      "## 19.–25. 10. 2026\nOutcome: created",
      "## 2.–8. 11. 2026\nOutcome: refused: overlaps",
    );
    expect(commitMessage(two, none)).toBe(
      "feat(content): publish the service sheets for 19.–25. 10. and 26. 10.–1. 11. 2026",
    );
  });

  it("gives none when a published week's heading names no week, or nothing is published", () => {
    expect(commitMessage(report("## A\nOutcome: created"), none)).toBeUndefined();
    expect(commitMessage(report("## 19.–25. 10. 2026\nOutcome: document error: a date"), none)).toBeUndefined();
  });

  it("names the one event an events change adds, or their number", () => {
    const r = parseMailReport("events", "blocking: no\n\n## Hody\nOutcome: created");
    expect(commitMessage(r, { kind: "events", added: [{ id: "hody", title: "Hody" }] })).toBe(
      "feat(content): add the Hody event",
    );
    const two = [
      { id: "hody", title: "Hody" },
      { id: "pout", title: "Pouť" },
    ];
    expect(commitMessage(r, { kind: "events", added: two })).toBe("feat(content): add 2 events");
    expect(commitMessage(r, { kind: "events", added: [] })).toBeUndefined();
  });
});
