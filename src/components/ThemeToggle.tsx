"use client";

import { useSyncExternalStore } from "react";
import { isDarkTheme, setTheme, subscribeTheme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

/**
 * Light/dark switch. The icon is chosen by CSS (`dark:`), so it is right before hydration;
 * the label and `aria-pressed` follow the effective theme once the page is hydrated.
 */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, isDarkTheme, () => false);

  return (
    <button
      type="button"
      className="flex size-12 flex-none cursor-pointer items-center justify-center rounded-14 bg-blue-tint text-blue-ink hover:bg-blue-tint-alt"
      aria-label={dark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
      aria-pressed={dark}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <MoonIcon size={22} className="dark:hidden" />
      <SunIcon size={22} className="hidden dark:block" />
    </button>
  );
}
