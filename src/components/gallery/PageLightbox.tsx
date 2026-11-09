"use client";

import dynamic from "next/dynamic";
import type { MouseEvent } from "react";
import type { AlbumPhoto } from "@/content/types/gallery";
import type { PhotoLabel } from "./PhotoLightbox";
import { photoFromHash, photoHash } from "@/lib/shared/lightbox";
import { isModifiedClick } from "@/lib/shared/links";
import { clearHash, pushHash, replaceHash } from "@/lib/shared/location-hash";
import { useLocationHash } from "@/hooks/use-location-hash";

// The lightbox library loads with the first photo opened, hovered or focused.
export const loadPageLightbox = () => import("./PhotoLightbox");
const PhotoLightbox = dynamic(() => loadPageLightbox().then((m) => m.PhotoLightbox), { ssr: false });

/**
 * Click handler of a link to the N-th photo (1-based): opens the lightbox at `#foto-N`. A modified click (new tab)
 * and a visit without JS follow the link to the photo file.
 */
export const openPagePhoto = (n: number) => (e: MouseEvent) => {
  if (isModifiedClick(e)) return;
  e.preventDefault();
  pushHash(photoHash(n));
};

type Props = {
  name: string;
  /** The album on Zonerama, when there is one. */
  href?: string;
  photos: AlbumPhoto[];
  /** A title and caption per photo instead of the album's ("Honza · Hlavní vedoucí · 22 let" for the Tábor team). */
  labels?: PhotoLabel[];
  /** The mobile swipe hint, when the default does not fit ("Přejeďte prstem na dalšího vedoucího"). */
  hint?: string;
};

/**
 * The photo lightbox of a page (design/DESIGN.md §21): a group page's hero and photos (§27), Betlémy's exhibition
 * photos (§30), the Tábor team (§29.3), open while the hash is `#foto-N`, so the back button closes it and a link
 * can open it.
 */
export function PageLightbox({ name, href, photos, labels, hint }: Props) {
  const open = photoFromHash(useLocationHash(), photos.length);
  if (open === null) return null;
  return (
    <PhotoLightbox
      album={{ title: name, href, photoCount: photos.length, photos }}
      index={open}
      position={0}
      labels={labels}
      hint={hint}
      onView={(i) => replaceHash(photoHash(i + 1))}
      onClose={clearHash}
    />
  );
}
