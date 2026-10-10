// `pnpm stage petrklic` (scripts/stage/cli.ts): checks the issue (scripts/add-petrklic.ts), stages its PDF as
// uploads/petrklic/<id>/petrklic-<id>.pdf, renders cover.webp and pages/ (scripts/upload-images.ts) and adds the
// issue to src/content/petrklic.json.

import { existsSync, rmSync } from "node:fs";
import { extname, join } from "node:path";
import { addPetrklic, petrklicLines } from "../add-petrklic";
import { MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";
import { pdfPageCount, renderPetrklic } from "../upload-images";

export interface PetrklicOptions {
  source: string;
  year: number;
  number: number;
  note?: string;
  check?: boolean;
}

/**
 * Stages a Petrklíč PDF, renders its cover and pages and adds the issue; returns the lines to print and the file
 * written. The issue is checked before anything is copied.
 */
export async function stagePetrklic(env: StageEnv, options: PetrklicOptions) {
  const { year, number, note, check = false } = options;
  const src = sourceFile(options.source, MAX_MB.petrklic, env.home);
  if (extname(src).toLowerCase() !== ".pdf") throw new Error("the Petrklíč is a PDF");
  const pageCount = pdfPageCount(src);
  const record = { year, number, ...(note !== undefined && { note }), pageCount };
  const checked = addPetrklic(env.petrklicFile, record, { check: true });
  const { id } = checked;
  const folder = join(env.uploadsDir, "petrklic", id);
  const existed = existsSync(folder);
  await stage(env, src, `petrklic/${id}/petrklic-${id}.pdf`, check);
  let result = checked;
  if (!check) {
    try {
      await renderPetrklic(folder, { pages: true });
      result = addPetrklic(env.petrklicFile, record);
    } catch (error) {
      // A folder staged for an issue that never made it into petrklic.json would go out with the next release.
      if (!existed) rmSync(folder, { recursive: true, force: true });
      throw error;
    }
  }
  return {
    lines: [
      stagedLine(check, `uploads/petrklic/${id}/ (PDF${check ? "" : ", cover.webp, pages/"}), ${pageCount} pages`),
      ...petrklicLines(result, check),
    ],
    written: result.written,
  };
}
