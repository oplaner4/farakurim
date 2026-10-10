// Renders the WebP images of uploaded content: event posters for the Aktuality pages (design/DESIGN.md §11, §13)
// and the Petrklíč cover and viewer pages (§17–18). PDF pages are rendered with poppler, images resized with sharp.
// `pnpm stage` (scripts/stage/) renders them while staging; the commands re-render files already in uploads/.
//
// Usage: pnpm petrklic <id-or-folder> ... [--pages]
//   uploads/petrklic/<id>/cover.webp (page 1) and, with --pages, every page as pages/<n>.webp for the viewer.
//   Issues are given by id or by folder (`2026-2`, `uploads/petrklic/2026-2/`, `uploads/petrklic/*/`). Prints
//   `<id> <page count>` per issue.
// Usage: tsx scripts/upload-images.ts poster <poster.pdf|png|jpg> <out.webp>
//   Page 1 of a PDF, or the image, as a WebP; prints its path and `<width>x<height>`.
// Requires pdftoppm, pdfinfo and pdftotext (poppler-utils) for PDFs.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
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
  const tmp = mkdtempSync(join(tmpdir(), "upload-images-"));
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
 * The images of the Petrklíč issue folder `issueDir` (with petrklic-<id>.pdf): cover.webp and, with `pages`, every
 * page as pages/<n>.webp (the old pages are removed first). Returns the page count.
 */
export async function renderPetrklic(issueDir: string, { pages = false } = {}) {
  const id = basename(issueDir);
  const pdf = join(issueDir, `petrklic-${id}.pdf`);
  if (!existsSync(pdf)) throw new Error(`missing ${pdf}`);
  const count = pdfPageCount(pdf);
  const options = { width: PETRKLIC_WIDTH, quality: PETRKLIC_QUALITY };
  await pdfToWebp(pdf, [1, 1], () => join(issueDir, "cover.webp"), options);
  if (pages) {
    rmSync(join(issueDir, "pages"), { recursive: true, force: true });
    await pdfToWebp(pdf, [1, count], (page) => join(issueDir, "pages", `${page}.webp`), options);
  }
  return count;
}

const USAGE =
  "Usage: pnpm petrklic <id-or-folder> ... [--pages]\n       tsx scripts/upload-images.ts poster <in> <out.webp>";

type Command =
  { command: "petrklic"; ids: string[]; pages: boolean } | { command: "poster"; src: string; dest: string };

/**
 * Reads the command line `args`. An unknown option, --pages with poster or a wrong number of files throws with the
 * usage, so a typo is never taken for an issue id.
 */
export function parseCommand(args: string[]): Command {
  let parsed;
  try {
    parsed = parseArgs({ args, allowPositionals: true, options: { pages: { type: "boolean" } } });
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : error}\n${USAGE}`);
  }
  const [command, ...files] = parsed.positionals;
  const pages = parsed.values.pages ?? false;
  if (command === "petrklic" && files.length > 0) return { command, ids: files.map((file) => basename(file)), pages };
  if (command === "poster" && files.length === 2 && !pages) return { command, src: files[0], dest: files[1] };
  throw new Error(USAGE);
}

// No top-level await: tsx runs the scripts as CommonJS (package.json has no "type": "module").
async function main() {
  let command: Command;
  try {
    command = parseCommand(process.argv.slice(2));
  } catch (error) {
    console.error(`upload-images: ${error instanceof Error ? error.message : error}`);
    process.exit(2);
  }
  try {
    if (command.command === "poster") {
      const { width, height } = await renderPoster(command.src, command.dest);
      console.log(`${command.dest} ${width}x${height}`);
    } else {
      const issues = fileURLToPath(new URL("../uploads/petrklic/", import.meta.url));
      for (const id of command.ids) {
        console.log(id, await renderPetrklic(join(issues, id), { pages: command.pages }));
      }
    }
  } catch (error) {
    console.error(`upload-images: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Run as a command, not imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) void main();
