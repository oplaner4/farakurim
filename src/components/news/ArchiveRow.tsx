import type { NewsEvent } from "@/content/types";
import { formatCompactDate } from "@/lib/czech";
import { FileIcon } from "@/components/ui/icons";

/** What a row needs; the page passes only these fields to the client. */
export type ArchiveItem = Pick<NewsEvent, "id" | "title" | "start" | "end" | "time" | "place" | "archiveHidden"> & {
  href: string;
  /** First attachment: "Plakát" + "PDF". */
  file?: { label: string; type: string };
};

/** Anchor of a row: "Načíst další" moves the focus to the first new one. */
export const rowAnchor = (id: string) => `archiv-${id}`;

/** The whole row is one link to the detail page (§12.3). */
export function ArchiveRow({ item }: { item: ArchiveItem }) {
  return (
    <a
      id={rowAnchor(item.id)}
      href={item.href}
      className="flex flex-wrap items-start gap-x-3 gap-y-0.5 border-t border-line py-3 text-ink no-underline hover:bg-surface hover:text-ink md:flex-nowrap md:items-center md:gap-4 md:px-2 md:py-3.5 lg:gap-5 lg:rounded-4 lg:px-3"
    >
      <span className="flex w-16 shrink-0 flex-col leading-snug md:w-24 lg:w-28">
        <span className="text-15 font-bold md:text-16 lg:text-17">{formatCompactDate(item.start, item.end)}</span>
        {item.time && <span className="text-13 text-muted md:text-14">{item.time}</span>}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-16 leading-card font-bold md:text-17 lg:text-18">{item.title}</span>
        {item.place && <span className="text-13 text-muted md:text-14 lg:text-15">{item.place}</span>}
      </span>
      {/* Mobile: under the place (indented by the date column). Tablet/desktop: a chip on the right. */}
      {item.file && (
        <span className="flex items-center gap-1 text-13 font-bold text-ink-2 max-md:w-full max-md:pl-19 md:shrink-0 md:gap-1.5 md:rounded-10 md:bg-surface md:px-3 md:py-1.5 md:text-14 md:whitespace-nowrap">
          <FileIcon size={15} className="shrink-0 text-magenta-ink" />
          {item.file.label} {item.file.type}
        </span>
      )}
    </a>
  );
}
