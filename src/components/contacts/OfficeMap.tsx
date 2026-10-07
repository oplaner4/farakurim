"use client";

import { contacts } from "@/content/site";
import { useAfterPageLoad } from "@/hooks/use-after-page-load";
import { useFadeInOnLoad } from "@/hooks/use-fade-in-on-load";
import { PinIcon } from "@/components/ui/icons/contact-icons";

/**
 * The Mapy.com embed of the parish office over its designed placeholder. The iframe is added once the page has
 * loaded and the browser is idle (its ~1.8 MB would otherwise delay the page's own content on phones); like an album
 * photo, it fades in once loaded while the placeholder pulses. Without JS the placeholder stays.
 */
export function OfficeMap() {
  const ready = useAfterPageLoad();
  const fadeIn = useFadeInOnLoad();

  return (
    <div className="relative isolate h-45 overflow-hidden rounded-18 md:h-50 lg:h-75">
      {ready && (
        <iframe
          ref={fadeIn}
          src={contacts.mapEmbed}
          title={`Mapa: fara, ${contacts.street}, ${contacts.town}`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="peer absolute inset-0 size-full border-0 data-loading:opacity-0 motion-safe:transition-opacity motion-safe:duration-300"
        />
      )}
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-1 flex items-center justify-center gap-2 bg-blue-tint-alt text-14 text-blue-ink motion-safe:peer-data-loading:animate-pulse"
      >
        <PinIcon />
        {contacts.street}
      </span>
    </div>
  );
}
