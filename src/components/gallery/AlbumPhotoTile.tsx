import { clsx } from "clsx";
import type { AlbumPhoto } from "@/content/types";
import { PosterPlaceholder } from "@/components/ui/PosterPlaceholder";

/** Placeholder tints, cycled by photo position (text colour drives the icon and the shard). */
const TINTS = [
  "bg-green-tint text-green-ink",
  "bg-blue-tint-alt text-blue-ink",
  "bg-orange-tint-alt text-orange-ink-deep",
  "bg-magenta-tint-alt text-magenta-ink",
];

type Props = {
  /** Missing in the mock data: a designed placeholder stands in. */
  photo?: AlbumPhoto;
  size: keyof AlbumPhoto;
  /** Position in the album, 0-based: picks the placeholder tint. */
  index: number;
  alt: string;
  /** The first photo of a page loads eagerly, the rest lazily. */
  eager?: boolean;
  iconSize: number;
  /** Size of the placeholder's corner shard. */
  shardClassName: string;
  className?: string;
};

/** A photo filling its box, or a tinted placeholder with an image icon and a corner shard. */
export function AlbumPhotoTile({ photo, size, index, alt, eager, iconSize, shardClassName, className }: Props) {
  if (photo)
    return (
      <img
        src={photo[size]}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={clsx("size-full object-cover", className)}
      />
    );
  return (
    <span
      // A decorative thumbnail (alt="") stays out of the accessibility tree like an <img alt="">.
      {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })}
      className={clsx(
        "relative flex size-full items-center justify-center overflow-hidden",
        TINTS[index % TINTS.length],
        className,
      )}
    >
      <PosterPlaceholder iconSize={iconSize} className={shardClassName} />
    </span>
  );
}
