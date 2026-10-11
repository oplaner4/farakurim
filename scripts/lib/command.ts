// How every script runs as a pnpm command: read the arguments, run, and print a failure as "<name>: <message>" with
// exit code 2 for wrong arguments and 1 for a failed run.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs, type ParseArgsOptionsConfig } from "node:util";

/** The error's message, with its cause: fetch() reports a network failure as "fetch failed" with the reason there. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const { cause } = error;
  return cause === undefined ? error.message : `${error.message} (${cause instanceof Error ? cause.message : cause})`;
}

/**
 * The command line `args` read by parseArgs() with `options` and positionals; an unknown option or a missing value
 * throws with `usage`, so a typo of --check never writes.
 */
export function parseCommandLine<const T extends ParseArgsOptionsConfig>(args: string[], options: T, usage: string) {
  try {
    return parseArgs({ args, allowPositionals: true, options });
  } catch (error) {
    throw new Error(`${errorMessage(error)}\n${usage}`);
  }
}

/** The JSON record in `file` (`-` reads stdin); a file that cannot be read or is not JSON throws, naming it. */
export function readJsonRecord(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file === "-" ? 0 : file, "utf8"));
  } catch (error) {
    throw new Error(`${file === "-" ? "stdin" : file} is not a JSON file: ${errorMessage(error)}`);
  }
}

/**
 * Runs the command `name` on the command line `args`: `parse` reads them (throws for wrong arguments), `run` does the
 * work. Returns the exit code, after printing the failure.
 */
export async function commandExitCode<T>(
  name: string,
  args: string[],
  parse: (args: string[]) => T | Promise<T>,
  run: (command: T) => unknown,
): Promise<number> {
  let command: T;
  try {
    command = await parse(args);
  } catch (error) {
    console.error(`${name}: ${errorMessage(error)}`);
    return 2;
  }
  try {
    await run(command);
    return 0;
  } catch (error) {
    console.error(`${name}: ${errorMessage(error)}`);
    return 1;
  }
}

/**
 * Runs the command (commandExitCode()) when the module at `moduleUrl` (its `import.meta.url`) is the script run, not
 * when a test imports it, and exits with its code on a failure.
 */
export function runCommand<T>(
  name: string,
  moduleUrl: string,
  parse: (args: string[]) => T | Promise<T>,
  run: (command: T) => unknown,
) {
  if (process.argv[1] !== fileURLToPath(moduleUrl)) return;
  // No top-level await: tsx runs the scripts as CommonJS (package.json has no "type": "module").
  void commandExitCode(name, process.argv.slice(2), parse, run).then((code) => {
    if (code !== 0) process.exit(code);
  });
}
