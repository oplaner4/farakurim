// Stages a Petrklíč PDF as petrklic/<folder>/petrklic-<id>.pdf, renders its cover and viewer pages and adds
// the issue to src/content/petrklic.json (addPetrklic()). The folder is the id, or <id>-r<rev> for a corrected PDF,
// which replaces the issue's record: files on the server are never overwritten, so a corrected PDF of a released
// issue needs a new folder, while an unreleased one is replaced in its folder. An issue whose year, number or note
// was wrong (`from`, its old id) is staged again from its own PDF under the new id.

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import type { PetrklicRecord } from "@/content/types/petrklic";
import { issueFiles, issueId, issuePath } from "@/lib/petrklic/issues";
import { UPLOADS_PATH } from "@/lib/shared/uploads";
import { addPetrklic, petrklicLines, readPetrklic } from "../petrklic/add-petrklic";
import { onServer, serverUrl, UPLOADS_DIR } from "../uploads";
import { correctedHint, correctedRev, MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";
import { pdfPageCount, renderPetrklic } from "../images";

export type PetrklicOptions = {
  /** The PDF; none with `from`, which takes the issue's own PDF. */
  source?: string;
  year: number;
  number: number;
  note?: string;
  /** A corrected PDF of an issue already in petrklic.json. */
  corrected?: boolean;
  /** The id of an issue already in petrklic.json whose year, number or note was wrong. */
  from?: string;
  check?: boolean;
};

/** The issue's staged PDF: the folder carries the rev, the file keeps the id. */
const pdfPath = (id: string, rev?: number) => `${issuePath({ id, rev })}/${issueFiles.pdf(id)}`;

/**
 * Stages a Petrklíč PDF, renders its cover and pages and adds the issue (or, `corrected`, replaces it; with `from`,
 * moves it to its new id); returns the lines to print and the file written. The issue is checked before anything
 * is copied.
 */
export async function stagePetrklic(env: StageEnv, options: PetrklicOptions) {
  const { from } = options;
  if (from !== undefined && (options.corrected || options.source !== undefined)) {
    throw new Error("--from takes the issue's own PDF: no source and no --corrected");
  }
  const id = issueId(options);
  if (from === id) throw new Error(`the issue keeps its id ${id}: --from is for a new year, number or note`);
  const moved = from !== undefined ? await movedIssue(env, from) : undefined;
  try {
    return await stageIssue(env, options, moved);
  } finally {
    if (moved?.tempDir) rmSync(moved.tempDir, { recursive: true, force: true });
  }
}

/** The PDF to stage and the issue's new record: its page count from the PDF, its rev from the server. */
async function issueRecord(env: StageEnv, options: PetrklicOptions, moved: MovedIssue | undefined) {
  const { year, number, note, corrected } = options;
  const src = moved?.src ?? sourceFile(options.source ?? "", MAX_MB.petrklic, env.home);
  if (extname(src).toLowerCase() !== ".pdf") throw new Error("the Petrklíč is a PDF");
  const id = issueId(options);
  // addPetrklic refuses --corrected for an issue that is not there.
  const current = corrected ? readPetrklic(env.petrklicFile).issues.find((issue) => issueId(issue) === id) : undefined;
  // A moved issue's new id has no record yet, but its folder may be on the server from an earlier move.
  const rev = current || moved ? await correctedRev(env, current?.rev, (r) => pdfPath(id, r)) : undefined;
  const pageCount = pdfPageCount(src);
  const record = { year, number, ...(note !== undefined && { note }), ...(rev !== undefined && { rev }), pageCount };
  return { src, id, rev, record };
}

async function stageIssue(env: StageEnv, options: PetrklicOptions, moved: MovedIssue | undefined) {
  const { corrected = false, from, check = false } = options;
  const { src, id, rev, record } = await issueRecord(env, options, moved);
  const add = { replace: corrected, from };
  const checked = addPetrklic(env.petrklicFile, record, { ...add, check: true });
  const pdf = pdfPath(id, rev);
  const folder = join(env.uploadsDir, issuePath({ id, rev }));
  const existed = existsSync(folder);
  await stage(env, src, pdf, check, correctedHint("this issue"), corrected);
  let result = checked;
  if (!check) {
    try {
      await renderPetrklic(join(env.uploadsDir, pdf), { pages: true });
      result = addPetrklic(env.petrklicFile, record, add);
    } catch (error) {
      // A folder staged for an issue that never made it into petrklic.json would go out with the next release.
      if (!existed) rmSync(folder, { recursive: true, force: true });
      throw error;
    }
    // An old folder never released would go out with the next release, though nothing links it any more.
    if (moved && !moved.released) rmSync(join(env.uploadsDir, moved.folder), { recursive: true, force: true });
  }
  return {
    lines: [
      stagedLine(
        check,
        `${dirname(pdf)}/ (PDF${check ? "" : `, ${issueFiles.cover}, ${issueFiles.pages}/`}), ${record.pageCount} pages`,
      ),
      ...petrklicLines(result, check),
      ...(moved ? movedLines(env, moved, pdf, check) : []),
    ],
    written: result.written,
  };
}

type MovedIssue = {
  record: PetrklicRecord;
  /** The old folder, in the staging folder and on the server. */
  folder: string;
  /** The old PDF, relative to the staging folder. */
  pdf: string;
  /** Its local copy: the staged one, or one downloaded from the site into `tempDir`. */
  src: string;
  tempDir?: string;
  released: boolean;
};

/** The issue `from` and its PDF: staged here, or else downloaded from the site (the files there are public). */
async function movedIssue(env: StageEnv, from: string): Promise<MovedIssue> {
  const record = readPetrklic(env.petrklicFile).issues.find((issue) => issueId(issue) === from);
  if (!record) throw new Error(`the issue ${from} is not in petrklic.json`);
  const folder = issuePath({ id: from, rev: record.rev });
  const pdf = pdfPath(from, record.rev);
  const released = await onServer(env, pdf);
  const staged = join(env.uploadsDir, pdf);
  if (existsSync(staged)) return { record, folder, pdf, src: staged, released };
  if (!released) throw new Error(`${UPLOADS_DIR}${pdf} is neither staged nor on the server`);
  const response = await env.fetch(serverUrl(env, pdf), { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${serverUrl(env, pdf)} answered ${response.status}: cannot download the PDF`);
  const tempDir = mkdtempSync(join(tmpdir(), "petrklic-"));
  const src = join(tempDir, issueFiles.pdf(from));
  writeFileSync(src, Buffer.from(await response.arrayBuffer()));
  return { record, folder, pdf, src, tempDir, released };
}

/** What the user must know about the old folder: it stays online, and public/.htaccess may still redirect to it. */
function movedLines(env: StageEnv, moved: MovedIssue, pdf: string, check: boolean): string[] {
  const lines = moved.released
    ? [`The old folder ${serverUrl(env, moved.folder)}/ stays online: files on the server are never deleted`]
    : [`${check ? "Would remove" : "Removed"} the unreleased old folder ${UPLOADS_DIR}${moved.folder}/`];
  const oldUrl = `${UPLOADS_PATH}${moved.pdf}`;
  const redirects = existsSync(env.htaccessFile)
    ? readFileSync(env.htaccessFile, "utf8")
        .split("\n")
        .flatMap((line, i) => (line.includes(oldUrl) ? [i + 1] : []))
    : [];
  if (redirects.length > 0) {
    lines.push(
      `public/.htaccess redirects to the old PDF on line ${redirects.join(", ")}: change ${oldUrl} to ${UPLOADS_PATH}${pdf} there`,
    );
  }
  return lines;
}
