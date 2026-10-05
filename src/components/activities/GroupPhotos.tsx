"use client";

import { clsx } from "clsx";
import dynamic from "next/dynamic";
import type { MouseEvent } from "react";
import type { AlbumPhoto, PhotoSet } from "@/content/types/gallery";
import { groupPhotoFromHash, groupPhotoHash } from "@/lib/activities/groups";
import { photoAlt, photoCountLabel } from "@/lib/gallery/albums";
import { plural } from "@/lib/shared/czech";
import { isModifiedClick } from "@/lib/shared/links";
import { clearHash, pushHash, replaceHash } from "@/lib/shared/location-hash";
import { useLocationHash } from "@/hooks/use-location-hash";
import { AlbumPhotoTile } from "@/components/gallery/AlbumPhotoTile";
import { ArrowRightIcon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/SectionHeading";

// The lightbox library loads with the first photo opened (or hovered).
const loadLightbox = () => import("@/components/gallery/PhotoLightbox");
const PhotoLightbox = dynamic(() => loadLightbox().then((m) => m.PhotoLightbox), { ssr: false });

/** Thumbnails shown: 6 on mobile (3 columns) and desktop, 4 on tablet. */
const SHOWN = 6;

/**
 * "Fotografie" of a group page (design/DESIGN.md §27, 4): square thumbnails and "Zobrazit všech N fotografií",
 * each opening the photo lightbox (§21) at `#foto-N`. Without JS a thumbnail links to the large photo.
 */
export function GroupPhotos({ name, photos }: { name: string; photos: AlbumPhoto[] }) {
  const set: PhotoSet = { title: name, photoCount: photos.length, photos };
  const open = groupPhotoFromHash(useLocationHash(), photos.length);
  const count = photos.length;
  // "Zobrazit všechny 3 fotografie", "Zobrazit všech 18 fotografií"
  const showAll =
    count === 1
      ? "Zobrazit fotografii"
      : `Zobrazit ${plural(count, ["", "všechny", "všech"])} ${photoCountLabel(count)}`;

  const openAt = (i: number) => (e: MouseEvent) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    pushHash(groupPhotoHash(i + 1));
  };

  return (
    <section aria-labelledby="fotografie" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <SectionHeading id="fotografie" title="Fotografie" color="green" small />
        <span className="text-14 text-muted">{photoCountLabel(photos.length)}</span>
      </div>
      <ul className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
        {photos.slice(0, SHOWN).map((photo, i) => (
          <li key={photo.small} className={clsx(i >= 4 && "md:max-lg:hidden")}>
            <a
              href={photo.large}
              aria-label={`${photoAlt(set, i + 1)} – zobrazit zvětšenou`}
              className="group block aspect-square overflow-hidden rounded-14"
              onPointerEnter={loadLightbox}
              onClick={openAt(i)}
            >
              <AlbumPhotoTile
                photo={photo}
                size="small"
                index={i}
                alt=""
                eager={i < 3}
                iconSize={32}
                shardClassName="h-10 w-14"
                // A slight zoom on hover: the photo opens (§5).
                className="motion-safe:group-hover:scale-103"
              />
            </a>
          </li>
        ))}
      </ul>
      <a
        href={photos[0].large}
        className="flex min-h-11 items-center gap-1.5 self-start font-bold text-green-ink hover:text-ink"
        onPointerEnter={loadLightbox}
        onClick={openAt(0)}
      >
        {showAll}
        <ArrowRightIcon size={18} />
      </a>
      {open !== null && (
        <PhotoLightbox
          album={set}
          index={open}
          position={0}
          onView={(i) => replaceHash(groupPhotoHash(i + 1))}
          onClose={clearHash}
        />
      )}
    </section>
  );
}
