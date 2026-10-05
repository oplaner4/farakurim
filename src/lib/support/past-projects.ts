import type { PastProject } from "@/content/types/support";
import { formatCzk } from "@/lib/shared/czech";

// Starší projekty (design/DESIGN.md §28).

/** "Náklady celkem" and "Dotace celkem": the sums of the yearly rows (an unrecorded value counts as 0). */
export function projectTotals(project: Pick<PastProject, "years">): { costs: number; grants: number } {
  return project.years.reduce(
    (sum, row) => ({ costs: sum.costs + row.costs, grants: sum.grants + (row.grants ?? 0) }),
    { costs: 0, grants: 0 },
  );
}

/** "2019–2025", or "2024" for a single year. */
export function yearSpan(project: Pick<PastProject, "years">): string {
  const years = project.years.map((row) => row.year);
  const [from, to] = [Math.min(...years), Math.max(...years)];
  return from === to ? String(from) : `${from}–${to}`;
}

/** A yearly amount, or "—" when it was not recorded. */
export const formatAmount = (amount: number | null) => (amount === null ? "—" : formatCzk(amount));
