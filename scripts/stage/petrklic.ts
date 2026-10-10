// `pnpm stage petrklic` (scripts/stage/cli.ts): checks the issue (scripts/add-petrklic.ts), stages its PDF as
// uploads/petrklic/<folder>/petrklic-<id>.pdf, renders cover.webp and pages/ (images.ts) and adds the issue to
// src/content/petrklic.json. The folder is the id, or <id>-r<rev> for a corrected PDF (--rev), which replaces the
// issue's record: files on the server are never overwritten, so a corrected PDF needs a new folder.

import { existsSync, rmSync } from "node:fs";
import { extname, join } from "node:path";
import { issueFolder } from "@/lib/petrklic/issues";
import { addPetrklic, petrklicLines } from "../add-petrklic";
import { MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";
import { pdfPageCount, renderPetrklic } from "./images";

export interface PetrklicOptions {
  source: string;
  year: number;
  number: number;
  note?: string;
  /** A corrected PDF of an issue already in petrklic.json, from 2. */
  rev?: number;
  check?: boolean;
}

/**
 * Stages a Petrklíč PDF, renders its cover and pages and adds the issue (or, with `rev`, replaces it); returns the
 * lines to print and the file written. The issue is checked before anything is copied.
 */
export async function stagePetrklic(env: StageEnv, options: PetrklicOptions) {
  const { year, number, note, rev, check = false } = options;
  const src = sourceFile(options.source, MAX_MB.petrklic, env.home);
  if (extname(src).toLowerCase() !== ".pdf") throw new Error("the Petrklíč is a PDF");
  const pageCount = pdfPageCount(src);
  const record = { year, number, ...(note !== undefined && { note }), ...(rev !== undefined && { rev }), pageCount };
  const checked = addPetrklic(env.petrklicFile, record, { check: true });
  const { id } = checked;
  const name = issueFolder({ id, rev });
  const folder = join(env.uploadsDir, "petrklic", name);
  const existed = existsSync(folder);
  const pdf = `petrklic/${name}/petrklic-${id}.pdf`;
  const hint = `this issue is already published; for a corrected PDF pass --rev ${(rev ?? 1) + 1}`;
  await stage(env, src, pdf, check, hint);
  let result = checked;
  if (!check) {
    try {
      await renderPetrklic(join(env.uploadsDir, pdf), { pages: true });
      result = addPetrklic(env.petrklicFile, record);
    } catch (error) {
      // A folder staged for an issue that never made it into petrklic.json would go out with the next release.
      if (!existed) rmSync(folder, { recursive: true, force: true });
      throw error;
    }
  }
  return {
    lines: [
      stagedLine(check, `uploads/petrklic/${name}/ (PDF${check ? "" : ", cover.webp, pages/"}), ${pageCount} pages`),
      ...petrklicLines(result, check),
    ],
    written: result.written,
  };
}
