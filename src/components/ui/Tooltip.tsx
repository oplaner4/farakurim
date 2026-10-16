"use client";

import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { useRef, useState, type ReactNode } from "react";
import { useEscapeFirst } from "@/hooks/use-escape-first";

/*
 * The tooltip's layer: as wide as the button and as tall as the 10 px gap, so the pointer can move from the button
 * onto the bubble without the tooltip hiding. Shown after 400 ms of hover (`hover:` applies only under
 * `(hover: hover)`, so never on touch), at once on keyboard focus (`data-focused`), never in the mobile layout.
 */
const layer = cva(
  "pointer-events-auto invisible absolute inset-x-0 z-50 h-2.5 opacity-0 transition-[opacity,visibility] duration-120 group-hover/tip:visible group-hover/tip:opacity-100 group-hover/tip:delay-400 group-data-dismissed/tip:hidden group-data-focused/tip:visible group-data-focused/tip:opacity-100 group-data-focused/tip:delay-0 max-md:hidden",
  { variants: { side: { bottom: "top-full", top: "bottom-full" } } },
);

/* A 5 px triangle in the gap, pointing at the button's centre. */
const arrow = cva("absolute top-0 left-1/2 -translate-x-1/2 border-5 border-transparent", {
  variants: {
    side: { bottom: "", top: "" },
    tone: { page: "", lightbox: "" },
  },
  compoundVariants: [
    { side: "bottom", tone: "page", className: "border-b-ink" },
    { side: "top", tone: "page", className: "border-t-ink" },
    { side: "bottom", tone: "lightbox", className: "border-b-white" },
    { side: "top", tone: "lightbox", className: "border-t-white" },
  ],
});

const bubble = cva("absolute rounded-8 px-2.75 py-1.75 text-14 leading-card font-bold whitespace-nowrap", {
  variants: {
    side: { bottom: "top-2.5", top: "bottom-2.5" },
    align: { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" },
    /* The page's ink with its background as text (white on ink; dark on light in the dark theme). */
    tone: { page: "bg-ink text-bg", lightbox: "bg-white text-lightbox" },
  },
});

type Props = {
  /** The button's `aria-label`, phrased as its action ("Přiblížit"); the tooltip shows the same text. */
  label: string;
  /** Under the button (the default) or above it (the lightbox's zoom bar). */
  side?: "bottom" | "top";
  /** The button edge the tooltip lines up with: `end` (right), `start` for a button at the left side. */
  align?: "start" | "center" | "end";
  /** `lightbox` inside the lightbox, which is always dark. */
  tone?: "page" | "lightbox";
  /** Positioned placement of the button (`absolute top-1/2 left-6`), as the tooltip wraps it; else `relative`. */
  className?: string;
  /** The icon-only button, with `label` as its `aria-label`. */
  children: ReactNode;
};

/**
 * The tooltip of an icon-only button (design/DESIGN.md §5, Tooltips). It hides when the pointer or focus leaves,
 * on a click (until the pointer or focus comes back), and the first Esc only hides it. It is `aria-hidden`, as the button's `aria-label` already says the same.
 */
export function Tooltip({ label, side = "bottom", align = "end", tone = "page", className, children }: Props) {
  const tipRef = useRef<HTMLSpanElement>(null);
  const [dismissed, setDismissed] = useState(false);
  // Set when the focus arrives by keyboard, not by `:focus-visible` alone: that also starts to match on the button
  // focused by a click (the lightbox's Zavřít) as soon as a key is pressed, Esc included.
  const [focused, setFocused] = useState(false);
  useEscapeFirst(() => {
    if (!tipRef.current?.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    setDismissed(true);
    return true;
  });

  return (
    <span
      data-dismissed={dismissed || undefined}
      data-focused={focused || undefined}
      className={clsx("group/tip flex flex-none", className || "relative")}
      onPointerEnter={() => setDismissed(false)}
      onFocus={(e) => {
        setDismissed(false);
        setFocused(e.target.matches(":focus-visible"));
      }}
      onBlur={() => setFocused(false)}
      onClick={() => setDismissed(true)}
    >
      {children}
      <span ref={tipRef} role="tooltip" aria-hidden className={layer({ side })}>
        <span className={arrow({ side, tone })} />
        <span className={bubble({ side, align, tone })}>{label}</span>
      </span>
    </span>
  );
}
