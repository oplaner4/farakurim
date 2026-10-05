"use client";

import { clsx } from "clsx";
import type { AlbumPhoto } from "@/content/types/gallery";
import { photoAlt, photoCountLabel } from "@/lib/gallery/albums";
import { plural } from "@/lib/shared/czech";
import { AlbumPhotoTile } from "@/components/gallery/AlbumPhotoTile";
import { ArrowRightIcon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { loadGroupLightbox, openGroupPhoto } from "./GroupLightbox";

/** Thumbnails shown: 6 on mobile (3 columns) and desktop, 4 on tablet. */
const SHOWN = 6;

type Props = {
  name: string;
  photos: AlbumPhoto[];
  /** How many photos come before these in the lightbox (1 with a hero): grid photo `i` is `#foto-(before + i + 1)`. */
  before: number;
  /** Every photo of the lightbox, the hero included. */
  total: number;
};

/**
 * "Fotografie" of a group page (design/DESIGN.md §27, 4): square thumbnails and "Zobrazit všech N fotografií",
 * each opening the page's photo lightbox (§21, `GroupLightbox`). Without JS a thumbnail links to the large photo.
 */
export function GroupPhotos({ name, photos, before, total }: Props) {
  // "Zobrazit všechny 3 fotografie", "Zobrazit všech 18 fotografií"
  const showAll =
    total === 1
      ? "Zobrazit fotografii"
      : `Zobrazit ${plural(total, ["", "všechny", "všech"])} ${photoCountLabel(total)}`;

  return (
    <section aria-labelledby="fotografie" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <SectionHeading id="fotografie" title="Fotografie" color="green" small />
        <span className="text-14 text-muted">{photoCountLabel(total)}</span>
      </div>
      <ul className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
        {photos.slice(0, SHOWN).map((photo, i) => (
          <li key={photo.small} className={clsx(i >= 4 && "md:max-lg:hidden")}>
            <a
              href={photo.large}
              aria-label={`${photoAlt({ title: name }, before + i + 1)} – zobrazit zvětšenou`}
              className="group block aspect-square overflow-hidden rounded-14"
              onPointerEnter={loadGroupLightbox}
              onFocus={loadGroupLightbox}
              onClick={openGroupPhoto(before + i + 1)}
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
        onPointerEnter={loadGroupLightbox}
        onFocus={loadGroupLightbox}
        onClick={openGroupPhoto(1)}
      >
        {showAll}
        <ArrowRightIcon size={18} />
      </a>
    </section>
  );
}
