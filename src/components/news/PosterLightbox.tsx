"use client";

import { clsx } from "clsx";
import { type RefObject, useRef, useState } from "react";
import type { ZoomRef } from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { fileType } from "@/lib/shared/czech";
import { zoomLabel, zoomStep } from "@/lib/shared/lightbox";
import { DownloadIcon } from "@/components/ui/icons/media-icons";
import { LightboxButton, LightboxControls, LightboxShell, LightboxTopBar } from "@/components/ui/Lightbox";

const PLUGINS = [Zoom];

type Props = {
  /** The poster image, also the "Stáhnout" file. */
  src: string;
  title: string;
  alt: string;
  onClose: () => void;
};

/**
 * The poster lightbox (design/DESIGN.md §21.3): the poster fitted to the screen, zoomed by the toolbar
 * (Celý, 150, 200, 300 %), the wheel, +/−, pinch or a double tap, and panned by dragging; "Stáhnout" downloads it.
 */
export function PosterLightbox({ src, title, alt, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const zoomRef = useRef<ZoomRef>(null);
  const [zoom, setZoom] = useState(1);

  return (
    <LightboxShell
      variant="poster"
      label={`Plakát: ${title}`}
      closeRef={closeRef}
      slides={[{ src, alt }]}
      index={0}
      close={onClose}
      plugins={PLUGINS}
      // A double tap or click toggles 100 and 200 %; the photos of a poster are big enough for 300 %.
      zoom={{ ref: zoomRef, maxZoomPixelRatio: 3, scrollToZoom: true, doubleClickMaxStops: 1 }}
      carousel={{ finite: true }}
      on={{ zoom: ({ zoom: z }) => setZoom(z) }}
      render={{
        buttonZoom: () => null,
        controls: () => <PosterControls src={src} title={title} zoom={zoom} zoomRef={zoomRef} closeRef={closeRef} />,
      }}
    />
  );
}

type ControlsProps = {
  src: string;
  title: string;
  zoom: number;
  zoomRef: RefObject<ZoomRef | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
};

function PosterControls({ src, title, zoom, zoomRef, closeRef }: ControlsProps) {
  const changeZoom = (z: number) => zoomRef.current?.changeZoom(z);
  const zoomed = zoom > 1.01;
  return (
    <LightboxControls>
      {/* Zoomed, the poster pans under the bars, which then cover it. */}
      <LightboxTopBar heading="Plakát" title={title} closeRef={closeRef} className={clsx(zoomed && "bg-lightbox")} />
      <div
        className={clsx("mt-auto flex flex-col items-center gap-2.5 px-4 pt-3.5 pb-7 md:pb-6", zoomed && "bg-lightbox")}
      >
        <div className="flex items-center gap-2.5">
          <LightboxButton
            size="close"
            aria-label="Oddálit"
            className="text-24 font-bold"
            onClick={() => changeZoom(zoomStep(zoom, -1))}
          >
            −
          </LightboxButton>
          <LightboxButton size="label" aria-label="Velikost podle obrazovky" onClick={() => changeZoom(1)}>
            {zoomLabel(zoom)}
          </LightboxButton>
          <LightboxButton
            size="close"
            aria-label="Přiblížit"
            className="text-24 font-bold"
            onClick={() => changeZoom(zoomStep(zoom, 1))}
          >
            +
          </LightboxButton>
          <a
            href={src}
            download
            className="pointer-events-auto ml-1.5 flex min-h-12 items-center gap-2 rounded-full bg-white px-4.5 text-15 font-bold text-lightbox no-underline hover:bg-lightbox-ink-2 hover:text-lightbox focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <DownloadIcon size={18} />
            <span>
              Stáhnout<span className="max-md:hidden"> ({fileType(src)})</span>
            </span>
          </a>
        </div>
        <p className="text-13 text-lightbox-hint">
          <span className="lg:hidden">Přibližte dvěma prsty nebo dvojitým klepnutím</span>
          <span className="max-lg:hidden">Kolečko myši nebo +/− přiblíží, tažením posunete</span>
        </p>
      </div>
    </LightboxControls>
  );
}
