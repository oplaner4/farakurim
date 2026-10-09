// The staging the `pnpm stage` commands share (aktualita, porad, petrklic): where they stage and
// add content, finding the source file, and copying it to uploads/ once the name is known to be free on the server
// (files there are never overwritten).

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { NEWS_DIR, OHLASKY_DIR, ROOT } from "../content-files";

const MB = 1024 * 1024;
/** The largest source file each command stages, in MB; the usage and the size error name them. */
export const MAX_MB = { aktualita: 10, porad: 20, petrklic: 40 };

/** Where a command stages and adds content, and how it asks the server; the tests point it at a temp folder. */
export interface StageEnv {
  uploadsDir: string;
  newsDir: string;
  ohlaskyDir: string;
  /** The site's address, e.g. https://farakurim.cz. */
  site: string;
  /** Asks whether a URL exists (a HEAD request); a stub in the tests. */
  fetch: typeof fetch;
  /** The home folder whose Downloads/ holds sources given without a folder. */
  home: string;
}

/** The site's address from scripts/deploy.sh (`SITE=…`), where the server details live. */
export function siteFromDeployScript(script: string): string {
  const site = /^SITE=(\S+)/m.exec(script)?.[1];
  if (!site) throw new Error("no SITE=… in scripts/deploy.sh");
  return site;
}

export const defaultEnv = (): StageEnv => ({
  uploadsDir: join(ROOT, "uploads"),
  newsDir: NEWS_DIR,
  ohlaskyDir: OHLASKY_DIR,
  site: siteFromDeployScript(readFileSync(join(ROOT, "scripts/deploy.sh"), "utf8")),
  fetch,
  home: homedir(),
});

/** The source file: `path` (with ~ for the home folder), or a bare file name in ~/Downloads/; at most `maxMb`. */
export function sourceFile(path: string, maxMb: number, home: string): string {
  let src = /^~([/\\]|$)/.test(path) ? join(home, path.slice(2)) : path;
  if (!existsSync(src) && dirname(src) === ".") src = join(home, "Downloads", src);
  if (!existsSync(src) || !statSync(src).isFile()) throw new Error(`${path} not found (also looked in ~/Downloads/)`);
  const { size } = statSync(src);
  if (size > maxMb * MB) {
    throw new Error(
      `${basename(src)} is ${(size / MB).toFixed(1)} MB, over ${maxMb} MB: ask the user for a smaller file`,
    );
  }
  return src;
}

/** Refuses a name that is already on the server. */
async function checkFree(env: StageEnv, rel: string, takenHint: string) {
  const url = `${env.site}/uploads/${rel}`;
  let status: number;
  try {
    ({ status } = await env.fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15_000) }));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`cannot reach ${env.site} (${reason}): cannot tell whether the name is free`);
  }
  if (status < 400) throw new Error(`${url} already exists on the server: ${takenHint}`);
  if (status !== 404) throw new Error(`${url} answered ${status}: cannot tell whether the name is free`);
}

/**
 * Copies `src` to uploads/`rel` unless `check`, after making sure the name is free on the server. Staging the same
 * file again is allowed. Returns the staged path.
 */
export async function stage(env: StageEnv, src: string, rel: string, check: boolean, takenHint = "pick another id") {
  const dest = join(env.uploadsDir, rel);
  if (existsSync(dest) && !readFileSync(dest).equals(readFileSync(src))) {
    throw new Error(`uploads/${rel} is already staged with other content`);
  }
  await checkFree(env, rel, takenHint);
  if (!check) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  return dest;
}

export const stagedLine = (check: boolean, what: string) => `${check ? "Would stage" : "Staged"} ${what}`;
