// pnpm github-check: checks, read-only, that the GitHub repository has the setup the workflows need
// (docs/github-setup.md): squash merging, the repository's variables and secrets, the environments with their
// deployment branches and tags, reviewers, variables and secrets, and the ruleset on main with its bypass actors. It
// fails on an error (a workflow would break) and warns of names no workflow reads and of what the token cannot see.
// Secrets are checked by name only. It reads the repository from GITHUB_REPOSITORY or the origin remote, and the
// token from GH_TOKEN, GITHUB_TOKEN or `gh auth token`; an admin's token sees everything.
//
// Usage: pnpm github-check
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/github-check/command";

runCommand("github-check", import.meta.url, parseCommand, execute);
