"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-now";
import { MoonIcon, SunIcon } from "@/components/ui/icons/status-icons";
import { Tooltip } from "@/components/ui/Tooltip";

const MESSAGE_MS = 2000;

/**
 * Light/dark switch. The icon is chosen by CSS (`dark:`), so it is right before hydration;
 * the label and `aria-pressed` follow the effective theme once the page is hydrated. The label shows as a tooltip
 * from tablet up; on mobile a switch confirms itself with a short status message instead (DESIGN.md §5, Tooltips).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes reads the saved theme while hydrating; the prerendered HTML has none.
  const dark = useHydrated() && resolvedTheme === "dark";
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  function toggle() {
    setTheme(dark ? "light" : "dark");
    setMessage(dark ? "Světlý režim zapnut" : "Tmavý režim zapnut");
  }

  const label = dark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim";
  return (
    <span className="relative flex flex-none">
      <Tooltip label={label}>
        <button
          type="button"
          aria-label={label}
          className="flex size-12 cursor-pointer items-center justify-center rounded-14 bg-blue-tint text-blue-ink hover:bg-blue-tint-alt"
          aria-pressed={dark}
          onClick={toggle}
        >
          <MoonIcon size={22} className="dark:hidden" />
          <SunIcon size={22} className="hidden dark:block" />
        </button>
      </Tooltip>
      {/* Stays mounted so the message is announced; seen on mobile only. */}
      <span role="status" className="absolute top-full right-0 z-50 mt-2.5">
        {message && (
          <span
            key={message}
            className="block rounded-8 bg-ink px-2.75 py-1.75 text-14 leading-card font-bold whitespace-nowrap text-bg motion-safe:animate-fade-in md:sr-only"
          >
            {message}
          </span>
        )}
      </span>
    </span>
  );
}
