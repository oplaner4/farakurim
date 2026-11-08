// Runs git in a checkout and returns its output; a failing git throws (its status on the error).

import { execFileSync } from "node:child_process";

/** The output of `git <args>` in `cwd`, untrimmed; stderr is captured, not shown. */
export const git = (cwd: string, ...args: string[]): string =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" });
