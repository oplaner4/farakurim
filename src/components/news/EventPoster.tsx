import { clsx } from "clsx";
import type { NewsEvent } from "@/content/types/news";
import { fileType } from "@/lib/shared/czech";
import { isImageFile } from "@/lib/shared/lightbox";
import { ZoomInIcon } from "@/components/ui/icons";
import { PosterPlaceholder } from "@/components/ui/PosterPlaceholder";
import { PosterLink } from "./PosterLink";

type Props = {
  poster: NewsEvent["poster"];
  /** The full-size file: an image opens in the lightbox, a PDF in the browser. */
  href: string;
  title: string;
  /** Lightbox alt text: title, date, time and place (§21.3). */
  alt: string;
};

/**
 * The poster (or a designed placeholder when only the poster file is known), which opens the full-size file in the
 * poster lightbox (design/DESIGN.md §13.3, §21), and a download link under it.
 */
export function EventPoster({ poster, href, title, alt }: Props) {
  const boxClass = clsx(
    "group relative flex h-85 w-60 items-center justify-center overflow-hidden rounded-16 bg-magenta-tint-alt text-magenta-ink no-underline",
    "md:h-83.5 md:w-auto md:rounded-18 lg:h-115 lg:rounded-20",
    /* Dark: posters (often white paper) get a margin of the tint around them. */
    poster && "dark:p-3",
  );
  const content = (
    <>
      {poster ? (
        <img
          src={poster.src}
          alt={poster.alt}
          className="size-full object-contain motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-103"
        />
      ) : (
        <PosterPlaceholder iconSize={40} className="h-20 w-28 lg:h-28 lg:w-40" />
      )}
      <span
        aria-hidden="true"
        className="absolute right-2.5 bottom-2.5 flex size-10 items-center justify-center rounded-full bg-overlay text-ink"
      >
        <ZoomInIcon size={20} />
      </span>
    </>
  );

  return (
    <div className="flex flex-col items-center gap-2.5 md:w-59 md:shrink-0 md:items-stretch md:gap-2 lg:w-auto lg:gap-2.5">
      {isImageFile(href) ? (
        <PosterLink
          href={href}
          hashId="plakat"
          title={title}
          alt={alt}
          aria-label="Zobrazit plakát přes celou obrazovku"
          className={boxClass}
        >
          {content}
        </PosterLink>
      ) : (
        <a href={href} aria-label={`Otevřít plakát (${fileType(href)})`} className={boxClass}>
          {content}
        </a>
      )}
      <a href={href} download className="flex min-h-11 items-center font-bold md:text-15 lg:text-16">
        Stáhnout plakát
        {/* The tablet column is narrow. */}
        <span className="md:max-lg:hidden">&nbsp;({fileType(href)})</span>
      </a>
    </div>
  );
}
