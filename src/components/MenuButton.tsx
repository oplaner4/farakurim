"use client";

import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon } from "./icons";

/**
 * Mobile/tablet menu toggle. It only owns `aria-expanded`; the header shows the menu with a
 * `group-has-aria-expanded` selector, so the rest of the header stays a server component.
 */
export function MenuButton({ id, controls }: { id: string; controls: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <button
      id={id}
      type="button"
      className="flex size-12 cursor-pointer items-center justify-center rounded-14 bg-blue-tint text-blue-ink hover:bg-blue-tint-alt lg:hidden"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={open ? "Zavřít menu" : "Otevřít menu"}
      onClick={() => setOpen((v) => !v)}
    >
      {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
    </button>
  );
}
