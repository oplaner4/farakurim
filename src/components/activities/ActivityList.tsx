"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import type { Activity, ActivityGroup } from "@/content/types/activities";
import { activityCount, ALL_GROUPS, filterActivities, seeksHelp } from "@/lib/activities/search";
import { FilterPill } from "@/components/ui/FilterPill";
import { ArrowRightIcon, ClockIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** The list follows the field after a short pause, so the count isn't announced on every letter. */
const SEARCH_DELAY_MS = 250;

/**
 * Seznam aktivit (design/DESIGN.md §25): the search, the group pills with their counts (`aria-pressed`), the count
 * line and one section per group. Without JS the search and pills are hidden (the page's <noscript> style) and
 * everything shows.
 */
export function ActivityList({ groups }: { groups: ActivityGroup[] }) {
  const [group, setGroup] = useState(ALL_GROUPS);
  const [query, setQuery] = useState("");
  const [search] = useDebounce(query, SEARCH_DELAY_MS);
  const shown = filterActivities(groups, group, search);
  const count = shown.reduce((sum, g) => sum + g.activities.length, 0);
  const pills = [
    { id: ALL_GROUPS, title: "Vše", count: groups.reduce((sum, g) => sum + g.activities.length, 0) },
    ...groups.map((g) => ({ id: g.id, title: g.title, count: g.activities.length })),
  ];

  return (
    <>
      <div className="flex flex-col gap-3">
        <div data-js-only className="flex flex-col gap-3">
          <label htmlFor="hledat-aktivitu" className="text-15 font-bold">
            Hledat aktivitu nebo jméno
          </label>
          <div className="relative flex max-w-140 items-center">
            <SearchIcon size={20} className="pointer-events-none absolute left-3.5 text-muted" />
            <input
              id="hledat-aktivitu"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="např. schola, úklid, Milan"
              className="min-h-12.5 w-full rounded-14 border-thin border-field-line bg-raised pr-4 pl-11 text-16 text-ink placeholder:text-muted"
            />
          </div>
          {/* Mobile: one scrolling row bleeding to the screen edges. Tablet and desktop: wrapping. */}
          <div
            role="group"
            aria-label="Skupina aktivit"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:p-0"
          >
            {pills.map((pill) => (
              <FilterPill
                key={pill.id}
                tone="green"
                size="count"
                aria-pressed={pill.id === group}
                onClick={() => setGroup(pill.id)}
              >
                {pill.title}
                <span className="text-13 font-normal">{pill.count}</span>
              </FilterPill>
            ))}
          </div>
        </div>
        <span aria-live="polite" className="text-14 text-muted">
          {activityCount(search.trim() ? "Nalezen" : "Zobrazen", count)}
        </span>
      </div>

      {count === 0 && (
        <p className="rounded-20 bg-surface px-5 py-8 text-center text-ink-2">Nic jsme nenašli. Zkuste jiné slovo.</p>
      )}

      {shown.map((g) => (
        <section key={g.id} aria-labelledby={`aktivity-${g.id}`} className="flex flex-col gap-3">
          <SectionHeading id={`aktivity-${g.id}`} title={g.title} color={g.color} small />
          <ul className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {g.activities.map((activity) => (
              <ActivityCard key={activity.name} activity={activity} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/** One activity: name, how often, whom to ask ("hledáme" in magenta, an invitation) and its own page. */
function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <li className="flex min-w-0 flex-col gap-1.5 rounded-18 bg-surface p-4">
      <strong className="text-17 leading-card">{activity.name}</strong>
      {activity.when && (
        <span className="flex items-start gap-1.5 text-14 text-ink-2">
          <ClockIcon size={16} className="mt-0.75 flex-none" />
          <span className="sr-only">Kdy: </span>
          {activity.when}
        </span>
      )}
      <span
        className={clsx("flex items-start gap-1.5 text-14", seeksHelp(activity) ? "text-magenta-ink" : "text-muted")}
      >
        <UserIcon size={16} className="mt-0.75 flex-none" />
        <span className="sr-only">Kontakt: </span>
        {activity.contacts}
      </span>
      {activity.href && (
        <a href={activity.href} className="flex min-h-10 items-center gap-1.5 self-start text-15 font-bold">
          Více o skupině
          <ArrowRightIcon size={16} />
        </a>
      )}
    </li>
  );
}
