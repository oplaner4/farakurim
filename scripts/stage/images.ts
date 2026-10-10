// Renders the WebP images of staged content for the `pnpm stage` commands: event posters for the Aktuality pages
// (design/DESIGN.md §11, §13) and the Petrklíč cover and viewer pages (§17–18), and reads a PDF's page count and
// first-page text. PDF pages are rendered with poppler, images resized with sharp.
// Requires pdftoppm, pdfinfo and pdftotext (poppler-utils) for PDFs.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import sharp from "sharp";

export const POSTER_WIDTH = 680; // 2× the largest poster box (340 px wide on the detail page)
export const POSTER_QUALITY = 78;
export const PETRKLIC_WIDTH = 600; // 2× the largest cover and viewer page (300 px)
export const PETRKLIC_QUALITY = 72;

// stderr is piped, so the font warnings of poppler builds without fonts stay quiet; a failure still reports it.
const poppler = (tool: string, args: string[]) => execFileSync(tool, args, { encoding: "utf8", stdio: "pipe" });

/** The number of pages of `pdf`. */
export function pdfPageCount(pdf: string): number {
  const match = /^Pages:\s+(\d+)/m.exec(poppler("pdfinfo", [pdf]));
  if (!match) throw new Error(`pdfinfo found no page count in ${pdf}`);
  return Number(match[1]);
}

/** The text of the first page of `pdf`. */
export const pdfFirstPageText = (pdf: string) => poppler("pdftotext", ["-l", "1", pdf, "-"]);

/**
 * `input` (an image) as a WebP at `dest`, at most `width` px wide, turned upright by its EXIF orientation and on
 * white where it is transparent. Returns the WebP's size.
 */
export async function toWebp(input: string, dest: string, { width, quality }: { width: number; quality: number }) {
  mkdirSync(dirname(dest), { recursive: true });
  // A buffer, not the path: sharp would keep the file open, and Windows then cannot delete or replace it.
  const info = await sharp(readFileSync(input))
    .autoOrient()
    .resize({ width, withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .webp({ quality, effort: 6 })
    .toFile(dest);
  return { width: info.width, height: info.height };
}

/** Renders pages `first`..`last` of `pdf`, `width` px wide, to the WebP `dest(page)` of each page. */
async function pdfToWebp(
  pdf: string,
  [first, last]: [number, number],
  dest: (page: number) => string,
  options: { width: number; quality: number },
) {
  const tmp = mkdtempSync(join(tmpdir(), "images-"));
  try {
    const size = String(options.width);
    poppler("pdftoppm", [
      "-f",
      `${first}`,
      "-l",
      `${last}`,
      "-scale-to-x",
      size,
      "-scale-to-y",
      "-1",
      "-png",
      pdf,
      join(tmp, "p"),
    ]);
    const sizes = [];
    // pdftoppm names the pages p-1.png, p-01.png or p-001.png, padded to the page count's digits.
    for (const file of readdirSync(tmp).sort()) {
      const page = /^p-0*(\d+)\.png$/.exec(file)?.[1];
      if (page) sizes.push(await toWebp(join(tmp, file), dest(Number(page)), options));
    }
    return sizes;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** An event poster (page 1 of a PDF, or an image) as a WebP at `dest`. Returns its size. */
export async function renderPoster(src: string, dest: string) {
  const options = { width: POSTER_WIDTH, quality: POSTER_QUALITY };
  if (extname(src).toLowerCase() !== ".pdf") return toWebp(src, dest, options);
  const [size] = await pdfToWebp(src, [1, 1], () => dest, options);
  return size;
}

/**
 * The images of the Petrklíč issue `pdf`, next to it in its folder: cover.webp and, with `pages`, every page as
 * pages/<n>.webp (the old pages are removed first). Returns the page count.
 */
export async function renderPetrklic(pdf: string, { pages = false } = {}) {
  if (!existsSync(pdf)) throw new Error(`missing ${pdf}`);
  const issueDir = dirname(pdf);
  const count = pdfPageCount(pdf);
  const options = { width: PETRKLIC_WIDTH, quality: PETRKLIC_QUALITY };
  await pdfToWebp(pdf, [1, 1], () => join(issueDir, "cover.webp"), options);
  if (pages) {
    rmSync(join(issueDir, "pages"), { recursive: true, force: true });
    await pdfToWebp(pdf, [1, count], (page) => join(issueDir, "pages", `${page}.webp`), options);
  }
  return count;
}
