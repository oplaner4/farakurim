// Contact people of Výuka náboženství and the group pages.

/** The avatar's initials: "Hanka Prokopová" → "HP", "P. Jaroslav Filka" → "JF" (titles with a dot are skipped). */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter((word) => word && !word.endsWith("."));
  const picked = words.length > 2 ? [words[0], words[words.length - 1]] : words;
  return picked.map((word) => word.charAt(0).toUpperCase()).join("");
}
