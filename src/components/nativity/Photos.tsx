import { clsx } from "clsx";
import type { AlbumPhoto } from "@/content/types/gallery";
import type { NativityAlbum } from "@/content/types/nativity";
import { photoAlt } from "@/lib/gallery/albums";
import { NEW_TAB } from "@/lib/shared/links";
import { AlbumPhotoTile } from "@/components/gallery/AlbumPhotoTile";
import { loadPageLightbox, openPagePhoto } from "@/components/gallery/PageLightbox";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { ExternalLinkIcon } from "@/components/ui/icons/navigation-icons";
import { ImageIcon } from "@/components/ui/icons/media-icons";
import { NativitySection } from "./NativitySection";

/** The placeholder tiles of this year's photos take the brand tints in turn. */
const TINTS = ["bg-orange-tint-alt", "bg-blue-tint-alt", "bg-green-tint", "bg-magenta-tint-alt"];
/** Photos shown in the grid; the lightbox has all of them. */
const SHOWN = 6;

type Props = {
  year: number;
  after: boolean;
  /** This year's photos, shown after the exhibition; they open the page's lightbox at `#foto-N`. */
  photos?: AlbumPhoto[];
  /** The photos' alt text: "<title>, fotografie N". */
  title: string;
  /** The season's own album, shown after the exhibition. */
  album?: NativityAlbum;
  /** The earlier years' albums, newest first. */
  pastAlbums: NativityAlbum[];
  oldSiteResults: { year: number; url: string }[];
};

/**
 * "Z minulých ročníků" (design/DESIGN.md §30.2): the earlier years' Zonerama albums and the results kept on the old
 * site. After the exhibition the block is "Fotografie": this year's photos (designed placeholders until there are
 * some), opening the page's lightbox, and its album first. Without JS a photo links to its large file.
 */
export function Photos({ year, after, photos, title, album, pastAlbums, oldSiteResults }: Props) {
  const past = (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-2">
        {pastAlbums.map((a) => (
          <li key={a.year}>
            <a
              href={a.url}
              {...NEW_TAB}
              className="flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 font-bold text-ink no-underline hover:border-green hover:text-ink"
            >
              {a.year}
              <ExternalLinkIcon size={16} />
              <span className="sr-only"> (otevře se v novém okně)</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-15 text-muted">
        Výsledky soutěží{" "}
        {oldSiteResults.map((r, i) => (
          <span key={r.year}>
            {i > 0 && (i === oldSiteResults.length - 1 ? " a " : ", ")}
            <a href={r.url}>{r.year}</a>
          </span>
        ))}{" "}
        a starší ročníky najdete na původním webu farnosti.
      </p>
    </div>
  );
  if (!after) {
    return (
      <NativitySection id="foto" title="Z minulých ročníků" color="green">
        {past}
      </NativitySection>
    );
  }
  return (
    <NativitySection id="foto" title="Fotografie" color="green">
      {photos ? (
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {photos.slice(0, SHOWN).map((photo, i) => (
            <li key={photo.small}>
              <a
                href={photo.large}
                aria-label={`${photoAlt({ title }, i + 1)} – zobrazit zvětšenou`}
                className="group block aspect-4/3 overflow-hidden rounded-14"
                onPointerEnter={loadPageLightbox}
                onFocus={loadPageLightbox}
                onClick={openPagePhoto(i + 1)}
              >
                <AlbumPhotoTile
                  photo={photo}
                  size="small"
                  index={i}
                  alt=""
                  iconSize={24}
                  shardClassName="h-8 w-11"
                  className="motion-safe:group-hover:scale-103"
                />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <ul aria-hidden="true" className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: SHOWN }, (_, i) => (
            <li
              key={i}
              className={clsx(
                "flex aspect-4/3 items-center justify-center rounded-14 text-muted",
                TINTS[i % TINTS.length],
              )}
            >
              <ImageIcon size={24} />
            </li>
          ))}
        </ul>
      )}
      {album && (
        <ArrowLink href={album.url} icon={ExternalLinkIcon} className="self-start">
          Celé album výstavy {year} na Zonerama
        </ArrowLink>
      )}
      <h3 className="text-18 font-bold">Z minulých let</h3>
      {past}
    </NativitySection>
  );
}
