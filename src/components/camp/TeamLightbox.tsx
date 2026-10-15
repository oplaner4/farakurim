"use client";

import dynamic from "next/dynamic";
import type { MouseEvent } from "react";
import type { AlbumPhoto } from "@/content/types/gallery";
import type { PhotoLabel } from "@/components/gallery/PhotoLightbox";
import { photoFromHash, photoHash } from "@/lib/shared/lightbox";
import { isModifiedClick } from "@/lib/shared/links";
import { clearHash, pushHash, replaceHash } from "@/lib/shared/location-hash";
import { useLocationHash } from "@/hooks/use-location-hash";

// The lightbox library loads with the first photo opened, hovered or focused.
export const loadTeamLightbox = () => import("@/components/gallery/PhotoLightbox");
const PhotoLightbox = dynamic(() => loadTeamLightbox().then((m) => m.PhotoLightbox), { ssr: false });

/**
 * Click handler of a link to the N-th photo (1-based): opens the lightbox at `#foto-N`. A modified click (new tab)
 * and a visit without JS follow the link to the photo file.
 */
export const openTeamPhoto = (n: number) => (e: MouseEvent) => {
  if (isModifiedClick(e)) return;
  e.preventDefault();
  pushHash(photoHash(n));
};

type Props = {
  /** "Tým tábora 2026" */
  title: string;
  photos: AlbumPhoto[];
  labels: PhotoLabel[];
};

/**
 * The team's photos in the photo lightbox (design/DESIGN.md §21, §29.3): everyone with a photo, in page order, the
 * name at the top and "Honza · Hlavní vedoucí · 22 let" under the photo. Open while the hash is `#foto-N`, so the
 * back button closes it.
 */
export function TeamLightbox({ title, photos, labels }: Props) {
  const open = photoFromHash(useLocationHash(), photos.length);
  if (open === null) return null;
  return (
    <PhotoLightbox
      album={{ title, photoCount: photos.length, photos }}
      index={open}
      position={0}
      labels={labels}
      hint="Přejeďte prstem na dalšího vedoucího"
      onView={(i) => replaceHash(photoHash(i + 1))}
      onClose={clearHash}
    />
  );
}
