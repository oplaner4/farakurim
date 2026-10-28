"use client";

import dynamic from "next/dynamic";
import type { MouseEvent } from "react";
import type { AlbumPhoto } from "@/content/types/gallery";
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

/**
 * The photo lightbox of a page (design/DESIGN.md §21): a group page's hero and photos (§27), Betlémy's exhibition
 * photos (§30), open while the hash is `#foto-N`, so the back button closes it and a link can open it. `href` is
 * the album on Zonerama, when there is one.
 */
export function PageLightbox({ name, href, photos }: { name: string; href?: string; photos: AlbumPhoto[] }) {
  const open = photoFromHash(useLocationHash(), photos.length);
  if (open === null) return null;
  return (
    <PhotoLightbox
      album={{ title: name, href, photoCount: photos.length, photos }}
      index={open}
      position={0}
      onView={(i) => replaceHash(photoHash(i + 1))}
      onClose={clearHash}
    />
  );
}
