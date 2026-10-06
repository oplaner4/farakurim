"use client";

import { clsx } from "clsx";
import { type KeyboardEvent, useRef, useState } from "react";
import type { SchoolTimetable as School, TimetableRow } from "@/content/types/activities";
import { FilterPill } from "@/components/ui/FilterPill";

/**
 * The school switcher of "Rozvrh výuky" (design/DESIGN.md §24): tabs (`role="tablist"`, arrow keys, Home, End)
 * over one panel per school. Without JS the tabs are hidden and every panel shows with its H3 (the page's
 * <noscript> style).
 */
export function SchoolTimetable({ schools }: { schools: School[] }) {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const last = schools.length - 1;
    const next = { ArrowRight: selected + 1, ArrowLeft: selected - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const index = next < 0 ? last : next > last ? 0 : next;
    setSelected(index);
    tabs.current[index]?.focus();
  }

  return (
    <>
      {/* Mobile: one scrolling row bleeding to the screen edges. Tablet and desktop: wrapping. */}
      <div
        role="tablist"
        aria-label="Škola"
        data-js-only
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:p-0"
      >
        {schools.map((school, i) => (
          <FilterPill
            key={school.id}
            tone="green"
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`skola-${school.id}-tab`}
            role="tab"
            aria-selected={i === selected}
            aria-controls={`skola-${school.id}`}
            tabIndex={i === selected ? 0 : -1}
            onClick={() => setSelected(i)}
            onKeyDown={onKeyDown}
          >
            {school.name}
          </FilterPill>
        ))}
      </div>
      {schools.map((school, i) => (
        <div
          key={school.id}
          id={`skola-${school.id}`}
          role="tabpanel"
          aria-labelledby={`skola-${school.id}-tab`}
          // A class, not `hidden`: Tailwind's `[hidden]` rule is `!important` in a layer, which the page's
          // <noscript> style could not override to show every school.
          className={clsx("flex-col gap-2", i === selected ? "flex" : "hidden")}
        >
          <h3 data-noscript-heading className="sr-only text-20 font-bold">
            {school.name}
          </h3>
          <TimetableCards rows={school.rows} />
          <TimetableTable school={school} />
        </div>
      ))}
    </>
  );
}

/** Mobile: one card per class, the class in a green tile. */
function TimetableCards({ rows }: { rows: TimetableRow[] }) {
  return (
    <ul className="flex flex-col gap-2.5 md:hidden">
      {rows.map((row) => (
        <li key={row.grade} className="flex items-start gap-3.5 rounded-18 bg-surface p-4">
          <span className="flex min-h-16 w-19 shrink-0 flex-col items-center justify-center rounded-14 bg-green-tint p-1.5 text-center leading-heading text-green-ink">
            <span className="text-12 font-bold">třída</span>
            <strong className="text-15">{row.grade}</strong>
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <strong className="text-17">
              {row.day} · {row.time}
            </strong>
            <span className="text-15 text-ink-2">{row.room}</span>
            <span className="text-14 text-muted">{row.teacher}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Tablet and desktop: a table with a visually hidden caption. */
function TimetableTable({ school }: { school: School }) {
  const head = clsx("border-b-2 border-line px-3.5 py-3 text-left text-14 font-bold text-muted");
  return (
    <div className="overflow-x-auto max-md:hidden">
      <table className="w-full border-collapse text-16">
        <caption className="sr-only">Rozvrh náboženství: {school.name}</caption>
        <thead>
          <tr>
            {["Třída", "Den", "Hodina", "Místo", "Vyučující"].map((label) => (
              <th key={label} scope="col" className={head}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {school.rows.map((row) => (
            <tr key={row.grade} className="align-top">
              <th scope="row" className="border-b border-line p-3.5 text-left">
                <span className="inline-block rounded-full bg-green-tint px-2.5 py-0.5 text-15 text-green-ink">
                  {row.grade}
                </span>
              </th>
              <td className="border-b border-line p-3.5 font-bold">{row.day}</td>
              <td className="border-b border-line p-3.5 font-bold whitespace-nowrap">{row.time}</td>
              <td className="border-b border-line p-3.5">{row.room}</td>
              <td className="border-b border-line p-3.5 text-ink-2">{row.teacher}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
