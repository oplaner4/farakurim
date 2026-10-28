import { clsx } from "clsx";
import { Fragment } from "react";
import type { StatusPanel as Status } from "@/lib/nativity/status";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CalendarIcon, PinIcon } from "@/components/ui/icons/contact-icons";
import { FileIcon } from "@/components/ui/icons/media-icons";
import { NativityStarIcon } from "@/components/ui/icons/nativity-icons";

/**
 * The status panel (design/DESIGN.md §30.2): the countdown before the exhibition, today's hours or the next opening
 * day during it, the thanks after it, with the state's two buttons, and the photo on the right (below on mobile).
 */
export function StatusPanel({ status, planUrl, hasResults }: { status: Status; planUrl: string; hasResults: boolean }) {
  const { state, pill, title, text } = status;
  return (
    <section
      aria-label="Stav výstavy"
      className="relative grid gap-5 overflow-hidden rounded-24 bg-orange-tint p-5 md:grid-cols-2 md:gap-6 md:rounded-26 md:p-6 lg:gap-8 lg:rounded-28 lg:p-7"
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-21 bg-orange shard-tr" />
      <span aria-hidden="true" className="absolute top-0 right-13 h-11 w-8.5 bg-blue shard-tr" />
      <div className="relative flex min-w-0 flex-col gap-3.5">
        {pill.open ? (
          <span
            role="status"
            className="flex items-center gap-2 self-start rounded-full bg-green-tint px-3.5 py-1.5 text-15 font-bold text-green-ink"
          >
            <span aria-hidden="true" className="size-2.5 rounded-full bg-green" />
            {pill.text}
          </span>
        ) : (
          <span className="flex items-center gap-2 self-start rounded-full bg-raised px-3.5 py-1.5 text-15 font-bold text-orange-ink-deep">
            <NativityStarIcon size={14} />
            {pill.text}
          </span>
        )}
        <h2 className="text-30 leading-title font-bold md:text-38 lg:text-46">
          {title.map((line, i) => (
            <Fragment key={line}>
              {i > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </h2>
        <p className="text-16 text-ink-2 md:text-17 lg:text-18">{text}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {state === "before" && (
            <>
              <ButtonLink href="#figurka" variant="accent" size="small">
                <NativityStarIcon size={18} />
                Přinést figurku do betlému
              </ButtonLink>
              <ButtonLink href="#doba" variant="outline-orange" size="small">
                <CalendarIcon size={18} />
                Otevírací doba
              </ButtonLink>
            </>
          )}
          {state === "during" && (
            <>
              <ButtonLink href={planUrl} variant="accent" size="small">
                <FileIcon size={18} />
                Plánek výstavy (PDF)
              </ButtonLink>
              <ButtonLink href="#kde" variant="outline-orange" size="small">
                <PinIcon size={18} />
                Kde co najdete
              </ButtonLink>
            </>
          )}
          {state === "after" && (
            <>
              {hasResults && (
                <ButtonLink href="#soutez" variant="accent" size="small">
                  <NativityStarIcon size={18} />
                  Výsledky soutěže
                </ButtonLink>
              )}
              <ButtonLink href="#foto" variant={hasResults ? "outline-orange" : "accent"} size="small">
                Fotografie z výstavy
              </ButtonLink>
            </>
          )}
        </div>
      </div>
      <PhotoPlaceholder className="min-h-50 md:min-h-65 lg:min-h-75" />
    </section>
  );
}

/** The designed stand-in for a photo of a nativity scene until the parish chooses one. */
export function PhotoPlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "flex items-center justify-center rounded-16 bg-orange-tint-alt text-orange-ink-deep lg:rounded-20",
        className,
      )}
    >
      <NativityStarIcon size={36} />
    </div>
  );
}
