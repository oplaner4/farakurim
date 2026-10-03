"use client";

import type { ReactNode } from "react";
import type { IsoDate } from "@/content/types";
import { useToday } from "@/hooks/use-now";

/** Renders its (server-rendered) children until the end of `date`, by the visitor's Prague date. */
export function ShowUntil({ date, renderedAt, children }: { date: IsoDate; renderedAt: number; children: ReactNode }) {
  const today = useToday(renderedAt);
  return today <= date ? children : null;
}
