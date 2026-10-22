// pnpm content-release: plans the release of merged content PRs (service sheets, events) for the content-release
// workflow (only that workflow runs it). It reads the commits since the last release tag and, from the GitHub API,
// their PRs and the artifacts of the PRs' commits, and prints the plan as one JSON document on stdout: `skip` when no
// unreleased commit is a content PR's squash commit, `none` when everything is released, `blocked` with the reason
// (main has a feat or content commit that only a release by hand may publish, an artifact expired, or a commit pushed
// by hand has none), or `release` with the PRs in merge order and the artifacts to apply.
//
// With `apply`, it copies the artifacts of a plan, downloaded each into `<dir>/<artifact name>/`, into uploads/ for
// `pnpm release` to upload: every file is checked first (only under its PR's kind's folder, a type the site links, no
// symlink), so one wrong file copies nothing.
//
// Usage: pnpm --silent content-release
//        pnpm content-release apply <plan.json> <dir>
// The plan reads the repository and the token from GITHUB_REPOSITORY and GH_TOKEN.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/content-release";

runCommand("content-release", import.meta.url, parseCommand, execute);
