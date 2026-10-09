import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hasPoppler, pdfWithText } from "./test-helpers";
import { pdfPageCount, POSTER_WIDTH, renderPetrklic, renderPoster, toWebp } from "./upload-images";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "upload-images-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** A plain image of `width`×`height` written as `name`. */
const image = async (name: string, width: number, height: number, orientation?: number) => {
  const file = join(dir, name);
  let img = sharp({ create: { width, height, channels: 3, background: { r: 40, g: 90, b: 160 } } }).jpeg();
  if (orientation) img = img.withMetadata({ orientation });
  await img.toFile(file);
  return file;
};

/** The image's size and format; read from a buffer, as sharp keeps a file it opened locked on Windows. */
const size = async (file: string) => {
  const { width, height, format } = await sharp(readFileSync(file)).metadata();
  return { width, height, format };
};

describe("toWebp", () => {
  it("scales a large image down to the width and keeps a small one", async () => {
    expect(
      await toWebp(await image("big.jpg", 1360, 1920), join(dir, "big.webp"), { width: 680, quality: 78 }),
    ).toEqual({ width: 680, height: 960 });
    expect(await size(join(dir, "big.webp"))).toEqual({ width: 680, height: 960, format: "webp" });
    expect(
      await toWebp(await image("small.jpg", 300, 400), join(dir, "small.webp"), { width: 680, quality: 78 }),
    ).toEqual({ width: 300, height: 400 });
  });

  it("turns a photo upright by its EXIF orientation and creates the folder", async () => {
    // Orientation 6: stored landscape, shown rotated by 90°.
    const out = join(dir, "nested", "photo.webp");
    expect(await toWebp(await image("photo.jpg", 400, 200, 6), out, { width: 680, quality: 78 })).toEqual({
      width: 200,
      height: 400,
    });
    expect(existsSync(out)).toBe(true);
  });
});

describe("renderPoster", () => {
  it("renders an image poster at the poster width", async () => {
    const out = join(dir, "plakat.webp");
    expect((await renderPoster(await image("plakat.jpg", 1000, 1414), out)).width).toBe(POSTER_WIDTH);
    expect((await size(out)).format).toBe("webp");
  });

  it.skipIf(!hasPoppler)("renders page 1 of a PDF poster", async () => {
    const pdf = join(dir, "plakat.pdf");
    writeFileSync(pdf, pdfWithText(["Hody v Ceske", "Program"]));
    const out = join(dir, "plakat.webp");
    // An A4 page (595 × 842 pt) scaled to the poster width: 962.3 px high, rounded either way by pdftoppm.
    const { width, height } = await renderPoster(pdf, out);
    expect(width).toBe(POSTER_WIDTH);
    expect(Math.abs(height - 962.3)).toBeLessThan(1);
    expect(readdirSync(dir).sort()).toEqual(["plakat.pdf", "plakat.webp"]);
  });
});

describe.skipIf(!hasPoppler)("renderPetrklic", () => {
  const issue = () => {
    const folder = join(dir, "2026-2");
    mkdirSync(folder);
    writeFileSync(join(folder, "petrklic-2026-2.pdf"), pdfWithText(["Petrklic 1", "Strana 2", "Strana 3"]));
    return folder;
  };

  it("renders the cover and, with pages, every page", async () => {
    const folder = issue();
    expect(pdfPageCount(join(folder, "petrklic-2026-2.pdf"))).toBe(3);
    expect(await renderPetrklic(folder)).toBe(3);
    expect(readdirSync(folder).sort()).toEqual(["cover.webp", "petrklic-2026-2.pdf"]);

    mkdirSync(join(folder, "pages"));
    writeFileSync(join(folder, "pages", "9.webp"), "an old page");
    expect(await renderPetrklic(folder, { pages: true })).toBe(3);
    expect(readdirSync(join(folder, "pages")).sort()).toEqual(["1.webp", "2.webp", "3.webp"]);
    expect(await size(join(folder, "cover.webp"))).toMatchObject({ width: 600, format: "webp" });
  });

  it("refuses a folder without the issue's PDF", async () => {
    mkdirSync(join(dir, "2026-3"));
    await expect(renderPetrklic(join(dir, "2026-3"))).rejects.toThrow("missing");
  });
});
