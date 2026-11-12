// What a correction of a record changes: the fields, the items of a list and the `Changed: …` line naming them.

import { isDeepStrictEqual } from "node:util";

/** The keys whose values differ between `before` and `after`, in the order they first appear. */
export function changedKeys<T extends object>(before: T, after: T): (keyof T & string)[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])] as (keyof T & string)[];
  return keys.filter((key) => !isDeepStrictEqual(before[key], after[key]));
}

/**
 * The items of a list that differ between `before` and `after`, numbered from 1 and named by `label`: an item that
 * differs at its place (`announcement 2`), one only in `after` (`added announcement 3`), one only in `before`
 * (`removed announcement 4`, its number in `before`), and `announcement order` when the items both hold are reordered.
 * An item matches an equal one wherever it is, so a merge or an insertion names only the items it touches.
 */
export function changedItems<T>(before: T[], after: T[], label: string): string[] {
  const unmatched = new Set(before.keys());
  const matched: number[] = [];
  const added: number[] = [];
  after.forEach((item, i) => {
    const equal = (j: number) => isDeepStrictEqual(before[j], item);
    const j = unmatched.has(i) && equal(i) ? i : [...unmatched].find(equal);
    if (j === undefined) {
      added.push(i);
    } else {
      unmatched.delete(j);
      matched.push(j);
    }
  });
  const changed = added.filter((i) => unmatched.delete(i));
  return [
    ...after.flatMap((_, i) => {
      if (changed.includes(i)) return [`${label} ${i + 1}`];
      return added.includes(i) ? [`added ${label} ${i + 1}`] : [];
    }),
    ...[...unmatched].map((j) => `removed ${label} ${j + 1}`),
    ...(matched.some((j, k) => k > 0 && j < matched[k - 1]) ? [`${label} order`] : []),
  ];
}

/** The line naming what a correction changed. */
export const changedLine = (changed: string[]) =>
  changed.length > 0 ? `Changed: ${changed.join(", ")}` : "Nothing changed";
