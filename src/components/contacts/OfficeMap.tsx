"use client";

import { useState } from "react";
import { contacts } from "@/content/site";
import { useHydrated } from "@/hooks/use-now";
import { PinIcon } from "@/components/ui/icons";

/**
 * The Mapy.com embed of the parish office over its designed placeholder. The iframe is added after hydration, so its
 * `load` event is never missed, and fades in once loaded; without JS the placeholder stays.
 */
export function OfficeMap() {
  const hydrated = useHydrated();
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-45 overflow-hidden rounded-18 bg-blue-tint-alt md:h-50 lg:h-75">
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center gap-2 text-14 text-blue-ink"
      >
        <PinIcon />
        {contacts.street}
      </span>
      {hydrated && (
        <iframe
          src={contacts.mapEmbed}
          title={`Mapa: fara, ${contacts.street}, ${contacts.town}`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setLoaded(true)}
          data-loaded={loaded}
          className="absolute inset-0 size-full border-0 opacity-0 data-[loaded=true]:opacity-100 motion-safe:transition-opacity motion-safe:duration-300"
        />
      )}
    </div>
  );
}
