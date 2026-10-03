import { clsx } from "clsx";
import type { Album } from "@/content/types";
import { GALLERY_URL } from "@/content/gallery";
import { formatLongDate } from "@/lib/czech";
import { ImageIcon } from "./icons";
import { SectionHeading } from "./SectionHeading";

const COVER_TINTS = [
  "bg-green-tint text-green-ink",
  "bg-blue-tint-alt text-blue-ink",
  "bg-orange-tint-alt text-orange-ink-deep",
  "bg-magenta-tint-alt text-magenta-ink",
];

export function GallerySection({ albums }: { albums: Album[] }) {
  return (
    <section
      aria-labelledby="fotogalerie"
      className="flex flex-col gap-4 pt-10 pb-2 md:gap-5 md:pt-14 lg:gap-6 lg:pt-20 lg:pb-0"
    >
      <SectionHeading
        id="fotogalerie"
        title="Fotogalerie"
        color="green"
        link={{ href: GALLERY_URL, label: "Celá fotogalerie", shortLabel: "Celá galerie" }}
      />
      {/* Mobile: full-bleed horizontal scroll row. Tablet: 2 × 2. Desktop: 4 columns. */}
      <ul className="-mx-4 flex snap-x snap-proximity scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-6 md:overflow-visible md:p-0 lg:grid-fit-250 lg:gap-5">
        {albums.slice(0, 4).map((album, i) => (
          <li key={album.id} className="shrink-0 basis-60 snap-start">
            <a href={album.href} className="group flex flex-col gap-2 text-ink no-underline hover:text-ink">
              <span
                className={clsx(
                  "flex h-42.5 items-center justify-center overflow-hidden rounded-18 md:h-55 md:rounded-20 lg:h-60 lg:rounded-24",
                  COVER_TINTS[i % COVER_TINTS.length],
                )}
              >
                {album.cover ? (
                  <img
                    src={album.cover}
                    alt=""
                    className="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-103"
                    loading="lazy"
                  />
                ) : (
                  <ImageIcon size={40} />
                )}
              </span>
              <time dateTime={album.date} className="text-13 text-muted md:text-14">
                {formatLongDate(album.date)}
              </time>
              <h3 className="text-16 leading-card font-bold underline-offset-3 group-hover:text-green-ink group-hover:underline md:text-18">
                {album.title}
              </h3>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
