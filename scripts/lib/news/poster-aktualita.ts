// The poster of an aktualita: made from one of the record's attachments (an image or PDF) as
// <attachment name>-poster.webp beside it, rendered from the attachment's file in uploads/, or only linked when that
// WebP is on the server already, since files there are never overwritten. The record is replaced
// (replaceAktualita()), keeping its `published`, its pin and the poster's alt text.

import { existsSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { readEvents } from "@/content/news";
import type { EventAttachment, NewsEvent } from "@/content/types/news";
import { isPosterOf, posterOf } from "@/lib/news/events";
import { IMAGE_EXTENSIONS, UPLOADS_PATH } from "@/lib/shared/uploads";
import { actionVerb, parseCommandLine } from "../command";
import { formatAndTestNews, NEWS_DIR } from "../content-files";
import { renderPoster } from "../images";
import { defaultUploadsEnv, onServer, UPLOADS_DIR, type UploadsEnv } from "../uploads";
import { replaceAktualita, replaceLines } from "./replace-aktualita";

/** The files a poster can be made from: page 1 of a PDF, or the image. */
export const POSTER_EXTENSIONS = new Set([".pdf", ...IMAGE_EXTENSIONS]);
/** A WebP to render: from the attachment's file `from` to the poster `to`. */
export type PosterRender = { from: string; to: string };

/**
 * `record` with its poster made from its attachment `label`, and the WebP to render (none when the server has it
 * already). `source` is the file to render from, by default the attachment's file in uploads/. The poster keeps its
 * alt text, else it is "<label>: <title>". Throws for a missing attachment, one that is not an image or PDF, or a
 * file to render from that is missing.
 */
export async function planPoster(
  env: UploadsEnv,
  record: Record<string, unknown>,
  label: string,
  source?: string,
): Promise<{ record: Record<string, unknown>; render?: PosterRender }> {
  const attachment = (record.attachments as EventAttachment[] | undefined)?.find((a) => a.label === label);
  if (!attachment) throw new Error(`${String(record.id)} has no attachment "${label}"`);
  if (!POSTER_EXTENSIONS.has(extname(attachment.file).toLowerCase())) {
    throw new Error(`the attachment "${label}" is not an image or PDF, so it cannot be the poster`);
  }
  const src = posterOf(attachment.file);
  const rel = src.slice(UPLOADS_PATH.length);
  let render: PosterRender | undefined;
  if (!(await onServer(env, rel))) {
    render = {
      from: source ?? join(env.uploadsDir, attachment.file.slice(UPLOADS_PATH.length)),
      to: join(env.uploadsDir, rel),
    };
    if (!existsSync(render.from)) {
      throw new Error(`${attachment.file.slice(1)} is not here: pnpm pull-uploads fetches it from the server`);
    }
  }
  const alt = (record.poster as { alt?: string } | undefined)?.alt ?? `${label}: ${String(record.title)}`;
  return { record: { ...record, poster: { src, alt } }, render };
}

/**
 * Makes the attachment `label` the poster of the aktualita `id` in `env.newsDir` (null removes the poster) and returns
 * what changed; `check` only validates. Nothing changes when that attachment is the poster already (`already`).
 */
export async function posterAktualita(
  env: UploadsEnv & { newsDir: string },
  id: string,
  label: string | null,
  { check = false, now = new Date() } = {},
) {
  const existing: NewsEvent | undefined = readEvents(env.newsDir).find((e) => e.id === id);
  if (!existing) throw new Error(`there is no aktualita ${id}`);
  let record: Record<string, unknown>;
  let render: PosterRender | undefined;
  if (label === null) {
    if (!existing.poster) throw new Error(`${id} has no poster`);
    const { poster: _poster, ...rest } = existing;
    record = rest;
  } else {
    const file = existing.attachments?.find((a) => a.label === label)?.file;
    if (existing.poster && file && isPosterOf(existing.poster.src, file)) return { already: true, written: [] };
    ({ record, render } = await planPoster(env, { ...existing }, label));
  }
  const replaced = replaceAktualita(env.newsDir, record, { check: true, now });
  if (check) return { already: false, replaced, render, written: [] };
  if (render) await renderPoster(render.from, render.to);
  const result = replaceAktualita(env.newsDir, record, { now });
  return { already: false, replaced: result, render, written: result.written };
}

/** The lines saying what posterAktualita() changed (or would change, with `check`). */
export function posterLines(
  id: string,
  label: string | null,
  result: Awaited<ReturnType<typeof posterAktualita>>,
  check: boolean,
  uploadsDir: string,
): string[] {
  if (result.already) return [`"${label}" is already the poster of ${id}`];
  const local = (path: string) => `${UPLOADS_DIR}${relative(uploadsDir, path)}`;
  const poster =
    label === null
      ? `${actionVerb(check, "remove")} the poster (its WebP stays on the server)`
      : result.render
        ? `${actionVerb(check, "render")} ${local(result.render.to)} from ${local(result.render.from)}`
        : `${actionVerb(check, "link")} the poster of "${label}", already on the server`;
  return [poster, ...(result.replaced ? replaceLines(result.replaced, check) : [])];
}

const USAGE = 'Usage: pnpm poster-aktualita <id> "<label>" | --none [--check]';

/**
 * Reads the command line `args`: the id, then the attachment's label or --none (null), and --check. An unknown option
 * throws with the usage, so a typo of --check never writes.
 */
export function parseCommand(args: string[]): { id: string; label: string | null; check: boolean } {
  const options = { none: { type: "boolean" }, check: { type: "boolean" } } as const;
  const { positionals, values } = parseCommandLine(args, options, USAGE);
  if (positionals.length !== (values.none ? 1 : 2)) throw new Error(USAGE);
  return { id: positionals[0], label: values.none ? null : positionals[1], check: values.check ?? false };
}

/** Sets the poster of `label` (none for null) and prints what changed; then formats and tests the news files. */
export async function execute({ id, label, check }: { id: string; label: string | null; check: boolean }) {
  const env = { ...defaultUploadsEnv(), newsDir: NEWS_DIR };
  const result = await posterAktualita(env, id, label, { check });
  console.log(posterLines(id, label, result, check, env.uploadsDir).join("\n"));
  await formatAndTestNews(result.written);
}
