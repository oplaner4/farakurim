// `pnpm stage aktualita` (scripts/stage/cli.ts): stages an aktualita's file as
// uploads/aktuality/<id>-<label in ASCII>.<ext> with its poster WebP and, with a record, adds the event with its
// files to its month file in src/content/news/ (scripts/add-aktualita.ts).

import { statSync } from "node:fs";
import { extname } from "node:path";
import type { NewsEvent } from "@/content/types/news";
import { fold } from "@/lib/shared/czech";
import { addAktualita, targetLine } from "../add-aktualita";
import { MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";
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
  check?: boolean;
}

/**
 * Stages an aktualita's file (and its poster WebP) and, with a record, adds the record with the files. Returns the
 * lines to print, the news files written (for formatAndTest) and the added event.
 */
export async function stageAktualita(
  env: StageEnv,
  options: AktualitaOptions,
): Promise<{ lines: string[]; written: string[]; event?: NewsEvent }> {
  const { id, record: input, check = false } = options;
  const label = options.label.trim();
  if (!KEBAB.test(id)) throw new Error(`"${id}" is not an ASCII kebab-case id`);
  const name = `${id}-${labelSuffix(label)}`;
  const src = sourceFile(options.source, MAX_MB.aktualita, env.home);
  const ext = extname(src).toLowerCase().replace(".jpeg", ".jpg");
  if (!EXTENSIONS.has(ext)) throw new Error(`${extname(src)} is not an image, PDF, audio or video file`);
  const poster = options.poster ?? POSTER_EXTENSIONS.has(ext);
  if (poster && !POSTER_EXTENSIONS.has(ext)) throw new Error(`a ${ext} file cannot be a poster: pass --no-poster`);
  const { size } = statSync(src);
  const title = options.title ?? (input?.title as string | undefined) ?? "<title>";
  const lines: string[] = [];
  let record: Record<string, unknown> | undefined;
  if (input) {
    if (input.id !== id) throw new Error(`the record's id ${JSON.stringify(input.id)} is not "${id}"`);
    record = { ...input };
    if (poster) {
      // Keep an alt text the record already has (it may add the date); the src is always the staged WebP.
      const alt = (input.poster as { alt?: string } | undefined)?.alt ?? `${label}: ${title}`;
      record.poster = { src: `/uploads/aktuality/${name}.webp`, alt };
    }
    record.attachments = [{ label, file: `/uploads/aktuality/${name}${ext}`, size }];
    // Validate before anything is copied, so a bad record leaves nothing staged.
    const target = addAktualita(env.newsDir, record, { check: true });
    if (check) lines.push(targetLine(target, true));
  }
  const dest = await stage(env, src, `aktuality/${name}${ext}`, check);
  if (poster && !check) await renderPoster(dest, dest.slice(0, -ext.length) + ".webp");
  lines.push(stagedLine(check, `uploads/aktuality/${name}${ext}`) + (poster ? " and .webp" : ""));
  if (!record) {
    // The entries to paste into an existing record's month file (news/<year>/<MM>.json).
    const file = `/uploads/aktuality/${name}`;
    if (poster) lines.push(`"poster": ${JSON.stringify({ src: `${file}.webp`, alt: `${label}: ${title}` })},`);
    lines.push(`"attachments": ${JSON.stringify([{ label, file: `${file}${ext}`, size }])},`);
    return { lines, written: [] };
  }
  if (check) return { lines, written: [] };
  const result = addAktualita(env.newsDir, record);
  lines.push(targetLine(result, false));
  return { lines, written: result.written, event: result.record };
}
