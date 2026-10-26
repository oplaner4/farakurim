import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REPORT_END } from "./body";
import { execute, parseCommand } from "./command";

const repo = "oplaner4/farakurim";

type Routes = Record<string, unknown>;

/** A fetch answering by the path after /repos/{repo}; an unknown path is a 404, a string answers as plain text. */
function fakeFetch(routes: Routes) {
  return (async (url: string) => {
    const path = url.replace(`https://api.github.com/repos/${repo}`, "");
    if (!(path in routes)) return new Response("{}", { status: 404 });
    const body = routes[path];
    return new Response(typeof body === "string" ? body : JSON.stringify(body));
  }) as typeof fetch;
}

const pullBody = (over: object = {}) => ({
  state: "open",
  title: "feat(content): add the Hody event",
  draft: true,
  body: "## Hody\n\nOutcome: created\n\n---\n\nOpened by the events workflow.",
  head: { sha: "abc123", ref: "events/2026-10-26", repo: { full_name: repo } },
  ...over,
});

const apiComment = (id: number, over: object = {}) => ({
  id,
  body: `@claude fix ${id}`,
  created_at: `2026-10-26T10:0${id}:00Z`,
  user: { login: "ondrej", type: "User" },
  author_association: "OWNER",
  ...over,
});

let out: string;
let logs: string[];
beforeEach(() => {
  out = mkdtempSync(join(tmpdir(), "content-fix-"));
  logs = [];
  vi.stubEnv("GITHUB_REPOSITORY", repo);
  vi.stubEnv("GH_TOKEN", "t0k");
  vi.spyOn(console, "log").mockImplementation((line: string) => void logs.push(line));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const run = (args: string[], routes: Routes = {}) => execute(parseCommand(args), fakeFetch(routes));

describe("next", () => {
  const routes = (comments: unknown[], permission = "write", pull = pullBody()): Routes => ({
    "/pulls/7": pull,
    "/issues/7/comments?per_page=100&page=1": comments,
    "/collaborators/ondrej/permission": { permission },
  });

  it("writes the oldest unanswered request and counts the rest", async () => {
    const comments = [
      apiComment(1),
      apiComment(2, { body: "<!-- content-fix: 1 -->\nDone.", user: { login: "bot", type: "Bot" } }),
      apiComment(3, { body: "@claude change the time" }),
      apiComment(4),
    ];
    await run(["next", "--pr", "7", "--out", out], routes(comments));
    expect(JSON.parse(logs[0])).toEqual({
      open: true,
      kind: "events",
      head: "abc123",
      branch: "events/2026-10-26",
      comment: 3,
      remaining: 1,
    });
    expect(readFileSync(join(out, "comment.md"), "utf8")).toBe("@claude change the time\n");
    expect(readFileSync(join(out, "report.md"), "utf8")).toMatch(/^blocking: yes\ncommit: feat\(content\)/);
  });

  it("skips a commenter without write access", async () => {
    await run(["next", "--pr", "7", "--out", out], routes([apiComment(1)], "read"));
    expect(JSON.parse(logs[0])).toMatchObject({ comment: null, remaining: 0 });
    expect(existsSync(join(out, "comment.md"))).toBe(false);
  });

  it("reports a closed PR as not open", async () => {
    await run(["next", "--pr", "7", "--out", out], routes([apiComment(1)], "write", pullBody({ state: "closed" })));
    expect(JSON.parse(logs[0])).toMatchObject({ open: false, comment: null });
    expect(existsSync(join(out, "comment.md"))).toBe(false);
  });

  it("gives no kind for a fork or another branch", async () => {
    const fork = pullBody({ head: { sha: "a", ref: "events/x", repo: { full_name: "someone/farakurim" } } });
    await run(["next", "--pr", "7", "--out", out], routes([], "write", fork));
    const other = pullBody({ head: { sha: "a", ref: "feat/x", repo: { full_name: repo } } });
    await run(["next", "--pr", "7", "--out", out], routes([], "write", other));
    expect(logs.map((line) => JSON.parse(line).kind)).toEqual([null, null]);
  });
});

describe("artifacts", () => {
  const artifact = (name: string, id: number, expired: boolean) => ({
    name,
    expired,
    workflow_run: { id, repository_id: 1, head_repository_id: 1, head_branch: "main" },
  });
  const routes = (expired: boolean): Routes => ({
    "/pulls/7/commits?per_page=100": [
      { sha: "c1", author: { type: "Bot" } },
      { sha: "c2", author: { type: "Bot" } },
    ],
    "/actions/artifacts?name=content-uploads-c1&per_page=100": {
      artifacts: [artifact("content-uploads-c1", 11, false)],
    },
    "/actions/artifacts?name=content-uploads-c2&per_page=100": {
      artifacts: [artifact("content-uploads-c2", 12, expired)],
    },
  });

  it("lists the artifacts oldest first and refuses an expired one", async () => {
    await run(["artifacts", "--pr", "7", "--kind", "events"], routes(false));
    expect(logs).toEqual(["11 content-uploads-c1", "12 content-uploads-c2"]);
    await expect(run(["artifacts", "--pr", "7", "--kind", "events"], routes(true))).rejects.toThrow(
      "PR #7 has an expired artifact: recreate the PR",
    );
  });
});

describe("check-log", () => {
  const routes = (conclusion: string): Routes => ({
    "/commits/abc/check-runs?check_name=check": { check_runs: [{ id: 5, conclusion }] },
    "/actions/jobs/5": {
      steps: [
        { name: "Test", conclusion: "success" },
        { name: "Lint", conclusion: "failure" },
      ],
    },
    "/actions/jobs/5/logs": Array.from({ length: 200 }, (_, i) => `line ${i + 1}`).join("\n"),
  });

  it("writes the failed steps of a failed check, nothing for a passing one", async () => {
    const file = join(out, "check.md");
    await run(["check-log", "--sha", "abc", "--out", file], routes("failure"));
    const text = readFileSync(file, "utf8");
    expect(text).toMatch(/^## Lint\n\n```text\nline 51\n/);
    expect(text).toContain("line 200\n```");
    expect(text).not.toContain("line 50\n");
    expect(text).not.toContain("Test");

    const passing = join(out, "passing.md");
    await run(["check-log", "--sha", "abc", "--out", passing], routes("success"));
    expect(existsSync(passing)).toBe(false);
    expect(logs).toEqual(["failed", "ok"]);
  });
});

describe("report", () => {
  it("writes the body with the report end marker and the reply", async () => {
    const file = join(out, "claude.md");
    writeFileSync(
      file,
      "blocking: no\ncommit: fix(content): correct the time\nfix: Corrected\n\n## Hody\n\nTime.\n\n## Reply\n\nOutcome: changed\n\nOpraveno.\n",
    );
    await run(["report", file, "--out", join(out, "result")]);
    expect(readFileSync(join(out, "result", "body.md"), "utf8")).toBe(`## Hody\n\nTime.\n\n${REPORT_END}\n`);
    expect(readFileSync(join(out, "result", "reply.md"), "utf8")).toBe("Opraveno.\n");
    expect(JSON.parse(logs[0])).toEqual({
      blocking: false,
      commit: "fix(content): correct the time",
      fix: "Corrected",
      changed: true,
    });
  });
});

describe("apply", () => {
  const stage = (dir: string, name: string, file: string, content: string) => {
    mkdirSync(join(dir, name, dirname(file)), { recursive: true });
    writeFileSync(join(dir, name, file), content);
  };
  const apply = (dir: string, order: string, uploads: string) => {
    const orderFile = join(out, "order.txt");
    writeFileSync(orderFile, order);
    return execute(
      parseCommand(["apply", "--pr", "7", "--kind", "events", "--order", orderFile, dir]),
      fakeFetch({}),
      uploads,
    );
  };

  it("applies the artifacts in the listed order, the later file winning", async () => {
    const dir = join(out, "downloaded");
    const uploads = join(out, "uploads");
    stage(dir, "content-uploads-bbb", "aktuality/x.pdf", "older");
    stage(dir, "content-uploads-aaa", "aktuality/x.pdf", "newer");
    stage(dir, "content-uploads-ccc", "aktuality/y.pdf", "unlisted");
    await apply(dir, "1 content-uploads-bbb\n2 content-uploads-aaa\n", uploads);
    expect(readFileSync(join(uploads, "aktuality/x.pdf"), "utf8")).toBe("newer");
    expect(existsSync(join(uploads, "aktuality/y.pdf"))).toBe(false);
  });

  it("refuses a listed artifact that was not downloaded", async () => {
    await expect(apply(out, "1 content-uploads-abc\n", join(out, "uploads"))).rejects.toThrow(
      /content-uploads-abc is listed but not under/,
    );
  });

  it("refuses a file the kind may not upload", async () => {
    const dir = join(out, "downloaded");
    stage(dir, "content-uploads-abc", "other/x.pdf", "x");
    await expect(apply(dir, "1 content-uploads-abc\n", join(out, "uploads"))).rejects.toThrow(/may not upload/);
  });
});

describe("parseCommand", () => {
  it("refuses wrong arguments", () => {
    expect(() => parseCommand([])).toThrow(/Usage/);
    expect(() => parseCommand(["next", "--pr", "x", "--out", "o"])).toThrow(/PR number/);
    expect(() => parseCommand(["artifacts", "--pr", "1", "--kind", "album"])).toThrow(/--kind/);
  });
});
