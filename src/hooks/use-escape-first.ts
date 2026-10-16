"use client";

import { useEffect, useEffectEvent } from "react";

/**
 * While mounted, an Esc that `onEscape` takes (it returns `true`) goes no further: it is caught on `window` before
 * the page sees it, so an open tooltip hides without the lightbox behind it closing too (design/DESIGN.md §5,
 * Tooltips). An Esc it leaves (`false`) reaches the page as usual.
 */
export function useEscapeFirst(onEscape: () => boolean) {
  const handle = useEffectEvent(onEscape);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && handle()) e.stopPropagation();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
