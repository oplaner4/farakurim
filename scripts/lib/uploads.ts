// Uploaded files: the repo's staging folder mirrors the server's, whose files are never overwritten, so a name
// is free only while the server lacks it.

import { join } from "node:path";
import { SITE_URL } from "@/content/site";
import { UPLOADS_PATH } from "@/lib/shared/uploads";
import { errorMessage } from "./command";
import { ROOT } from "./content-files";

/** Where uploaded files are staged and how the server is asked about them; the tests point it at a temp folder. */
export type UploadsEnv = {
  uploadsDir: string;
  /** The site's address, e.g. https://farakurim.cz. */
  site: string;
  /** Asks whether a URL exists (a HEAD request); a stub in the tests. */
  fetch: typeof fetch;
};

/** The repo's folder of the files to upload, as the scripts print it: <path> in it is UPLOADS_PATH<path> on the site. */
export const UPLOADS_DIR = UPLOADS_PATH.slice(1);

/** The URL of `rel` on the server. */
export const serverUrl = (env: Pick<UploadsEnv, "site">, rel: string) => `${env.site}${UPLOADS_PATH}${rel}`;

export const defaultUploadsEnv = (): UploadsEnv => ({
  uploadsDir: join(ROOT, UPLOADS_DIR),
  site: SITE_URL,
  fetch,
});

/** Whether `rel` is on the server (a HEAD request); throws when the server cannot tell. */
export async function onServer(env: UploadsEnv, rel: string): Promise<boolean> {
  const url = serverUrl(env, rel);
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
