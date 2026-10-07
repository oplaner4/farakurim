"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "./icons/status-icons";

const RESET_MS = 3000;

export const copyButton = cva(
  "flex cursor-pointer items-center border-2 border-orange-ink font-bold text-orange-ink-deep hover:bg-orange-tint-alt",
  {
    variants: {
      size: {
        default: "min-h-11 rounded-12 px-4 text-15",
        /* The payment box of a project card (§22.1). The mockup's 40px is raised to the 44px touch target. */
        small: "min-h-11 rounded-10 px-3 text-14",
      },
    },
    defaultVariants: { size: "default" },
  },
);

type Props = VariantProps<typeof copyButton> & {
  text: string;
  /** "Zkopírovat číslo účtu", "Zkopírovat VS". */
  label?: string;
  /** Placement only (`self-start`, a margin). */
  className?: string;
};

/**
 * Copies `text` with the Clipboard API; the label switches to "Zkopírováno" with a tick for a moment (§15.1, §22).
 * The changed label fades in; the live region around it stays mounted so the change is announced.
 */
export function CopyButton({ text, label = "Zkopírovat", size, className }: Props) {
  const [copied, setCopied] = useState(false);
  // No fade on the first render, only when the label changes.
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setChanged(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    // Needs JS: hidden by the page's <noscript> style.
    <button type="button" onClick={copy} data-js-only className={copyButton({ size, className })}>
      <span aria-live="polite" className="flex items-center">
        <span
          key={String(copied)}
          className={clsx("flex items-center gap-1.5", changed && "motion-safe:animate-fade-in")}
        >
          {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
          {copied ? "Zkopírováno" : label}
        </span>
      </span>
    </button>
  );
}
