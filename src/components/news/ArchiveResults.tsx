import { clsx } from "clsx";
import { formatMonthYear } from "@/lib/czech";
import type { ArchiveListing } from "@/lib/news";
import { type ArchiveItem, ArchiveRow } from "./ArchiveRow";

/**
 * Archive rows grouped by month (§12.3). Every row is in the HTML; rows after the shown pages are hidden
 * (`data-more`) until "Načíst starší", and a <noscript> style shows them all without JS.
 */
export function ArchiveResults({ groups }: { groups: ArchiveListing<ArchiveItem>["groups"] }) {
  return groups.length === 0 ? (
    <p className="rounded-20 bg-surface px-5 py-8 text-center text-ink-2 md:rounded-24 md:px-6 md:py-10 lg:py-12">
      Nic jsme nenašli. Zkuste jiné slovo nebo rok.
    </p>
  ) : (
    <div className="flex flex-col gap-5 md:gap-6 lg:gap-7">
      {groups.map((group) => {
        const headingId = `archiv-${group.month}`;
        return (
          <section
            key={group.month}
            aria-labelledby={headingId}
            data-more={group.more || undefined}
            className={clsx("flex flex-col", group.more && "hidden")}
          >
            <h2
              id={headingId}
              className="mb-1 text-18 font-bold text-magenta-ink md:mb-1.5 md:text-20 lg:mb-2 lg:text-22"
            >
              {formatMonthYear(group.month)}
            </h2>
            <ul>
              {group.events.map(({ item, more }) => (
                <li key={item.id} data-more={more || undefined} className={clsx(more && "hidden")}>
                  <ArchiveRow item={item} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
