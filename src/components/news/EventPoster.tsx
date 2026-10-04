import { clsx } from "clsx";
import type { NewsEvent } from "@/content/types/news";
import { fileType } from "@/lib/shared/czech";
import { PosterPlaceholder } from "@/components/ui/PosterPlaceholder";

/**
 * The poster (or a designed placeholder when only the poster file is known) and a link to the full-size file.
 */
export function EventPoster({ poster, href }: { poster: NewsEvent["poster"]; href: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 md:w-59 md:shrink-0 md:items-stretch md:gap-2 lg:w-auto lg:gap-2.5">
      <span
        className={clsx(
          "relative flex h-85 w-60 items-center justify-center overflow-hidden rounded-16 bg-magenta-tint-alt text-magenta-ink",
          "md:h-83.5 md:w-auto md:rounded-18 lg:h-115 lg:rounded-20",
          /* Dark: posters (often white paper) get a margin of the tint around them. */
          poster && "dark:p-3",
        )}
      >
        {poster ? (
          <img src={poster.src} alt={poster.alt} className="size-full object-contain" />
        ) : (
          <PosterPlaceholder iconSize={40} className="h-20 w-28 lg:h-28 lg:w-40" />
        )}
      </span>
      <a href={href} className="flex min-h-11 items-center font-bold md:text-15 lg:text-16">
        Plakát v plné velikosti
        {/* The tablet column is narrow. */}
        <span className="md:max-lg:hidden">&nbsp;({fileType(href)})</span>
      </a>
    </div>
  );
}
