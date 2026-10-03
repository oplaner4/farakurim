import { clsx } from "clsx";
import { ImageIcon } from "./icons";

/** Event tints for posters and their placeholders, cycled by position (text colour drives the placeholder). */
export const POSTER_TINTS = [
  "bg-magenta-tint-alt text-magenta-ink",
  "bg-orange-tint-alt text-orange-ink-deep",
  "bg-blue-tint-alt text-blue-ink",
  "bg-green-tint text-green-ink",
];

/** Designed stand-in for an event without a poster image: a shard in the corner and an image icon. */
export function PosterPlaceholder({ iconSize, className }: { iconSize: number; className?: string }) {
  return (
    <>
      <span className={clsx("absolute right-0 bottom-0 bg-current opacity-18 shard-br", className)} />
      <ImageIcon size={iconSize} className="relative" />
    </>
  );
}
