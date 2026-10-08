import type { Album } from "@/content/types/gallery";
import { links } from "@/content/site";
import { formatDayMonth, formatLongDate } from "@/lib/shared/czech";
import { albumAnchor } from "@/lib/gallery/albums";
import { AlbumPhotoTile } from "@/components/gallery/AlbumPhotoTile";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AlbumCarousel } from "./AlbumCarousel";
import { ArrowLink } from "@/components/ui/ArrowLink";

/**
 * Fotogalerie (design/DESIGN.md §4.5): the newest album's photos in a carousel, then the next three albums as
 * compact rows ("Další alba"), under the carousel on mobile and tablet and beside it on desktop.
 */
export function GallerySection({ albums }: { albums: Album[] }) {
  const [newest, ...older] = albums;
  if (!newest) return null;
  const albumHref = (album: Album) => `${links.gallery}${albumAnchor(album)}`;
  return (
    <section aria-labelledby="fotogalerie" className="flex flex-col gap-4 pt-10 pb-2 md:pt-14 lg:pt-20 lg:pb-0">
      <SectionHeading
        id="fotogalerie"
        title="Fotogalerie"
        color="green"
        link={{ href: links.gallery, label: "Celá fotogalerie" }}
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <figure className="flex min-w-0 flex-col gap-3 lg:flex-1">
          <AlbumCarousel album={newest} />
          <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="flex flex-col">
              <time dateTime={newest.date} className="text-14 text-muted">
                {formatLongDate(newest.date)}
              </time>
              <strong className="text-18 leading-card md:text-20 lg:text-22">{newest.title}</strong>
            </span>
            <ArrowLink href={albumHref(newest)} tone="green">
              Celé album
            </ArrowLink>
          </figcaption>
        </figure>
        {older.length > 0 && (
          <div className="flex min-w-0 flex-col gap-2.5 lg:w-85 lg:flex-none">
            <h3 className="text-14 font-bold text-muted">Další alba</h3>
            <ul className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-2.5 lg:flex">
              {older.slice(0, 3).map((album, i) => (
                <li key={album.id}>
                  <a
                    href={albumHref(album)}
                    className="group flex items-center gap-3 rounded-16 bg-surface p-2 text-ink no-underline hover:text-ink"
                  >
                    <span className="h-16.5 w-22 flex-none overflow-hidden rounded-10">
                      <AlbumPhotoTile
                        photo={album.photos?.[0]}
                        size="small"
                        sizes="88px"
                        index={i + 1}
                        alt=""
                        iconSize={20}
                        shardClassName="h-6 w-8"
                        className="motion-safe:group-hover:scale-103"
                      />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <time dateTime={album.date} className="text-13 text-muted">
                        {formatDayMonth(album.date)}
                      </time>
                      <strong className="text-15 leading-card underline-offset-3 transition-colors group-hover:text-green-ink group-hover:underline">
                        {album.title}
                      </strong>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
