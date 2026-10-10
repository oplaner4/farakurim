// ASCII ids from Czech titles: the Fotogalerie album ids (scripts/add-album.ts) and the Petrklíč issue ids
// (issueId() in src/lib/petrklic/issues.ts).

/** "Pouť na Vranov" → "pout-na-vranov", "2. část" → "2-cast"; empty without a letter or digit. */
export const slug = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\P{ASCII}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
