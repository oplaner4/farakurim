// Decides whether a website event and an Události calendar event are the same event although their titles differ
// ("Obnova pro manžele" and "Manželská obnova “Láska a Pravda”"). Titles are compared as sets of words: the "Zrušeno: "
// prefix, case, diacritics, numbers and filler words are ignored, and each word is cut to its first 4 letters so
// Czech endings do not matter ("České" and "Česká"). Two titles match when the shorter word set lies within the
// longer one, or when they share at least two words.

import { parseTitle } from "@/lib/calendar/google-calendar";
import { fold } from "@/lib/shared/czech";

const FILLER_WORDS = new Set("a v ve na do s se z ze k ke o u pro za po od i".split(" "));
const STEM_LENGTH = 4;

function wordsOf(title: string): Set<string> {
  const words = fold(parseTitle(title).title)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((word) => word && !/^\d+$/.test(word) && !FILLER_WORDS.has(word));
  return new Set(words.map((word) => word.slice(0, STEM_LENGTH)));
}

export function matchingTitles(a: string, b: string): boolean {
  const first = wordsOf(a);
  const second = wordsOf(b);
  if (first.size === 0 || second.size === 0) return false;
  const [shorter, longer] = first.size <= second.size ? [first, second] : [second, first];
  const shared = [...shorter].filter((word) => longer.has(word)).length;
  return shared === shorter.size || shared >= 2;
}
