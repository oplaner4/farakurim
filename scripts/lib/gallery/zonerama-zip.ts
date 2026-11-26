// Downloads the zip of a Zonerama album as the album's "Stáhnout" dialog does by default: without its videos and
// without "originály" (the site resizes the photos to at most 1600 px anyway). Zonerama prepares the zip
// (/web/download/zip/Album?id=<n>), reports it ready (/web/download/zip/IsReady?id=<id>) and sends it from the signed
// URL that answer gives (on media.zonerama.com). These are the dialog's own requests, not a published API, so any
// answer but a zip throws and the user gives the zip by hand. Zonerama's Cloudflare bot check refuses scripts at times
// (403 with `cf-mitigated: challenge`); that is reported as such and never worked around. The zip is kept in its own
// folder of `cacheDir` and reused, so the proposal and --write download it once.

import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import { errorMessage } from "../command";
import { next, refusal } from "../output";

const ZONERAMA = "https://eu.zonerama.com";
const BY_HAND = "download the album's zip from Zonerama by hand and pass --photos <zip>";

export type ZipOptions = {
  fetch: typeof fetch;
  /** Waits between the readiness checks; instant in the tests. */
  wait?: (ms: number) => Promise<void>;
  /** Readiness checks before giving up, one a second. */
  attempts?: number;
};

/** The folder `downloadAlbumZip` keeps album `number`'s zip in. */
export const zipFolder = (cacheDir: string, number: string) => join(cacheDir, `zonerama-${number}`);

/** The file name of a `content-disposition` header, or `undefined`. */
function attachmentName(header: string | null): string | undefined {
  const name = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1];
  return name && basename(decodeURIComponent(name));
}

/** Throws when `response` is not OK, naming Cloudflare's bot check when that is what refused it. */
function assertOk(response: Response, url: string) {
  if (response.headers.get("cf-mitigated") === "challenge") {
    throw new Error("Zonerama's Cloudflare bot check refused the script");
  }
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
}

async function json<T>(url: string, fetch: typeof globalThis.fetch): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  assertOk(response, url);
  return (await response.json()) as T;
}

/** Asks Zonerama to prepare album `number`'s zip without its videos and returns its URL once it is ready. */
async function preparedZipUrl(number: string, { fetch, wait, attempts }: Required<ZipOptions>): Promise<string> {
  const start = new URL("/web/download/zip/Album", ZONERAMA);
  start.search = new URLSearchParams({
    id: number,
    includeVideos: "false",
    original: "false",
    av1: "false",
    raw: "false",
  }).toString();
  const { Id } = await json<{ Id?: string }>(start.href, fetch);
  if (!Id) throw new Error("Zonerama did not start the zip");
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await wait(1000);
    const status = await json<{ IsReady?: boolean; Url?: string; Error?: string | null }>(
      `${ZONERAMA}/web/download/zip/IsReady?${new URLSearchParams({ id: Id })}`,
      fetch,
    );
    if (status.Error) throw new Error(`Zonerama: ${status.Error}`);
    if (status.IsReady && status.Url) return new URL(status.Url, ZONERAMA).href;
  }
  throw new Error(`the zip was not ready after ${attempts} checks`);
}

/** Saves the zip at `url` into `folder` under the name Zonerama gives it; anything but a zip throws. */
async function saveZip(url: string, folder: string, number: string, fetch: typeof globalThis.fetch): Promise<string> {
  const response = await fetch(url);
  assertOk(response, url);
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("application/zip") || !response.body) {
    throw new Error(`Zonerama did not send a zip (${response.status}, ${type || "no content type"})`);
  }
  mkdirSync(folder, { recursive: true });
  const zip = join(folder, attachmentName(response.headers.get("content-disposition")) ?? `album-${number}.zip`);
  // Written under another name first, so a broken download is never taken for the zip.
  await pipeline(Readable.fromWeb(response.body as ReadableStream), createWriteStream(`${zip}.part`));
  renameSync(`${zip}.part`, zip);
  return zip;
}

/**
 * The zip of album `number` without its videos, downloaded into its folder of `cacheDir` under the name Zonerama
 * gives it (its title and date, as the user's download), or the zip an earlier call left there. Any failure throws,
 * telling the user to give the zip by hand, and leaves no folder behind.
 */
export async function downloadAlbumZip(
  number: string,
  cacheDir: string,
  { fetch, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), attempts = 600 }: ZipOptions,
): Promise<string> {
  const folder = zipFolder(cacheDir, number);
  const kept = existsSync(folder) ? readdirSync(folder).find((name) => name.endsWith(".zip")) : undefined;
  if (kept) return join(folder, kept);
  try {
    return await saveZip(await preparedZipUrl(number, { fetch, wait, attempts }), folder, number, fetch);
  } catch (error) {
    rmSync(folder, { recursive: true, force: true });
    throw refusal(`could not download album ${number} (${errorMessage(error)})`, next(BY_HAND));
  }
}
