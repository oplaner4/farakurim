"use client";

import { use } from "react";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { HeaderMenuContext } from "./HeaderMenu";

/**
 * Opens the header menu (design/DESIGN.md §20.2): the hamburger on mobile/tablet, the "Více" text button on
 * desktop. Both control the same menu through `HeaderMenu`.
 */
export function MenuButton({ id, controls, variant }: { id: string; controls: string; variant: "hamburger" | "more" }) {
  const { open, toggle } = use(HeaderMenuContext);

  if (variant === "more") {
    return (
      <button
        id={id}
        type="button"
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-12 px-3 text-ink hover:bg-surface aria-expanded:bg-blue-tint"
        aria-expanded={open}
        aria-controls={controls}
        onClick={(e) => toggle(e.currentTarget)}
      >
        <MenuIcon />
        Více
      </button>
    );
  }

  return (
    <button
      id={id}
      type="button"
      className="flex size-12 cursor-pointer items-center justify-center rounded-14 bg-blue-tint text-blue-ink hover:bg-blue-tint-alt lg:hidden"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={open ? "Zavřít menu" : "Otevřít menu"}
      onClick={(e) => toggle(e.currentTarget)}
    >
      {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
    </button>
  );
}
