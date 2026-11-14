// Staging a file for the server: where it is staged and its record added, finding the source file, and copying it to
// the staging folder once the name is known to be free on the server (files there are never overwritten).

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { actionVerb } from "../command";
import { EXCEPTIONS_FILE, NEWS_DIR, SERVICE_SHEETS_FILE, PETRKLIC_FILE, ROOT } from "../content-files";
import { defaultUploadsEnv, onServer, serverUrl, UPLOADS_DIR, type UploadsEnv } from "../uploads";
import { ask, next, refusal, state } from "../output";

const MB = 1024 * 1024;
/** The largest source file each command stages, in MB; the usage and the size error name them. */
export const MAX_MB = { event: 10, sheet: 20, petrklic: 40 };

/** Where a command stages and adds content, and how it asks the server; the tests point it at a temp folder. */
export type StageEnv = UploadsEnv & {
  newsDir: string;
  serviceSheetsFile: string;
  exceptionsFile: string;
  petrklicFile: string;
  /** public/.htaccess, whose redirects may lead to a file that moved. */
  htaccessFile: string;
  /** The home folder whose Downloads/ holds sources given without a folder. */
  home: string;
  /** Where a service sheet run writes its result (STAGE_RESULT, set by the CI run); none writes nothing. */
  result?: string;
};

export const defaultEnv = (): StageEnv => ({
  ...defaultUploadsEnv(),
  newsDir: NEWS_DIR,
  serviceSheetsFile: SERVICE_SHEETS_FILE,
  exceptionsFile: EXCEPTIONS_FILE,
  petrklicFile: PETRKLIC_FILE,
  htaccessFile: join(ROOT, "public/.htaccess"),
  home: homedir(),
  ...(process.env.STAGE_RESULT && { result: process.env.STAGE_RESULT }),
});

/** The source file: `path` (with ~ for the home folder), or a bare file name in ~/Downloads/; at most `maxMb`. */
export function sourceFile(path: string, maxMb: number, home: string): string {
  let src = /^~([/\\]|$)/.test(path) ? join(home, path.slice(2)) : path;
  if (!existsSync(src) && dirname(src) === ".") src = join(home, "Downloads", src);
  if (!existsSync(src) || !statSync(src).isFile()) throw new Error(`${path} not found (also looked in ~/Downloads/)`);
  const { size } = statSync(src);
  if (size > maxMb * MB) {
    throw refusal(
      `${basename(src)} is ${(size / MB).toFixed(1)} MB, over ${maxMb} MB`,
      ask("Is there a smaller file?"),
    );
  }
  return src;
}

/** Refuses a name that is already on the server, with the tagged lines `takenHint`. */
async function checkFree(env: StageEnv, rel: string, takenHint: string[]) {
  if (await onServer(env, rel)) throw refusal(`${serverUrl(env, rel)} already exists on the server`, ...takenHint);
}

/**
 * The rev of a corrected PDF whose record has `current` (undefined for the first PDF), named `rel(rev)`:
 * `current` while that file is not on the server yet (the staged one is replaced), else the next rev
 * (src/lib/shared/revision.ts).
 */
export async function correctedRev(env: StageEnv, current: number | undefined, rel: (rev?: number) => string) {
  return (await onServer(env, rel(current))) ? (current ?? 1) + 1 : current;
}

/** The step for a run without --record, which stages nothing. */
export const RECORD_OR_CHECK = "pass --record, or --check to check without staging";

/** The refusal's lines when a corrected PDF's name is taken on the server: the file is published. */
export const correctedHint = () => [state("published"), next("pass --corrected for a corrected PDF")];

/**
 * Copies `src` to `rel` in the staging folder unless `check`, after making sure the name is free on the server. Staging the same
 * file again is allowed, and another file only with `replace` (a corrected PDF). Returns the staged path.
 */
export async function stage(
  env: StageEnv,
  src: string,
  rel: string,
  check: boolean,
  takenHint = [next("pick another id")],
  replace = false,
) {
  const dest = join(env.uploadsDir, rel);
  if (!replace && existsSync(dest) && !readFileSync(dest).equals(readFileSync(src))) {
    throw new Error(`${UPLOADS_DIR}${rel} is already staged with other content`);
  }
  await checkFree(env, rel, takenHint);
  if (!check) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  return dest;
}

/** The line saying `rel` was (or, with `check`, would be) staged. */
export const stagedLine = (check: boolean, rel: string) => `${actionVerb(check, "stage")} ${UPLOADS_DIR}${rel}`;
