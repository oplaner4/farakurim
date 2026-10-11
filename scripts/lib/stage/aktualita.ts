// `pnpm stage aktualita` (scripts/lib/stage/command.ts): stages an aktualita's files, each as
// uploads/aktuality/<id>-<label in ASCII>.<ext>, in the order given, and adds the event with them to its month file in
// src/content/news/ (scripts/lib/news/add-aktualita.ts), moving the pin to it when it is pinned. The first file is the
// poster when it is an image or PDF (unless --no-poster), made by scripts/lib/news/poster-aktualita.ts.
// Without a record it only checks (--check): a file no record links would go to the server with the next release.
// Every file and the record are checked before anything is copied.
// --corrected stages corrected or added files of an aktualita already there (farnost-correct-aktualita skill): each
// replaces the attachment with its label (else is added at the end), in the record or in the corrected --record, and
// the record is replaced. The poster follows the file it was made from: it is rendered again when that file is
// corrected, and otherwise changes only with `pnpm poster-aktualita`. Files on the server are never
// overwritten, so once a file is there the corrected one is named …-r2.<ext> (then -r3, …); before that it replaces
// the staged file.

import { statSync } from "node:fs";
import { extname } from "node:path";
import { readEvents } from "@/content/news";
import type { EventAttachment, NewsEvent } from "@/content/types/news";
import { slug } from "@/lib/shared/slug";
import { POSTER_SUFFIX, posterHref } from "@/lib/news/events";
import { newsEventSchema } from "@/lib/news/schema";
import { UPLOAD_EXTENSIONS, UPLOADS_PATH } from "@/lib/shared/uploads";
import { fileRev, revSuffix } from "@/lib/shared/revision";
import { addAktualita, targetLine } from "../news/add-aktualita";
import { planPoster, POSTER_EXTENSIONS, type PosterRender } from "../news/poster-aktualita";
import { replaceAktualita, replaceLines } from "../news/replace-aktualita";
import { unpinnedLines } from "../news/pin-aktualita";
import { correctedRev, MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";
import { renderPoster } from "../images";

/** An attachment label's file name suffix: "Plakát" → "plakat", "Mapka trasy" → "mapka-trasy". */
export function labelSuffix(label: string): string {
  const suffix = slug(label);
  if (!suffix) throw new Error(`the label "${label}" has no letters or digits for the file name`);
  return suffix;
}

/** A file to stage and the label it is attached under. */
export interface AktualitaFile {
  source: string;
  label: string;
}

export interface AktualitaOptions {
  id: string;
  /** In the order of the attachments; the first is the poster candidate. */
  files: AktualitaFile[];
  /** No poster, even when the first file is an image or PDF. */
  noPoster?: boolean;
  /** The confirmed NewsEvent (without the files), added to src/content/news/. */
  record?: Record<string, unknown>;
  /** Corrected or added files of an aktualita already in src/content/news/; `record` is then its corrected record. */
  corrected?: boolean;
  check?: boolean;
}

/** `attachments` with `attachment` in place of the one with its label, else added at the end. */
export function withAttachment(attachments: EventAttachment[], attachment: EventAttachment): EventAttachment[] {
  const at = attachments.findIndex((a) => a.label === attachment.label);
  return at === -1 ? [...attachments, attachment] : attachments.with(at, attachment);
}

/** A file checked for staging: its source, label, extension, size and staged path in uploads/. */
type PlannedFile = { src: string; label: string; ext: string; size: number; rel: string };

/** The staged path in uploads/ of an aktualita file: "aktuality/hody-2026-plakat-r2.pdf". */
const aktualitaPath = (name: string, ext: string) => `aktuality/${name}${ext}`;

/**
 * The index in `files` of the file to render the poster from, or -1. A new record takes the first file when it is an
 * image or PDF (a new record may hold only the poster's alt text). When correcting, the poster follows the file it
 * was made from; a record without a poster gets one only from `pnpm poster-aktualita`.
 */
function posterIndex(
  files: PlannedFile[],
  record: Record<string, unknown> | undefined,
  { noPoster, corrected }: { noPoster: boolean; corrected: boolean },
) {
  if (!corrected) return !noPoster && POSTER_EXTENSIONS.has(files[0].ext) ? 0 : -1;
  if (noPoster) throw new Error("--no-poster is for a new aktualita: pnpm poster-aktualita changes the poster");
  const event = record as NewsEvent | undefined;
  if (!event?.poster) return -1;
  const source = event.attachments?.find((a) => a.file === posterHref(event))?.label;
  return files.findIndex((f) => f.label === source);
}

/**
 * The record to put the files into: the given record or, with --corrected, the one on the site. Throws for options
 * that cannot stage: no record without --corrected or --check, a bad id, no file or a record of another id.
 */
function aktualitaInput(env: StageEnv, options: AktualitaOptions): Record<string, unknown> | undefined {
  const { id, files, corrected, check } = options;
  if (!options.record && !corrected && !check) {
    throw new Error("--record is required to stage the files; without it, only --check");
  }
  // Checked here too: the id names the staged files before the record is checked, and --check has no record.
  if (!newsEventSchema.shape.id.safeParse(id).success) throw new Error(`"${id}" is not an ASCII kebab-case id`);
  if (files.length === 0) throw new Error("no file to stage");
  // A corrected file goes into the corrected record, else into the record on the site.
  let input = options.record;
  if (corrected) {
    const existing = readEvents(env.newsDir).find((e) => e.id === id);
    if (!existing) throw new Error(`there is no aktualita ${id}: --corrected is for one already on the site`);
    input ??= { ...existing };
  }
  if (input && input.id !== id) throw new Error(`the record's id ${JSON.stringify(input.id)} is not "${id}"`);
  return input;
}

/**
 * Checks each given file and plans its staged name, in the order given. A corrected file takes the next rev of the
 * attachment with its label in `current` once that one is on the server.
 */
async function planFiles(
  env: StageEnv,
  id: string,
  given: AktualitaFile[],
  current: EventAttachment[],
  corrected: boolean,
): Promise<PlannedFile[]> {
  const files: PlannedFile[] = [];
  for (const { source, label: raw } of given) {
    const label = raw.trim();
    const suffix = labelSuffix(label);
    const twin = files.find((f) => labelSuffix(f.label) === suffix);
    if (twin) throw new Error(`the labels "${twin.label}" and "${label}" give the same file name (${id}-${suffix})`);
    const src = sourceFile(source, MAX_MB.aktualita, env.home);
    const ext = extname(src).toLowerCase().replace(".jpeg", ".jpg");
    if (!UPLOAD_EXTENSIONS.includes(ext)) {
      throw new Error(`${extname(src)} is not a file an aktualita links (${UPLOAD_EXTENSIONS.join(", ")})`);
    }
    const base = `${id}-${suffix}`;
    const old = current.find((a) => a.label === label);
    const rev = corrected
      ? await correctedRev(env, old && fileRev(old.file), (r) => aktualitaPath(`${base}${revSuffix(r)}`, ext))
      : undefined;
    files.push({ src, label, ext, size: statSync(src).size, rel: aktualitaPath(`${base}${revSuffix(rev)}`, ext) });
  }
  return files;
}

/**
 * The record with the planned files (and the poster) and the poster to render, validated before anything is copied
 * so a bad record leaves nothing staged; with `check`, the lines saying where it would go.
 */
async function planRecord(
  env: StageEnv,
  input: Record<string, unknown>,
  files: PlannedFile[],
  poster: number,
  { corrected, check, current }: { corrected: boolean; check: boolean; current: EventAttachment[] },
) {
  const attachments = files.map((f) => ({
    label: f.label,
    file: `${UPLOADS_PATH}${f.rel}`,
    size: f.size,
  }));
  let record: Record<string, unknown> = {
    ...input,
    attachments: corrected ? attachments.reduce(withAttachment, current) : attachments,
  };
  let render: PosterRender | undefined;
  // Rendered from the source, as the staged copy does not exist yet with check.
  if (poster !== -1) ({ record, render } = await planPoster(env, record, files[poster].label, files[poster].src));
  const lines: string[] = [];
  if (corrected) {
    const target = replaceAktualita(env.newsDir, record, { check: true });
    if (check) lines.push(...replaceLines(target, true));
  } else {
    const target = addAktualita(env.newsDir, record, { check: true });
    if (check) lines.push(targetLine(target, true), ...unpinnedLines(target.unpinned, true));
  }
  return { record, render, lines };
}

/** Stages `files` (with `check`, only checks them) and returns the lines saying so. */
async function stageFiles(
  env: StageEnv,
  files: PlannedFile[],
  poster: number,
  { corrected, check }: { corrected: boolean; check: boolean },
): Promise<string[]> {
  // Every name is checked before any file is copied, so a taken second name leaves nothing staged.
  const takenHint = corrected ? "pick another label" : "pick another id";
  for (const f of files) await stage(env, f.src, f.rel, true, takenHint, corrected);
  const lines: string[] = [];
  for (const [i, f] of files.entries()) {
    if (!check) await stage(env, f.src, f.rel, false, takenHint, corrected);
    lines.push(stagedLine(check, f.rel) + (i === poster ? ` and its ${POSTER_SUFFIX}` : ""));
  }
  return lines;
}

/** Adds the record (with `corrected`, replaces it) and returns the lines, the news files written and the event. */
function writeRecord(env: StageEnv, record: Record<string, unknown>, corrected: boolean) {
  if (corrected) {
    const result = replaceAktualita(env.newsDir, record);
    return { lines: replaceLines(result, false), written: result.written, event: result.record };
  }
  const result = addAktualita(env.newsDir, record);
  return {
    lines: [targetLine(result, false), ...unpinnedLines(result.unpinned, false)],
    written: result.written,
    event: result.record,
  };
}

/**
 * Stages an aktualita's files (and the poster WebP) and, with a record, adds the record with the files. Returns the
 * lines to print, the news files written (for formatAndTest) and the added event.
 */
export async function stageAktualita(
  env: StageEnv,
  options: AktualitaOptions,
): Promise<{ lines: string[]; written: string[]; event?: NewsEvent }> {
  const { id, files: given, noPoster = false, corrected = false, check = false } = options;
  const input = aktualitaInput(env, options);
  const current = (input?.attachments as EventAttachment[] | undefined) ?? [];
  const files = await planFiles(env, id, given, current, corrected);
  const poster = posterIndex(files, input, { noPoster, corrected });
  const planned = input && (await planRecord(env, input, files, poster, { corrected, check, current }));
  const lines = [...(planned?.lines ?? []), ...(await stageFiles(env, files, poster, { corrected, check }))];
  if (!planned || check) return { lines, written: [] };
  if (planned.render) await renderPoster(planned.render.from, planned.render.to);
  const result = writeRecord(env, planned.record, corrected);
  return { ...result, lines: [...lines, ...result.lines] };
}
