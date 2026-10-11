import { fold } from "./czech";

// ASCII ids from Czech titles: the Fotogalerie album ids (scripts/lib/gallery/add-album.ts), the Petrklíč issue ids
// (issueId() in src/lib/petrklic/issues.ts) and the Aktuality attachments' file names (scripts/lib/stage/aktualita.ts,
// checked for clashes by src/lib/news/schema.ts). Built on fold(), so Czech letters lose their accents; any other
// character becomes a dash.

/** "Pouť na Vranov" → "pout-na-vranov", "2. část" → "2-cast"; empty without a letter or digit. */
export const slug = (text: string) =>
  fold(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
