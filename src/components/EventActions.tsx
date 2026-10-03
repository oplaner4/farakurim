"use client";

import { useState } from "react";
import type { IsoDate } from "@/content/types";
import { useToday } from "@/lib/use-now";
import { buttonLink, ButtonLink } from "./ButtonLink";
import { CalendarPlusIcon, ShareIcon } from "./icons";

type Props = {
  title: string;
  end: IsoDate;
  calendarHref: string;
  renderedAt: number;
};

/**
 * "Přidat do kalendáře" (.ics download, hidden once the event has ended) and "Sdílet": the share sheet where
 * the browser has one, otherwise the link is copied (design/DESIGN.md §13.2). Mobile and desktop: a column.
 * Tablet: a row under the "Kdy a kde" rows.
 */
export function EventActions({ title, end, calendarHref, renderedAt }: Props) {
  const today = useToday(renderedAt);
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href.split(/[?#]/)[0];
    if (navigator.share) {
      // Closing the share sheet rejects; there is nothing to report.
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 pt-1 md:mt-auto md:flex-row md:flex-wrap md:gap-2.5 md:pt-0 lg:mt-0 lg:flex-col lg:pt-1">
      {today <= end && (
        <ButtonLink
          href={calendarHref}
          download
          variant="magenta"
          size="block"
          className="min-h-13 md:max-lg:shrink md:max-lg:grow md:max-lg:basis-50"
        >
          <CalendarPlusIcon size={18} />
          Přidat do kalendáře
        </ButtonLink>
      )}
      {/* Needs JS: hidden by the page's <noscript> style. */}
      <button
        type="button"
        onClick={share}
        data-js-only
        className={buttonLink({
          variant: "outline-magenta",
          size: "block",
          className:
            "min-h-12 cursor-pointer text-16 md:min-h-13 md:text-17 md:max-lg:shrink md:max-lg:grow md:max-lg:basis-35 lg:min-h-12.5",
        })}
      >
        <ShareIcon size={18} />
        Sdílet
      </button>
      {/* The live region stays in the DOM (`contents` adds no box), so the message is announced. */}
      <div role="status" className="contents">
        {copied && (
          <p className="text-center text-14 text-ink-2 md:basis-full md:text-left lg:text-center lg:text-15">
            Odkaz je zkopírovaný.
          </p>
        )}
      </div>
    </div>
  );
}
