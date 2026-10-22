// Reads a content-release command line and runs it: the plan (plan.ts, from sources.ts) or applying its artifacts
// (apply.ts).

import { parseCommandLine, readJsonRecord } from "../command";
import { UPLOADS_DIR } from "../uploads";
import { applyArtifacts } from "./apply";
import { planRelease, type ReleasePlan } from "./plan";
import { gitHubReader, unreleasedCommits } from "./sources";

const USAGE = `Usage: pnpm --silent content-release
       pnpm content-release apply <plan.json> <dir>`;

export type Command = { action: "plan" } | { action: "apply"; plan: string; from: string };

export function parseCommand(args: string[]): Command {
  const { positionals } = parseCommandLine(args, {}, USAGE);
  if (positionals[0] === "apply") {
    if (positionals.length !== 3) throw new Error(`apply takes a plan and a folder\n${USAGE}`);
    return { action: "apply", plan: positionals[1], from: positionals[2] };
  }
  if (positionals.length) throw new Error(`unexpected argument ${positionals[0]}\n${USAGE}`);
  return { action: "plan" };
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export async function execute(command: Command): Promise<void> {
  if (command.action === "apply") {
    const plan = readJsonRecord(command.plan) as ReleasePlan;
    for (const rel of applyArtifacts({ plan, from: command.from, uploads: UPLOADS_DIR })) console.log(rel);
    return;
  }
  const repo = env("GITHUB_REPOSITORY");
  const github = gitHubReader(repo, env("GH_TOKEN"));
  console.log(JSON.stringify(await planRelease({ repo, commits: unreleasedCommits(), github })));
}
