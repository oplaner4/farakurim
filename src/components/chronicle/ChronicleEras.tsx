"use client";

import { clsx } from "clsx";
import { useState } from "react";
import type { ChronicleEra } from "@/content/types/chronicle";
import { ChronicleTimeline } from "./ChronicleTimeline";

const ALL = "vse";

/**
 * The era pills ("Vše · 13.–18. století · …", `aria-pressed`) and the eras they show (design/DESIGN.md §26).
 * Without JS the pills are hidden (the page's <noscript> style) and every era shows.
 */
export function ChronicleEras({ eras }: { eras: ChronicleEra[] }) {
  const [selected, setSelected] = useState(ALL);
  const pills = [{ id: ALL, title: "Vše" }, ...eras];
  return (
    <>
      {/* Mobile: one scrolling row bleeding to the screen edges. Tablet and desktop: wrapping. */}
      <div
        role="group"
        aria-label="Období"
        data-js-only
        className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:p-0"
      >
        {pills.map((pill) => (
          <button
            key={pill.id}
            type="button"
            aria-pressed={pill.id === selected}
            onClick={() => setSelected(pill.id)}
            className={clsx(
              "min-h-11 shrink-0 cursor-pointer rounded-full border-thin border-line bg-surface px-4 text-15 font-bold text-ink hover:border-blue-active",
              "aria-pressed:border-blue-active aria-pressed:bg-blue-active aria-pressed:text-on-blue-active",
            )}
          >
            {pill.title}
          </button>
        ))}
      </div>
      {eras.map((era) => (
        <ChronicleTimeline key={era.id} era={era} hidden={selected !== ALL && selected !== era.id} />
      ))}
    </>
  );
}
