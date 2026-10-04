"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { isModifiedClick } from "@/lib/shared/links";
import { clearHash, pushHash } from "@/lib/shared/location-hash";
import { useLocationHash } from "@/hooks/use-location-hash";

// The lightbox library loads with the first poster opened (or hovered).
const loadLightbox = () => import("./PosterLightbox");
const PosterLightbox = dynamic(() => loadLightbox().then((m) => m.PosterLightbox), { ssr: false });

type Props = Omit<ComponentProps<"a">, "href" | "onClick"> & {
  /** The poster image: opened in the lightbox, and the link's target without JS. */
  href: string;
  /** URL hash of the open lightbox, unique on the page: "plakat", "plakat-farni-ples". */
  hashId: string;
  /** The event title (the lightbox's top bar). */
  title: string;
  alt: string;
};

/** A link to a poster image that opens the poster lightbox (design/DESIGN.md §21.3) instead. */
export function PosterLink({ href, hashId, title, alt, children, ...rest }: Props) {
  const open = useLocationHash() === `#${hashId}`;
  return (
    <>
      <a
        href={href}
        onPointerEnter={loadLightbox}
        onClick={(e) => {
          if (isModifiedClick(e)) return;
          e.preventDefault();
          pushHash(`#${hashId}`);
        }}
        {...rest}
      >
        {children}
      </a>
      {open && <PosterLightbox src={href} title={title} alt={alt} onClose={clearHash} />}
    </>
  );
}
