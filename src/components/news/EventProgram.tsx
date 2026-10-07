import type { ProgramItem } from "@/content/types/news";
import { DetailBlock } from "./DetailBlock";

/**
 * "Program" of the event detail: time and title rows. The time column is as wide as its longest entry (at least the
 * design's 76 / 100 / 120 px), so a range like "pá 19:00–20:30" stays on one line and all titles stay aligned.
 */
export function EventProgram({ items }: { items: ProgramItem[] }) {
  return (
    <DetailBlock id="program" title="Program" className="lg:max-w-175">
      <ol className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-b border-line md:gap-x-4 lg:gap-x-5">
        {items.map((item) => (
          <li
            key={`${item.time} ${item.title}`}
            className="col-span-2 grid grid-cols-subgrid border-t border-line py-3 md:py-3.5 lg:py-4"
          >
            <strong className="min-w-19 whitespace-nowrap text-magenta-ink md:min-w-25 lg:min-w-30">{item.time}</strong>
            <p>
              <strong>{item.title}</strong>
              {item.note && (
                <>
                  <br />
                  <span className="text-ink-2">{item.note}</span>
                </>
              )}
            </p>
          </li>
        ))}
      </ol>
    </DetailBlock>
  );
}
