"use client";

import { clsx } from "clsx";
import type { GroupPage } from "@/content/types/activities";
import { loadGroupLightbox, openGroupPhoto } from "./GroupLightbox";

/**
 * The wide photo of a group page (design/DESIGN.md §27, 2) with the green corner shard; a poster (Společenství
 * mládeže, §27.1) is shown whole on a blue tint. It opens the lightbox as the page's first photo; without JS it
 * links to the photo file.
 */
export function GroupHero({ hero }: { hero: NonNullable<GroupPage["hero"]> }) {
  return (
    <a
      href={hero.src}
      aria-label={`${hero.alt} – zobrazit zvětšenou`}
      className={clsx(
        "group relative block h-55 overflow-hidden rounded-24 md:h-80 md:rounded-26 lg:h-95 lg:rounded-28",
        hero.poster ? "bg-blue-tint-alt" : "bg-green-tint",
      )}
      onPointerEnter={loadGroupLightbox}
      onFocus={loadGroupLightbox}
      onClick={openGroupPhoto(1)}
    >
      <img
        src={hero.src}
        alt=""
        fetchPriority="high"
        // A slight zoom on hover: the photo opens (§5).
        className={clsx(
          "size-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-103",
          hero.poster ? "object-contain" : "object-cover",
        )}
      />
      <span aria-hidden="true" className="absolute right-0 bottom-0 h-20 w-30 bg-green shard-br" />
    </a>
  );
}
