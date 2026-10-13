import * as z from "zod";
import { fold } from "./czech";

// ASCII ids from Czech titles: the Fotogalerie album ids (scripts/lib/gallery/add-album.ts), the Petrklíč issue ids
// (issueId() in src/lib/petrklic/issues.ts) and the event attachments' file names (scripts/lib/stage/event.ts,
// checked for clashes by src/lib/news/schema.ts). Built on fold(), so Czech letters lose their accents; any other
// character becomes a dash. The content schemas check the ids with kebabIdSchema.

/** "Pouť na Vranov" → "pout-na-vranov", "2. část" → "2-cast"; empty without a letter or digit. */
export const slug = (text: string) =>
  fold(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** A content id: ASCII kebab-case, as slug() makes it ("pout-na-vranov-2026"). */
export const kebabIdSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be ASCII kebab-case");
