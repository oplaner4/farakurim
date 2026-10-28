"use client";

import type { ReactNode } from "react";
import { seasonalItem, type SeasonalItem, type SeasonalPeriod } from "@/lib/layout/seasonal-nav";
import { useToday } from "@/hooks/use-now";

type Props = {
  periods: SeasonalPeriod[];
  /** One server-rendered menu link per item. */
  items: Record<SeasonalItem, ReactNode>;
  renderedAt: number;
};

/**
 * The fifth main-menu item (design/DESIGN.md §4.1a): the build day's in the prerendered HTML and during hydration,
 * the visitor's day after load, so the item turns into Betlémy or Tábor (and back) without a rebuild.
 */
export function SeasonalNavItem({ periods, items, renderedAt }: Props) {
  const today = useToday(renderedAt);
  return items[seasonalItem(periods, today)];
}
