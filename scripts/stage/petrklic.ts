// `pnpm stage petrklic` (scripts/stage/cli.ts): stages a Petrklíč issue as
// uploads/petrklic/<id>/petrklic-<id>.pdf, renders cover.webp and pages/ (scripts/upload-images.ts) and prints the
// `issue(...)` line for src/content/petrklic.ts.

import { dirname, extname } from "node:path";
import { parsePetrklicId } from "@/lib/petrklic/issues";
import { MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";
import { pdfPageCount, renderPetrklic } from "../upload-images";

export interface PetrklicOptions {
  source: string;
  id: string;
  note?: string;
  check?: boolean;
}

/** Stages a Petrklíč PDF and renders its cover and pages; returns the lines to print (with the `issue()` line). */
export async function stagePetrklic(env: StageEnv, options: PetrklicOptions) {
  const { id, note, check = false } = options;
  const { year, number } = parsePetrklicId(id);
  const src = sourceFile(options.source, MAX_MB.petrklic, env.home);
  if (extname(src).toLowerCase() !== ".pdf") throw new Error("the Petrklíč is a PDF");
  const dest = await stage(env, src, `petrklic/${id}/petrklic-${id}.pdf`, check);
  const pages = check ? pdfPageCount(src) : await renderPetrklic(dirname(dest), { pages: true });
  const extra = note ? `, { note: ${JSON.stringify(note)} }` : "";
  return [
    stagedLine(check, `uploads/petrklic/${id}/ (PDF${check ? "" : ", cover.webp, pages/"}), ${pages} pages`),
    `  issue("${id}", ${year}, ${number}, ${pages}${extra}),`,
  ];
}
