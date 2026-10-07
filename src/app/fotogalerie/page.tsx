import type { Metadata } from "next";
import { AlbumStrip } from "@/components/gallery/AlbumStrip";
import { ZoneramaPanel } from "@/components/gallery/ZoneramaPanel";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageHeading } from "@/components/ui/PageHeading";
import { albums } from "@/content/gallery";
import { links } from "@/content/site";

/** The newest albums shown here; older ones are on Zonerama (design/DESIGN.md §19.1). */
const ALBUMS_SHOWN = 6;

const lead = "Fotografie z farních akcí. Starší alba najdete na Zonerama.";

export const metadata: Metadata = {
  title: "Fotogalerie",
  alternates: { canonical: links.gallery },
  description: `${lead} Farnost Kuřim, Moravské Knínice, Jinačovice a Česká.`,
};

/** Fotogalerie (design/DESIGN.md §19). */
export default function GalleryPage() {
  return (
    <>
      <SiteHeader currentHref={links.gallery} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-7 pt-5 pb-12 md:gap-9 md:pt-7 md:pb-14 lg:gap-12 lg:pt-9 lg:pb-20"
      >
        <PageHeading title="Fotogalerie" color="green" size="standard" intro={lead} />
        <div className="flex flex-col gap-7 md:gap-9">
          {albums.slice(0, ALBUMS_SHOWN).map((album, i) => (
            <AlbumStrip key={album.id} album={album} position={i} />
          ))}
        </div>
        <ZoneramaPanel />
        <noscript>
          <style>{"[data-js-only]{display:none}"}</style>
        </noscript>
      </main>
    </>
  );
}
