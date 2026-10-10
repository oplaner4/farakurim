// `pnpm stage aktualita` (scripts/lib/stage/command.ts): stages an aktualita's file as
// uploads/aktuality/<id>-<label in ASCII>.<ext> with its poster WebP and, with a record, adds the event with its
// files to its month file in src/content/news/ (scripts/lib/news/add-aktualita.ts), moving the pin to it when it is pinned.
// --corrected stages a corrected or added file of an aktualita already there (farnost-correct-aktualita skill): it
// replaces the attachment with the same label (else adds one) and, for a poster, the poster, in the record or in the
// corrected --record, and replaces the record. Files on the server are never overwritten, so once the file is there
// the corrected one is named …-r2.<ext> (then -r3, …); before that it replaces the staged file.

import { statSync } from "node:fs";
import { extname } from "node:path";
import { readEvents } from "@/content/news";
import type { EventAttachment, NewsEvent } from "@/content/types/news";
import { fold } from "@/lib/shared/czech";
import { revSuffix } from "@/lib/shared/revision";
import { addAktualita, targetLine } from "../news/add-aktualita";
import { replaceAktualita, replaceLines } from "../news/replace-aktualita";
import { unpinnedLines } from "../news/pin-aktualita";
import { correctedRev, MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";
import { renderPoster } from "./images";

const EXTENSIONS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".webp",
  ".gif",
  ".mp3",
  ".m4a",
  ".ogg",
  ".wav",
  ".mp4",
  ".webm",
  ".mov",
]);
const POSTER_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".webp", ".gif"]);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** An attachment label's file name suffix: "Plakát" → "plakat", "Mapka trasy" → "mapka-trasy". */
export function labelSuffix(label: string): string {
  const suffix = fold(label)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!suffix) throw new Error(`the label "${label}" has no letters or digits for the file name`);
  return suffix;
}

export interface AktualitaOptions {
  source: string;
  id: string;
  label: string;
  title?: string;
  /** Renders a poster WebP; by default for an image or PDF. */
  poster?: boolean;
  /** The confirmed NewsEvent (without the files), added to src/content/news/. */
  record?: Record<string, unknown>;
  /** A corrected or added file of an aktualita already in src/content/news/; `record` is then its corrected record. */
  corrected?: boolean;
  check?: boolean;
}

/** The rev of a staged aktualita file from its name ("/uploads/aktuality/x-plakat-r2.pdf" → 2). */
export function fileRev(file: string): number | undefined {
  const rev = /-r(\d+)\.[^./]+$/.exec(file)?.[1];
  return rev ? Number(rev) : undefined;
}

/** `attachments` with `attachment` in place of the one with its label, else added at the end. */
export function withAttachment(attachments: EventAttachment[], attachment: EventAttachment): EventAttachment[] {
  const at = attachments.findIndex((a) => a.label === attachment.label);
  return at === -1 ? [...attachments, attachment] : attachments.with(at, attachment);
}

/**
 * Stages an aktualita's file (and its poster WebP) and, with a record, adds the record with the files. Returns the
 * lines to print, the news files written (for formatAndTest) and the added event.
 */
export async function stageAktualita(
  env: StageEnv,
  options: AktualitaOptions,
): Promise<{ lines: string[]; written: string[]; event?: NewsEvent }> {
  const { id, corrected = false, check = false } = options;
  const label = options.label.trim();
  if (!KEBAB.test(id)) throw new Error(`"${id}" is not an ASCII kebab-case id`);
  const name = `${id}-${labelSuffix(label)}`;
  const src = sourceFile(options.source, MAX_MB.aktualita, env.home);
  const ext = extname(src).toLowerCase().replace(".jpeg", ".jpg");
  if (!EXTENSIONS.has(ext)) throw new Error(`${extname(src)} is not an image, PDF, audio or video file`);
  const poster = options.poster ?? POSTER_EXTENSIONS.has(ext);
  if (poster && !POSTER_EXTENSIONS.has(ext)) throw new Error(`a ${ext} file cannot be a poster: pass --no-poster`);
  const { size } = statSync(src);
  // A corrected file goes into the corrected record, else into the record on the site.
  let input = options.record;
  let rev: number | undefined;
  if (corrected) {
    const existing = readEvents(env.newsDir).find((e) => e.id === id);
    if (!existing) throw new Error(`there is no aktualita ${id}: --corrected is for one already on the site`);
    input ??= { ...existing };
    const current = (input.attachments as EventAttachment[] | undefined)?.find((a) => a.label === label);
    rev = await correctedRev(env, current && fileRev(current.file), (r) => `aktuality/${name}${revSuffix(r)}${ext}`);
  }
  const file = `${name}${revSuffix(rev)}`;
  const title = options.title ?? (input?.title as string | undefined) ?? "<title>";
  const lines: string[] = [];
  let record: Record<string, unknown> | undefined;
  if (input) {
    if (input.id !== id) throw new Error(`the record's id ${JSON.stringify(input.id)} is not "${id}"`);
    record = { ...input };
    if (poster) {
      // Keep an alt text the record already has (it may add the date); the src is always the staged WebP.
      const alt = (input.poster as { alt?: string } | undefined)?.alt ?? `${label}: ${title}`;
      record.poster = { src: `/uploads/aktuality/${file}.webp`, alt };
    }
    const attachment = { label, file: `/uploads/aktuality/${file}${ext}`, size };
    record.attachments = corrected
      ? withAttachment((input.attachments as EventAttachment[] | undefined) ?? [], attachment)
      : [attachment];
    // Validate before anything is copied, so a bad record leaves nothing staged.
    if (corrected) {
      const target = replaceAktualita(env.newsDir, record, { check: true });
      if (check) lines.push(...replaceLines(target, true));
    } else {
      const target = addAktualita(env.newsDir, record, { check: true });
      if (check) lines.push(targetLine(target, true), ...unpinnedLines(target.unpinned, true));
    }
  }
  const takenHint = corrected ? "pick another label" : "pick another id";
  const dest = await stage(env, src, `aktuality/${file}${ext}`, check, takenHint, corrected);
  if (poster && !check) await renderPoster(dest, dest.slice(0, -ext.length) + ".webp");
  lines.push(stagedLine(check, `uploads/aktuality/${file}${ext}`) + (poster ? " and .webp" : ""));
  if (!record) {
    // The entries to paste into an existing record's month file (news/<year>/<MM>.json).
    const path = `/uploads/aktuality/${file}`;
    if (poster) lines.push(`"poster": ${JSON.stringify({ src: `${path}.webp`, alt: `${label}: ${title}` })},`);
    lines.push(`"attachments": ${JSON.stringify([{ label, file: `${path}${ext}`, size }])},`);
    return { lines, written: [] };
  }
  if (check) return { lines, written: [] };
  if (corrected) {
    const result = replaceAktualita(env.newsDir, record);
    lines.push(...replaceLines(result, false));
    return { lines, written: result.written, event: result.record };
  }
  const result = addAktualita(env.newsDir, record);
  lines.push(targetLine(result, false), ...unpinnedLines(result.unpinned, false));
  return { lines, written: result.written, event: result.record };
}
