"use client";

import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** Desktop breakpoint (`lg`): there the menu is a panel over the page, below it a drawer in the flow. */
const OVERLAY_QUERY = "(min-width: 75rem)";

export const HeaderMenuContext = createContext<{
  open: boolean;
  toggle: (trigger: HTMLButtonElement) => void;
}>({ open: false, toggle: () => {} });

/**
 * The `<header>` with the open state of its menu, shared by the "Více" button (desktop) and the hamburger
 * (mobile/tablet), so both keep `aria-expanded` in sync. The header shows the menu with a
 * `group-has-aria-expanded` selector, so the menu itself stays server-rendered (design/DESIGN.md §20.2).
 * Esc closes it and returns focus to the button; on desktop a click outside the header closes it too.
 */
export function HeaderMenu({ className, children }: { className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    // Only the desktop panel overlays the page; closing the in-flow drawer on a tap would shift the page under it.
    const onPointer = (e: PointerEvent) => {
      if (!window.matchMedia(OVERLAY_QUERY).matches) return;
      if (!headerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const value = useMemo(
    () => ({
      open,
      toggle: (trigger: HTMLButtonElement) => {
        triggerRef.current = trigger;
        setOpen((v) => !v);
      },
    }),
    [open],
  );

  return (
    <HeaderMenuContext value={value}>
      <header ref={headerRef} className={className}>
        {children}
      </header>
    </HeaderMenuContext>
  );
}
