import { describe, expect, it } from "vitest";
import { commitlintIssues, fixMessageIssues } from "./commit-messages";

describe("commitlintIssues", () => {
  it("accepts a message the repo's config accepts", async () => {
    expect(await commitlintIssues("feat(content): publish the service sheet for 19.–25. 10. 2026")).toEqual([]);
    expect(await commitlintIssues("fix(content): correct the time\n\nThe concert starts at 18:00.")).toEqual([]);
  }, 30_000);

  it("gives each rule a message breaks", async () => {
    expect(await commitlintIssues("Published the sheet")).toEqual([
      "subject-empty: subject may not be empty",
      "type-empty: type may not be empty",
    ]);
    expect(await commitlintIssues(`feat(content): add the ${"x".repeat(80)} event`)).toEqual([
      "header-max-length: header must not be longer than 100 characters, current length is 109",
    ]);
  }, 30_000);

  it("refuses an empty message and one commitlint's default ignores would skip", async () => {
    expect(await commitlintIssues("")).toEqual(["the message is empty"]);
    expect(await commitlintIssues(" \n")).toEqual(["the message is empty"]);
    expect(await commitlintIssues("Merge branch 'main' into events/2026-11-14")).not.toEqual([]);
  }, 30_000);
});

describe("fixMessageIssues", () => {
  it("asks for one fix(content) line, then what the check says", async () => {
    const none = async () => [];
    expect(await fixMessageIssues("fix(content): move the Monday mass", none)).toEqual([]);
    expect(await fixMessageIssues("feat(news): move the Monday mass", none)).toEqual([
      'must start with "fix(content): "',
    ]);
    expect(await fixMessageIssues("fix(content): move it\n\nThe body.", async () => ["rule: why"])).toEqual([
      "must be one line",
      "rule: why",
    ]);
  });

  it("uses commitlint without a check given", async () => {
    expect(await fixMessageIssues("fix(content): Move the Monday mass.")).toEqual([
      "subject-case: subject must not be sentence-case",
      "subject-full-stop: subject may not end with full stop",
    ]);
  }, 30_000);
});
