import { fold } from "@/lib/shared/czech";

// Matching an event's place with the venues: exact, after folding, never fuzzy.

/** A place text compared without case, accents, dots or extra spaces: "Kurim,  ARÉAL za farou." → "kurim, areal za farou". */
export const foldPlace = (text: string): string => fold(text).replace(/\./g, "").replace(/\s+/g, " ").trim();
