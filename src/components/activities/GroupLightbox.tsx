"use client";

import dynamic from "next/dynamic";
import type { MouseEvent } from "react";
import type { AlbumPhoto } from "@/content/types/gallery";
import { groupPhotoFromHash, groupPhotoHash } from "@/lib/activities/groups";
import { isModifiedClick } from "@/lib/shared/links";
import { clearHash, pushHash, replaceHash } from "@/lib/shared/location-hash";
import { useLocationHash } from "@/hooks/use-location-hash";

// The lightbox library loads with the first photo opened, hovered or focused.
export const loadGroupLightbox = () => import("@/components/gallery/PhotoLightbox");
const PhotoLightbox = dynamic(() => loadGroupLightbox().then((m) => m.PhotoLightbox), { ssr: false });

/**
 * Click handler of a link to the N-th photo (1-based): opens the lightbox at `#foto-N`. A modified click (new tab)
 * and a visit without JS follow the link to the photo file.
 */
export const openGroupPhoto = (n: number) => (e: MouseEvent) => {
  if (isModifiedClick(e)) return;
  e.preventDefault();
  pushHash(groupPhotoHash(n));
};

/**
 * The photo lightbox of a group page (design/DESIGN.md §21, §27): the hero and the "Fotografie" photos, open
 * while the hash is `#foto-N`, so the back button closes it and a link can open it.
 */
export function GroupLightbox({ name, photos }: { name: string; photos: AlbumPhoto[] }) {
  const open = groupPhotoFromHash(useLocationHash(), photos.length);
  if (open === null) return null;
  return (
    <PhotoLightbox
      album={{ title: name, photoCount: photos.length, photos }}
      index={open}
      position={0}
      onView={(i) => replaceHash(groupPhotoHash(i + 1))}
      onClose={clearHash}
    />
  );
}
