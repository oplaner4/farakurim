import { existsSync, readFileSync, rmSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { readEvents } from "@/content/news";
import { POSTER_WIDTH } from "../images";
import { stageEvent } from "../stage/event";
import { useStageFixture } from "../test-helpers";
import { parseCommand, setEventPoster, posterLines } from "./event-poster";

describe("setEventPoster", { timeout: 30_000 }, () => {
  const { env, fetchMock, download, uploaded, poster } = useStageFixture();
  const id = "test-farni-den-2026";
  const record = { id, title: "Farní den", start: "2026-10-20", place: "Kuřim", text: "Zveme." };
  const added = () => readEvents(env.newsDir).find((e) => e.id === id);
  const lines = async (label: string | null, check = false) =>
    posterLines(id, label, await setEventPoster(env, id, label, { check }), check, env.uploadsDir);

  /** The event with a "Plakát" (its poster), a "Leták" and a "Záznam". */
  const add = async () => {
    const files = [
      { source: await poster("plakat.jpg"), label: "Plakát" },
      { source: await poster("letak.jpg", 800), label: "Leták" },
      { source: download("zaznam.mp3", "x"), label: "Záznam" },
    ];
    await stageEvent(env, { id, files, record: { ...record, poster: { alt: "Plakát: Farní den 20. října" } } });
  };

  it("renders the poster from another attachment, keeping the alt text", async () => {
    await add();
    expect(await lines("Leták", true)).toEqual([
      "Would render uploads/aktuality/test-farni-den-2026-letak-poster.webp from uploads/aktuality/test-farni-den-2026-letak.jpg",
      "Would replace the record in src/content/news/2026/10.json",
      "Changed: poster",
    ]);
    expect(existsSync(uploaded("aktuality", "test-farni-den-2026-letak-poster.webp"))).toBe(false);
    expect(added()?.poster?.src).toBe("/uploads/aktuality/test-farni-den-2026-plakat-poster.webp");

    expect((await lines("Leták"))[0]).toBe(
      "Rendered uploads/aktuality/test-farni-den-2026-letak-poster.webp from uploads/aktuality/test-farni-den-2026-letak.jpg",
    );
    expect(added()?.poster).toEqual({
      src: "/uploads/aktuality/test-farni-den-2026-letak-poster.webp",
      alt: "Plakát: Farní den 20. října",
    });
    const webp = uploaded("aktuality", "test-farni-den-2026-letak-poster.webp");
    // Read from a buffer: sharp keeps a file it opened locked on Windows, and the fixture could not delete it.
    expect((await sharp(readFileSync(webp)).metadata()).width).toBe(POSTER_WIDTH);
    expect(await lines("Leták")).toEqual(['"Leták" is already the poster of test-farni-den-2026']);
  });

  it("removes the poster, and links one the server has without rendering it", async () => {
    await add();
    expect(await lines(null)).toEqual([
      "Removed the poster (its WebP stays on the server)",
      "Replaced the record in src/content/news/2026/10.json",
      "Changed: poster",
    ]);
    expect(added()?.poster).toBeUndefined();
    await expect(setEventPoster(env, id, null)).rejects.toThrow(`${id} has no poster`);

    // Released: the "Plakát" attachment's poster is on the server, and the copy in uploads/ is gone.
    rmSync(uploaded("aktuality", "test-farni-den-2026-plakat-poster.webp"));
    fetchMock.mockImplementation(
      async (url: string) => new Response(null, { status: url.endsWith("-poster.webp") ? 200 : 404 }),
    );
    expect((await lines("Plakát"))[0]).toBe('Linked the poster of "Plakát", already on the server');
    expect(added()?.poster).toEqual({
      src: "/uploads/aktuality/test-farni-den-2026-plakat-poster.webp",
      alt: "Plakát: Farní den",
    });
    expect(existsSync(uploaded("aktuality", "test-farni-den-2026-plakat-poster.webp"))).toBe(false);
  });

  it("refuses an unknown event or attachment, audio, and a file missing in uploads/", async () => {
    await add();
    await expect(setEventPoster(env, "test-nic-2026", "Plakát")).rejects.toThrow("there is no event test-nic-2026");
    await expect(setEventPoster(env, id, "Program")).rejects.toThrow(`${id} has no attachment "Program"`);
    await expect(setEventPoster(env, id, "Záznam")).rejects.toThrow(
      'the attachment "Záznam" is not an image or PDF, so it cannot be the poster',
    );
    rmSync(uploaded("aktuality", "test-farni-den-2026-letak.jpg"));
    await expect(setEventPoster(env, id, "Leták", { check: true })).rejects.toThrow(
      "uploads/aktuality/test-farni-den-2026-letak.jpg is not here: pnpm pull-uploads fetches it from the server",
    );
    expect(added()?.poster?.src).toBe("/uploads/aktuality/test-farni-den-2026-plakat-poster.webp");
  });
});

describe("parseCommand", () => {
  it("reads the id, then the label or --none, and --check", () => {
    expect(parseCommand(["x-2026", "Plakát"])).toEqual({ id: "x-2026", label: "Plakát", check: false });
    expect(parseCommand(["x-2026", "--none", "--check"])).toEqual({ id: "x-2026", label: null, check: true });
  });

  it("refuses a missing or extra label and an unknown option", () => {
    expect(() => parseCommand(["x-2026"])).toThrow(/^Usage: pnpm event-poster/);
    expect(() => parseCommand(["x-2026", "Plakát", "--none"])).toThrow(/^Usage: pnpm event-poster/);
    expect(() => parseCommand(["x-2026", "Plakát", "--chek"])).toThrow(/--chek[^]*\nUsage: pnpm event-poster/);
  });
});
