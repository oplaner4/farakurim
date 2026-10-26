// Reads a content-fix command line and runs it: the steps of the comment fix workflow that need the GitHub API, the
// PR's artifacts or Claude's report.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseCommandLine } from "../command";
import { applyArtifacts } from "../content-release/apply";
import { artifactsOfPull, KINDS, type ContentPull, type Kind } from "../content-release/plan";
import { gitHubReader } from "../content-release/sources";
import { UPLOADS_DIR } from "../uploads";
import { fixInput, REPORT_END } from "./body";
import { MARKER_START, unansweredRequests } from "./comments";
import { fixReader } from "./github";
import { parseFixReport } from "./report";

const USAGE = `Usage: pnpm content-fix next --pr <n> --out <dir>
       pnpm content-fix artifacts --pr <n> --kind <sheet|events>
       pnpm content-fix apply --pr <n> --kind <sheet|events> --order <file> <dir>
       pnpm content-fix check-log --sha <sha> --out <file>
       pnpm content-fix report <report.md> --out <dir>`;

export type Command =
  | { action: "next"; pr: number; out: string }
  | { action: "artifacts"; pr: number; kind: Kind }
  | { action: "apply"; pr: number; kind: Kind; order: string; from: string }
  | { action: "check-log"; sha: string; out: string }
  | { action: "report"; file: string; out: string };

export function parseCommand(args: string[]): Command {
  const { values, positionals } = parseCommandLine(
    args,
    {
      pr: { type: "string" },
      out: { type: "string" },
      kind: { type: "string" },
      sha: { type: "string" },
      order: { type: "string" },
    },
    USAGE,
  );
  const [action, ...rest] = positionals;
  const need = <T>(value: T | undefined, option: string): T => {
    if (value === undefined) throw new Error(`${action} needs --${option}\n${USAGE}`);
    return value;
  };
  const noArguments = () => {
    if (rest.length) throw new Error(`unexpected argument ${rest[0]}\n${USAGE}`);
  };
  const pr = () => {
    const number = Number(need(values.pr, "pr"));
    if (!Number.isInteger(number) || number < 1) throw new Error(`--pr is not a PR number\n${USAGE}`);
    return number;
  };
  const kind = () => {
    const value = need(values.kind, "kind");
    if (!Object.hasOwn(KINDS, value)) throw new Error(`--kind is not ${Object.keys(KINDS).join(" or ")}\n${USAGE}`);
    return value as Kind;
  };
  switch (action) {
    case "next":
      noArguments();
      return { action, pr: pr(), out: need(values.out, "out") };
    case "artifacts":
      noArguments();
      return { action, pr: pr(), kind: kind() };
    case "apply":
      if (rest.length !== 1) throw new Error(`apply takes a folder\n${USAGE}`);
      return { action, pr: pr(), kind: kind(), order: need(values.order, "order"), from: rest[0] };
    case "check-log":
      noArguments();
      return { action, sha: need(values.sha, "sha"), out: need(values.out, "out") };
    case "report":
      if (rest.length !== 1) throw new Error(`report takes a report file\n${USAGE}`);
      return { action, file: rest[0], out: need(values.out, "out") };
    default:
      throw new Error(USAGE);
  }
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** What may ask for a fix: the repo permissions that write to it. */
const WRITE_PERMISSIONS = ["admin", "maintain", "write"];

/** The kind of a content PR: from its branch's prefix, and only when its head is this repo (a fork's is not trusted). */
function kindOf(branch: string, headRepo: string | null, repo: string): Kind | null {
  if (headRepo !== repo) return null;
  return (Object.keys(KINDS) as Kind[]).find((kind) => branch.startsWith(KINDS[kind].prefix)) ?? null;
}

function writeFileIn(file: string, content: string) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

async function next({ pr, out }: { pr: number; out: string }, fetchImpl: typeof fetch) {
  const repo = env("GITHUB_REPOSITORY");
  const reader = fixReader(repo, env("GH_TOKEN"), fetchImpl);
  const pull = await reader.pull(pr);
  const result = {
    open: pull.open,
    kind: kindOf(pull.branch, pull.headRepo, repo),
    head: pull.head,
    branch: pull.branch,
    comment: null as number | null,
    remaining: 0,
  };
  if (!pull.open) return result;
  // isFixRequest() checks the association, which is the one the comment shows; the permission is the repo's.
  const permitted = new Map<string, boolean>();
  const requests = [];
  for (const request of unansweredRequests(await reader.comments(pr))) {
    if (!permitted.has(request.author)) {
      permitted.set(request.author, WRITE_PERMISSIONS.includes(await reader.permission(request.author)));
    }
    if (permitted.get(request.author)) requests.push(request);
  }
  if (!requests.length) return result;
  writeFileIn(join(out, "comment.md"), `${requests[0].body}\n`);
  writeFileIn(join(out, "report.md"), fixInput(pull));
  return { ...result, comment: requests[0].id, remaining: requests.length - 1 };
}

/** The artifacts of the PR's commits, oldest first; an expired one throws. */
async function artifactsOf(pr: number, kind: Kind, fetchImpl: typeof fetch) {
  const github = gitHubReader(env("GITHUB_REPOSITORY"), env("GH_TOKEN"), fetchImpl);
  const { artifacts, expired } = await artifactsOfPull({ number: pr, kind }, github);
  if (expired.length) throw new Error(`PR #${pr} has an expired artifact: recreate the PR`);
  return artifacts;
}

function failedStepsMarkdown(steps: { step: string; log: string }[]): string {
  return steps.map(({ step, log }) => `## ${step}\n\n\`\`\`text\n${log}\n\`\`\`\n`).join("\n");
}

export async function execute(command: Command, fetchImpl: typeof fetch = fetch, uploads = UPLOADS_DIR): Promise<void> {
  switch (command.action) {
    case "next":
      console.log(JSON.stringify(await next(command, fetchImpl)));
      return;
    case "artifacts":
      for (const { runId, name } of await artifactsOf(command.pr, command.kind, fetchImpl)) {
        console.log(`${runId} ${name}`);
      }
      return;
    case "apply": {
      // The API is not read here: `--order` is the saved output of `artifacts`, oldest first, so a later artifact's
      // file wins as it does in a release. Folders it does not list are ignored.
      const artifacts = readFileSync(command.order, "utf8")
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [runId, name] = line.trim().split(/\s+/);
          if (!name || !/^\d+$/.test(runId))
            throw new Error(`${command.order} has a line that is not "<run id> <name>"`);
          if (!existsSync(join(command.from, name))) throw new Error(`${name} is listed but not under ${command.from}`);
          return { name, runId: Number(runId) };
        });
      // A one-PR plan: `applyArtifacts` uses only the number, kind and artifacts; the rest holds neutral values.
      const pull: ContentPull = {
        number: command.pr,
        sha: "",
        kind: command.kind,
        branch: "",
        page: KINDS[command.kind].page,
        mergedAt: "",
        artifacts,
      };
      for (const rel of applyArtifacts({
        plan: { action: "release", pulls: [pull] },
        from: command.from,
        uploads,
      })) {
        console.log(rel);
      }
      return;
    }
    case "check-log": {
      const steps = await fixReader(env("GITHUB_REPOSITORY"), env("GH_TOKEN"), fetchImpl).failedCheck(command.sha);
      if (steps.length) writeFileIn(command.out, failedStepsMarkdown(steps));
      console.log(steps.length ? "failed" : "ok");
      return;
    }
    case "report": {
      const { blocking, commit, fix, changed, report, reply } = parseFixReport(readFileSync(command.file, "utf8"));
      writeFileIn(join(command.out, "body.md"), `${report}\n\n${REPORT_END}\n`);
      // A line with a marker would mark another comment answered: the workflow appends the one real marker.
      const own = reply
        .split("\n")
        .filter((line) => !line.includes(MARKER_START))
        .join("\n");
      writeFileIn(join(command.out, "reply.md"), `${own}\n`);
      console.log(JSON.stringify({ blocking, commit, fix, changed }));
    }
  }
}
