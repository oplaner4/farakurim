"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode, Ref, RefObject } from "react";
import YetAnotherLightbox, { type LightboxExternalProps, useController } from "yet-another-react-lightbox";
import { CloseIcon } from "./icons/navigation-icons";
import "@/styles/lightbox.css";

/** The round translucent buttons of the lightbox (design/DESIGN.md §21.1): close 48 px, prev/next 56 px. */
export const lightboxButton = cva(
  "pointer-events-auto flex flex-none cursor-pointer items-center justify-center rounded-full bg-lightbox-button text-white no-underline hover:bg-lightbox-button-hover hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  {
    variants: {
      size: {
        close: "size-12",
        nav: "size-14",
        /* "Album na Zonerama" */
        pill: "min-h-12 gap-2 px-4 text-15 font-bold",
        /* The poster zoom label ("Celý", "150 %"). */
        label: "min-h-12 min-w-18 px-3 text-15 font-bold",
      },
    },
    defaultVariants: { size: "close" },
  },
);

type ShellProps = Omit<LightboxExternalProps, "open" | "labels" | "className"> & {
  /** `aria-label` of the dialog: "Fotografie z alba …", "Plakát: …". */
  label: string;
  /** `lightbox-photo` or `lightbox-poster`: the slide padding in src/styles/lightbox.css. */
  variant: "photo" | "poster";
  /** Moves the focus to the close button once the lightbox has opened. */
  closeRef: RefObject<HTMLButtonElement | null>;
};

/**
 * yet-another-react-lightbox (dialog with `aria-modal`, the page made inert behind it, focus returned to the
 * opener, scroll lock, swipe and arrow keys) without its own buttons: the variants draw the design's controls.
 */
export function LightboxShell({ label, variant, closeRef, render, on, carousel, controller, ...rest }: ShellProps) {
  return (
    <YetAnotherLightbox
      open
      className={clsx("lightbox", `lightbox-${variant}`)}
      labels={{
        Lightbox: label,
        Carousel: "karusel",
        Slide: "snímek",
        "Photo gallery": label,
        "{index} of {total}": "{index} z {total}",
        Previous: "Předchozí",
        Next: "Další",
        Close: "Zavřít (Esc)",
      }}
      toolbar={{ buttons: [] }}
      carousel={{ padding: 0, ...carousel }}
      controller={{ closeOnBackdropClick: true, ...controller }}
      render={{ buttonPrev: () => null, buttonNext: () => null, ...render }}
      on={{ ...on, entered: () => closeRef.current?.focus() }}
      {...rest}
    />
  );
}

/**
 * Wraps the controls: covers the lightbox but lets swipes and clicks through to the slide. A press on a control
 * does not reach the library, so it neither starts a swipe nor counts as a click on the backdrop.
 */
export function LightboxControls({ children }: { children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col text-white"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

type TopBarProps = {
  /** Bold first line: the counter ("3 / 12", announced) or "Plakát". */
  heading: string;
  live?: boolean;
  /** Muted second line, one line with an ellipsis. */
  title: string;
  /** Buttons before the close button ("Album na Zonerama"). */
  actions?: ReactNode;
  closeRef: Ref<HTMLButtonElement>;
  className?: string;
};

/** The top bar (design/DESIGN.md §21.1): heading and title on the left, actions and "Zavřít" on the right. */
export function LightboxTopBar({ heading, live, title, actions, closeRef, className }: TopBarProps) {
  const { close } = useController();
  return (
    <div className={clsx("flex items-center justify-between gap-3 p-3 md:px-6 md:py-4 lg:px-8 lg:py-5", className)}>
      <div className="flex min-w-0 flex-col leading-card">
        <span aria-live={live ? "polite" : undefined} className="text-15 font-bold">
          {heading}
        </span>
        <span className="truncate text-14 text-lightbox-ink-2">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button
          ref={closeRef}
          type="button"
          aria-label="Zavřít (Esc)"
          className={lightboxButton({ size: "close" })}
          onClick={close}
        >
          <CloseIcon size={24} />
        </button>
      </div>
    </div>
  );
}

/** A round lightbox button ("Předchozí fotografie", "Oddálit"). */
export function LightboxButton({
  size = "nav",
  className,
  ...rest
}: ComponentProps<"button"> & VariantProps<typeof lightboxButton>) {
  return <button type="button" className={lightboxButton({ size, className })} {...rest} />;
}
