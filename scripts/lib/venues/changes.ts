import { isDeepStrictEqual } from "node:util";
import type { Venue } from "@/content/types/venues";

// What a change to the venue list may do when nobody but a reviewer checks it: add venues and aliases, never change
// or remove a venue already there (services, Kontakty, Betlémy and events refer to them, and a church's address is
// part of every upcoming service in the Bohoslužby calendar).

const withoutAliases = ({ aliases: _, ...venue }: Venue) => venue;

/** Why `after` is more than `before` with venues and aliases added; undefined when it is only that. */
export function venueListChangeProblem(before: Venue[], after: Venue[]): string | undefined {
  for (const old of before) {
    const now = after.find((v) => v.id === old.id);
    if (!now) return `it removes the venue ${old.id}`;
    if (!isDeepStrictEqual(withoutAliases(now), withoutAliases(old))) return `it changes the venue ${old.id}`;
    const kept = new Set(now.aliases ?? []);
    const dropped = (old.aliases ?? []).find((alias) => !kept.has(alias));
    if (dropped !== undefined) return `it removes the alias "${dropped}" of ${old.id}`;
  }
  return undefined;
}
