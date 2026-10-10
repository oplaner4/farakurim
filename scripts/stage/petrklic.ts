// `pnpm stage petrklic` (scripts/stage/cli.ts): checks the issue (scripts/add-petrklic.ts), stages its PDF as
// uploads/petrklic/<folder>/petrklic-<id>.pdf, renders cover.webp and pages/ (images.ts) and adds the issue to
// src/content/petrklic.json. The folder is the id, or <id>-r<rev> for a corrected PDF (--corrected), which replaces
// the issue's record: files on the server are never overwritten, so a corrected PDF of a released issue needs a new
// folder, while an unreleased one is replaced in its folder.

import { existsSync, rmSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { issueFolder, issueId } from "@/lib/petrklic/issues";
import { addPetrklic, petrklicLines, readPetrklic } from "../add-petrklic";
import { MAX_MB, onServer, sourceFile, stage, stagedLine, type StageEnv } from "./core";
import { pdfPageCount, renderPetrklic } from "./images";

export interface PetrklicOptions {
  source: string;
  year: number;
  number: number;
  note?: string;
  /** A corrected PDF of an issue already in petrklic.json. */
  corrected?: boolean;
  check?: boolean;
}

/** The issue's PDF in uploads/: the folder carries the rev, the file keeps the id. */
const pdfPath = (id: string, rev?: number) => `petrklic/${issueFolder({ id, rev })}/petrklic-${id}.pdf`;

/**
 * The rev of a corrected PDF of the issue `id`: its current rev while that folder is not on the server yet (it is
 * replaced there), else the next one.
 */
async function correctedRev(env: StageEnv, id: string): Promise<number | undefined> {
  const current = readPetrklic(env.petrklicFile).issues.find((issue) => issueId(issue) === id);
  if (!current) return undefined; // addPetrklic refuses it
  return (await onServer(env, pdfPath(id, current.rev))) ? (current.rev ?? 1) + 1 : current.rev;
}

/**
 * Stages a Petrklíč PDF, renders its cover and pages and adds the issue (or, `corrected`, replaces it); returns the
 * lines to print and the file written. The issue is checked before anything is copied.
 */
export async function stagePetrklic(env: StageEnv, options: PetrklicOptions) {
  const { year, number, note, corrected = false, check = false } = options;
  const src = sourceFile(options.source, MAX_MB.petrklic, env.home);
  if (extname(src).toLowerCase() !== ".pdf") throw new Error("the Petrklíč is a PDF");
  const pageCount = pdfPageCount(src);
  const id = issueId({ year, number, note });
  const rev = corrected ? await correctedRev(env, id) : undefined;
  const record = { year, number, ...(note !== undefined && { note }), ...(rev !== undefined && { rev }), pageCount };
  const checked = addPetrklic(env.petrklicFile, record, { check: true, replace: corrected });
  const pdf = pdfPath(id, rev);
  const folder = join(env.uploadsDir, "petrklic", issueFolder({ id, rev }));
  const existed = existsSync(folder);
  const hint = "this issue is already published; for a corrected PDF pass --corrected";
  await stage(env, src, pdf, check, hint, corrected);
  let result = checked;
  if (!check) {
    try {
      await renderPetrklic(join(env.uploadsDir, pdf), { pages: true });
      result = addPetrklic(env.petrklicFile, record, { replace: corrected });
    } catch (error) {
      // A folder staged for an issue that never made it into petrklic.json would go out with the next release.
      if (!existed) rmSync(folder, { recursive: true, force: true });
      throw error;
    }
  }
  return {
    lines: [
      stagedLine(check, `uploads/${dirname(pdf)}/ (PDF${check ? "" : ", cover.webp, pages/"}), ${pageCount} pages`),
      ...petrklicLines(result, check),
    ],
    written: result.written,
  };
}
