"use client";

import { clsx } from "clsx";
import type { AlbumPhoto } from "@/content/types/gallery";
import { ZoomInIcon } from "@/components/ui/icons/media-icons";
import { loadTeamLightbox, openTeamPhoto } from "./TeamLightbox";

type Props = {
  name: string;
  photo: AlbumPhoto;
  /** The photo's place in the lightbox (1-based). */
  n: number;
  /** The box's size: the avatar's and the desktop portrait's (round, then a 16 px radius from desktop up). */
  className: string;
};

/**
 * A team member's photo (design/DESIGN.md §29.3): a link with a magnifier badge that opens the team lightbox at
 * this person. A round avatar on mobile and tablet, a 4:5 portrait on desktop; without JS it opens the photo file.
 */
export function TeamPhoto({ name, photo, n, className }: Props) {
  return (
    <a
      href={photo.large}
      aria-label={`Zobrazit fotku: ${name}`}
      className={clsx("group relative flex-none rounded-full lg:rounded-16", className)}
      onPointerEnter={loadTeamLightbox}
      onFocus={loadTeamLightbox}
      onClick={openTeamPhoto(n)}
    >
      <span className="block size-full overflow-hidden rounded-full lg:rounded-16">
        <img
          src={photo.small}
          srcSet={`${photo.small} 320w, ${photo.large} 720w`}
          sizes="(min-width: 1200px) 270px, 64px"
          alt=""
          loading="lazy"
          className="size-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-103"
        />
      </span>
      <span
        aria-hidden="true"
        className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-overlay text-ink shadow-badge lg:right-2.5 lg:bottom-2.5 lg:size-9"
      >
        <ZoomInIcon size={14} className="lg:size-4.5" />
      </span>
    </a>
  );
}
