// Reads a github-check command line and runs it: reads the repository's setup (read.ts), compares it (check.ts) and
// prints the findings; any error fails the command.

import { execFileSync } from "node:child_process";
import { errorMessage, parseCommandLine } from "../command";
import { checkRepository } from "./check";
import { readRepository } from "./read";

const USAGE = "Usage: pnpm github-check";

export function parseCommand(args: string[]): Record<string, never> {
  const { positionals } = parseCommandLine(args, {}, USAGE);
  if (positionals.length) throw new Error(`unexpected argument ${positionals[0]}\n${USAGE}`);
  return {};
}

/** "owner/name" of a GitHub remote URL (https or ssh), or null. */
export function repositoryOfRemote(url: string): string | null {
  const match = /github\.com[:/]([^/]+\/[^/]+?)(\.git)?\/?$/.exec(url.trim());
  return match ? match[1] : null;
}

function repository(): string {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" });
  const repo = repositoryOfRemote(url);
  if (!repo) throw new Error(`origin is not a GitHub repository (${url.trim()}): set GITHUB_REPOSITORY`);
  return repo;
}

function token(): string {
  const fromEnv = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (fromEnv) return fromEnv;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch (error) {
    throw new Error(`no token: log in with \`gh auth login\` or set GH_TOKEN (${errorMessage(error)})`);
  }
}

export async function execute(): Promise<void> {
  const repo = repository();
  const findings = checkRepository(await readRepository(repo, token()));
  for (const { level, message } of findings) console.log(`${level}: ${message}`);
  const errors = findings.filter((finding) => finding.level === "error").length;
  if (errors) throw new Error(`${errors} ${errors === 1 ? "error" : "errors"} in the GitHub setup of ${repo}`);
  console.log(`The GitHub setup of ${repo} has what the workflows need.`);
}
