import { clsx } from "clsx";
import type { NewsEvent } from "@/content/types/news";
import { DetailBlock } from "./DetailBlock";

/** Highlight tiles cycle through the brand tints (§13.3). */
const tiles = [
  { tile: "bg-green-tint", shard: "bg-green", value: "text-green-ink" },
  { tile: "bg-blue-tint", shard: "bg-blue", value: "text-blue-ink" },
  { tile: "bg-orange-tint", shard: "bg-orange", value: "text-orange-ink" },
];

/** Up to three key facts ("800 let v datech"). */
export function EventHighlights({ highlights }: { highlights: NonNullable<NewsEvent["highlights"]> }) {
  return (
    <DetailBlock id="v-datech" title={highlights.title}>
      <ul className="grid grid-cols-3 gap-2 md:gap-3 lg:gap-4">
        {highlights.items.slice(0, tiles.length).map((item, i) => (
          <li
            key={item.label}
            className={clsx(
              "relative flex flex-col gap-0.5 overflow-hidden rounded-16 px-3 pt-4 pb-3.5 leading-normal",
              "md:rounded-20 md:px-4.5 md:py-5 lg:gap-1 lg:rounded-24 lg:px-5.5 lg:py-6",
              tiles[i].tile,
            )}
          >
            <span
              aria-hidden="true"
              className={clsx("absolute top-0 right-0 size-7 shard-tr md:size-9 lg:size-12", tiles[i].shard)}
            />
            <span className={clsx("text-24 font-bold md:text-32 md:leading-display lg:text-40", tiles[i].value)}>
              {item.value}
            </span>
            <span className="text-13 text-ink-2 md:text-15 lg:text-16">{item.label}</span>
          </li>
        ))}
      </ul>
    </DetailBlock>
  );
}
