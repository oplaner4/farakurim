"use client";

import { useEffect, useState } from "react";
import { CopyIcon } from "@/components/ui/icons";

const RESET_MS = 3000;

/** Copies `text` with the Clipboard API; the label switches to "Zkopírováno" for a moment (§15.1). */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    // Needs JS: hidden by the page's <noscript> style.
    <button
      type="button"
      onClick={copy}
      data-js-only
      className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-12 border-2 border-orange-ink px-4 text-15 font-bold text-orange-ink-deep hover:bg-orange-tint-alt"
    >
      <CopyIcon size={16} />
      <span aria-live="polite">{copied ? "Zkopírováno" : "Zkopírovat"}</span>
    </button>
  );
}
