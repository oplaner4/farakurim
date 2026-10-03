import { GALLERY_URL } from "@/content/gallery";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ExternalLinkIcon } from "@/components/ui/icons";

/** "Další alba" (design/DESIGN.md §19.1, 3): the older albums live on Zonerama. */
export function ZoneramaPanel() {
  return (
    <section
      aria-labelledby="dalsi-alba"
      className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 overflow-hidden rounded-24 bg-green-tint px-5 py-5.5 md:px-8 md:py-7"
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-16 bg-green shard-tr" />
      <div className="flex flex-col gap-1 pr-12">
        <h2 id="dalsi-alba" className="text-20 font-bold md:text-24">
          Další alba
        </h2>
        <p className="text-ink-2">Všechna starší alba farnosti jsou na Zonerama.</p>
      </div>
      <ButtonLink href={GALLERY_URL} variant="green" className="max-md:basis-full">
        Více fotogalerií na Zonerama
        <ExternalLinkIcon size={18} />
      </ButtonLink>
    </section>
  );
}
