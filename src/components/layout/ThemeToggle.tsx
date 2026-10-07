"use client";

import { useTheme } from "next-themes";
import { useHydrated } from "@/hooks/use-now";
import { MoonIcon, SunIcon } from "@/components/ui/icons/status-icons";

/**
 * Light/dark switch. The icon is chosen by CSS (`dark:`), so it is right before hydration;
 * the label and `aria-pressed` follow the effective theme once the page is hydrated.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes reads the saved theme while hydrating; the prerendered HTML has none.
  const dark = useHydrated() && resolvedTheme === "dark";

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
