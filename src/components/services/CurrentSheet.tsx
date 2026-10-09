"use client";

import type { ReactNode } from "react";
import type { IsoDate } from "@/content/types/shared";
import { currentSheet } from "@/lib/services/service-sheet";
import { useToday } from "@/hooks/use-now";

type Props = {
  /** One server-rendered node per ohlášky sheet, sorted by `validFrom`. */
  items: { validFrom: IsoDate; node: ReactNode }[];
  renderedAt: number;
};

/**
 * Shows the node of the sheet valid today (`currentSheet()`): the build day's in the prerendered HTML and during
 * hydration, the visitor's day after load, so a sheet published in advance takes over without a rebuild.
 */
export function CurrentSheet({ items, renderedAt }: Props) {
  const today = useToday(renderedAt);
  return currentSheet(items, today)?.node ?? null;
}
