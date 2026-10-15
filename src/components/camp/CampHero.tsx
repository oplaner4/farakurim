import type { campHero } from "@/content/camp";

/**
 * The wide photo of O táboru (design/DESIGN.md §29.2, 1): 220 / 320 / 400 px tall, a green shard top-left and an
 * orange one bottom-right.
 */
export function CampHero({ hero }: { hero: typeof campHero }) {
  return (
    <div className="relative h-55 overflow-hidden rounded-24 bg-orange-tint md:h-80 md:rounded-26 lg:h-100 lg:rounded-28">
      <img
        src={hero.src}
        srcSet={`${hero.small} 800w, ${hero.src} 1600w`}
        sizes="(min-width: 1200px) 1200px, 100vw"
        alt={hero.alt}
        fetchPriority="high"
        style={{ objectPosition: `50% ${hero.focusY}%` }}
        className="size-full object-cover"
      />
      <span aria-hidden="true" className="absolute top-0 left-0 h-15 w-22.5 bg-green shard-tl" />
      <span aria-hidden="true" className="absolute right-0 bottom-0 h-22.5 w-35 bg-orange shard-br" />
    </div>
  );
}
