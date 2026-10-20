import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { downloadAlbumZip } from "./zonerama-zip";
import { freshTempDir } from "../test-helpers";

const tempDir = freshTempDir("zonerama-zip");
const ZIP = Buffer.from("PK\u0003\u0004 a zip");
const zipResponse = () =>
  new Response(ZIP, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": 'attachment; filename="2026_09_27 pesi pout na Vranov.zip"',
    },
  });

/** A fetch stub answering Zonerama's three steps: start the zip, report it ready after `polls` answers, send it. */
function zonerama({ polls = 1, ready = {}, download = zipResponse } = {}) {
  let asked = 0;
  return vi.fn(async (url: string) => {
    if (url.includes("/Zip/Album/")) return Response.json({ Id: "z1" });
    if (url.includes("/Zip/IsReady/z1")) {
      return ++asked < polls
        ? Response.json({ IsReady: false, Progress: 0.5, Error: null })
        : Response.json({ IsReady: true, Progress: 1, Url: "/Zip/Download/z1", Error: null, ...ready });
    }
    if (url.endsWith("/Zip/Download/z1")) return download();
    return new Response("not found", { status: 404 });
  });
}
const noWait = async () => {};

describe("downloadAlbumZip", () => {
  it("asks Zonerama for the album without videos and saves the zip under its name", async () => {
    const fetch = zonerama({ polls: 3 });
    const zip = await downloadAlbumZip("16583642", tempDir(), {
      fetch: fetch as unknown as typeof globalThis.fetch,
      wait: noWait,
    });
    expect(basename(zip)).toBe("2026_09_27 pesi pout na Vranov.zip");
    expect(readFileSync(zip)).toEqual(ZIP);
    const start = new URL(fetch.mock.calls[0][0]);
    expect(start.pathname).toBe("/Zip/Album/16583642");
    expect(start.searchParams.get("includeVideos")).toBe("false");
    expect(start.searchParams.get("original")).toBe("false");
    expect(fetch.mock.calls.filter(([url]) => url.includes("IsReady"))).toHaveLength(3);
  });

  it("reuses the zip of an earlier download", async () => {
    const options = { fetch: zonerama() as unknown as typeof globalThis.fetch, wait: noWait };
    const first = await downloadAlbumZip("16583642", tempDir(), options);
    const again = zonerama();
    expect(
      await downloadAlbumZip("16583642", tempDir(), {
        fetch: again as unknown as typeof globalThis.fetch,
        wait: noWait,
      }),
    ).toBe(first);
    expect(again).not.toHaveBeenCalled();
  });

  it("refuses an answer that is not a zip, such as a bot-detection page, and keeps nothing", async () => {
    const fetch = zonerama({
      download: () => new Response("<html>Bot Detected</html>", { headers: { "content-type": "text/html" } }),
    });
    await expect(
      downloadAlbumZip("16583642", tempDir(), { fetch: fetch as unknown as typeof globalThis.fetch, wait: noWait }),
    ).rejects.toThrow(/did not send a zip[^]*--photos <zip>/);
    expect(readdirSync(tempDir()).flatMap((d) => readdirSync(join(tempDir(), d)))).toEqual([]);
  });

  it("passes on Zonerama's error", async () => {
    const fetch = zonerama({ ready: { IsReady: false, Error: "Album je příliš velké" } });
    await expect(
      downloadAlbumZip("16583642", tempDir(), { fetch: fetch as unknown as typeof globalThis.fetch, wait: noWait }),
    ).rejects.toThrow(/Album je příliš velké[^]*--photos <zip>/);
  });

  it("gives up when the zip is never ready", async () => {
    const fetch = zonerama({ polls: Infinity });
    await expect(
      downloadAlbumZip("16583642", tempDir(), {
        fetch: fetch as unknown as typeof globalThis.fetch,
        wait: noWait,
        attempts: 5,
      }),
    ).rejects.toThrow(/not ready[^]*--photos <zip>/);
    expect(fetch.mock.calls.filter(([url]) => url.includes("IsReady"))).toHaveLength(5);
  });

  it("refuses a start Zonerama does not answer", async () => {
    const fetch = vi.fn(async () => new Response("error", { status: 500 }));
    await expect(
      downloadAlbumZip("16583642", tempDir(), { fetch: fetch as unknown as typeof globalThis.fetch, wait: noWait }),
    ).rejects.toThrow(/answered 500[^]*--photos <zip>/);
    expect(existsSync(join(tempDir(), "zonerama-16583642"))).toBe(false);
  });
});
