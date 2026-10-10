import * as z from "zod";
import type { PetrklicIssue } from "@/content/types/petrklic";
import { pageImages, toIssue } from "@/lib/petrklic/issues";
import { petrklicFileSchema } from "@/lib/petrklic/schema";
import data from "./petrklic.json";

// The Petrklíč issues (src/content/petrklic.json, added by `pnpm stage petrklic`, farnost-create-petrklic skill):
// the old site's archive (farakurim.cz/petrklic/archiv) and the new issues, newest first. Each issue is a folder
// /uploads/petrklic/<id>/ with petrklic-<id>.pdf, cover.webp and, for the current issue, pages/<n>.webp, rendered from
// the PDF; the id and the URLs are computed (toIssue()). Checked on import, so a broken file fails the build naming
// the field.

const parsed = petrklicFileSchema.safeParse(data);
if (!parsed.success) throw new Error(`src/content/petrklic.json is not valid:\n${z.prettifyError(parsed.error)}`);

/** Newest first; the first one is the current issue (aktuální číslo), with its pages for the viewer. */
export const petrklicIssues: PetrklicIssue[] = parsed.data.issues.map((record, i) => {
  const issue = toIssue(record);
  return i === 0 ? { ...issue, pageImages: pageImages(issue) } : issue;
});

/** Copy of the Petrklíč pages and the homepage card. */
export const petrklicTexts = {
  lead: "Zpravodaj Římskokatolické farnosti Kuřim. Vychází čtyřikrát ročně.",
  current: "Nejnovější číslo zpravodaje k prohlédnutí a ke stažení.",
  home: "Nové číslo zpravodaje naší farnosti. Čtěte online nebo si ho stáhněte.",
};

/** §17.1 (5)–(6). */
export const petrklicEditorial = {
  email: "petrklic.kurim@gmail.com",
  editors: ["Jana Kolaříková", "Dáša Montagová", "Eva Ryšavá", "Jaroslav Filka", "Martin Strašák"],
  coverDesign: "Pája Polášková",
};
