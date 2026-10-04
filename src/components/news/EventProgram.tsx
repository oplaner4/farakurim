import type { ProgramItem } from "@/content/types/news";
import { DetailBlock } from "./DetailBlock";

/** "Program" of the event detail: time and title rows. */
export function EventProgram({ items }: { items: ProgramItem[] }) {
  return (
    <DetailBlock id="program" title="Program" className="lg:max-w-175">
      <ol className="flex flex-col border-b border-line">
        {items.map((item) => (
          <li
            key={`${item.time} ${item.title}`}
            className="flex gap-3 border-t border-line py-3 md:gap-4 md:py-3.5 lg:gap-5 lg:py-4"
          >
            <strong className="w-19 shrink-0 text-magenta-ink md:w-25 lg:w-30">{item.time}</strong>
            <p className="min-w-0 flex-1">
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
