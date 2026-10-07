"use client";

import { clsx } from "clsx";
import type { AlbumPhoto } from "@/content/types/gallery";
import { zoneramaSrcSet } from "@/lib/gallery/albums";
import { useFadeInOnLoad } from "@/hooks/use-fade-in-on-load";
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
  /**
   * The tile's rendered width (`sizes`): a Zonerama photo then comes in the width the screen needs (`srcset`), and
   * `size` is only the fallback.
   */
  sizes?: string;
  /** Position in the album, 0-based: picks the placeholder tint. */
  index: number;
  alt: string;
  /** The first photo of a page loads eagerly, the rest lazily. */
  eager?: boolean;
  iconSize: number;
  /** Size of the placeholder's corner shard. */
  shardClassName: string;
  /** Extra classes, e.g. the hover zoom of a photo that opens (`motion-safe:group-hover:scale-103`). */
  className?: string;
};

/** Fading in on load and zooming on hover share one transition (§5). */
const MOTION = "motion-safe:transition-[opacity,scale] motion-safe:duration-300 motion-safe:ease-out";

/**
 * A photo filling its box, fading in once loaded over a tinted skeleton that pulses while it loads, or a tinted
 * placeholder with an image icon and a corner shard.
 */
export function AlbumPhotoTile({ photo, size, sizes, index, alt, eager, iconSize, shardClassName, className }: Props) {
  const fadeIn = useFadeInOnLoad();
  const srcSet = photo && sizes ? zoneramaSrcSet(photo.large) : undefined;
  if (photo)
    return (
      <span className="relative isolate block size-full">
        <img
          ref={fadeIn}
          src={photo[size]}
          {...(srcSet && { srcSet, sizes })}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className={clsx("peer size-full object-cover motion-safe:data-loading:opacity-0", MOTION, className)}
        />
        <span
          aria-hidden
          className={clsx(
            "absolute inset-0 -z-1 motion-safe:peer-data-loading:animate-pulse",
            TINTS[index % TINTS.length],
          )}
        />
      </span>
    );
  return (
    <span
      // A decorative thumbnail (alt="") stays out of the accessibility tree like an <img alt="">.
      {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })}
      className={clsx(
        "relative flex size-full items-center justify-center overflow-hidden",
        MOTION,
        TINTS[index % TINTS.length],
        className,
      )}
    >
      <PosterPlaceholder iconSize={iconSize} className={shardClassName} />
    </span>
  );
}
