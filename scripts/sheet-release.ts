// pnpm sheet-release: plans the release of merged service sheet PRs for the service-sheet-release workflow (only that
// workflow runs it). It reads the commits since the last release tag and, from the GitHub API, their PRs and the PDF
// artifacts of the PRs' commits, and prints the plan as one JSON document on stdout: `skip` when the pushed commit is
// not a sheet PR's squash commit, `none` when everything is released, `blocked` with the reason (main has other
// unreleased commits, or a PDF artifact expired), or `release` with the PRs in merge order and the artifacts to apply.
//
// Usage: pnpm --silent sheet-release --pushed <sha>
// The repository and the token come from GITHUB_REPOSITORY and GH_TOKEN.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/services/sheet-release";

runCommand("sheet-release", import.meta.url, parseCommand, execute);
