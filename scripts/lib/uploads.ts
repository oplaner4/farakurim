// What the content scripts (`pnpm stage`, `pnpm poster-aktualita`) know about uploaded files: uploads/ in the repo
// mirrors /uploads/ on the server, whose files are never overwritten, so a name is free only while the server lacks
// it. The site's address comes from scripts/deploy.sh, where the server details live.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { errorMessage } from "./command";
import { ROOT } from "./content-files";

/** Where uploaded files are staged and how the server is asked about them; the tests point it at a temp folder. */
export interface UploadsEnv {
  uploadsDir: string;
  /** The site's address, e.g. https://farakurim.cz. */
  site: string;
  /** Asks whether a URL exists (a HEAD request); a stub in the tests. */
  fetch: typeof fetch;
}

/** The site's address from scripts/deploy.sh (`SITE=…`). */
export function siteFromDeployScript(script: string): string {
  const site = /^SITE=(\S+)/m.exec(script)?.[1];
  if (!site) throw new Error("no SITE=… in scripts/deploy.sh");
  return site;
}

export const defaultUploadsEnv = (): UploadsEnv => ({
  uploadsDir: join(ROOT, "uploads"),
  site: siteFromDeployScript(readFileSync(join(ROOT, "scripts/deploy.sh"), "utf8")),
  fetch,
});

/** Whether uploads/`rel` is on the server (a HEAD request); throws when the server cannot tell. */
export async function onServer(env: UploadsEnv, rel: string): Promise<boolean> {
  const url = `${env.site}/uploads/${rel}`;
  let status: number;
  try {
    ({ status } = await env.fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15_000) }));
  } catch (error) {
    throw new Error(`cannot reach ${env.site} (${errorMessage(error)}): cannot tell whether the name is free`);
  }
  if (status !== 404 && status >= 400)
    throw new Error(`${url} answered ${status}: cannot tell whether the name is free`);
  return status < 400;
}
