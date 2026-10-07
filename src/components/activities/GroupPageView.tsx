import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import type { GroupLink, GroupPage } from "@/content/types/activities";
import { links } from "@/content/site";
import { groupPhotoSet, otherGroups } from "@/lib/activities/groups";
import { externalLinkAttrs, NEW_TAB } from "@/lib/shared/links";
import { MusicIcon } from "@/components/ui/icons/media-icons";
import { ArrowRightIcon, ExternalLinkIcon } from "@/components/ui/icons/navigation-icons";
import { LockIcon } from "@/components/ui/icons/status-icons";
import { PageHeading } from "@/components/ui/PageHeading";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GroupHero } from "./GroupHero";
import { GroupInfoBox } from "./GroupInfoBox";
import { GroupLightbox } from "./GroupLightbox";
import { GroupPhotos } from "./GroupPhotos";
import { VideoCard } from "./VideoCard";

const arrowLink = clsx("flex min-h-11 items-center gap-1.5 self-start font-bold");
const card = clsx("rounded-18 bg-surface p-4 text-ink no-underline hover:bg-line hover:text-ink");

/** A "Ke stažení" item: a link row (Schola's songbooks) or a card with an icon (the choir's voices). */
const downloadItem = cva("flex h-full rounded-18 bg-surface p-4 text-ink no-underline hover:bg-line hover:text-ink", {
  variants: {
    layout: {
      row: "items-start justify-between gap-3",
      card: "flex-col gap-2",
    },
  },
});

type Props = {
  group: GroupPage;
  /** "Další skupiny" are picked from these. */
  groups: GroupLink[];
  /** "Příští setkání" (`NextMeeting`), rendered by the page because it reads the calendars. */
  nextMeeting?: ReactNode;
};

/**
 * The group page template (design/DESIGN.md §27, §27.1): hero photo and title, "O nás" with the Kdy · Kde · Kontakt
 * box, the next meeting, the steps, photos, videos, downloads, a link card and the other groups. Every block but
 * the title is optional.
 */
export function GroupPageView({ group, groups, nextMeeting }: Props) {
  // The hero and the grid's photos share one lightbox.
  const lightboxPhotos = groupPhotoSet(group);
  return (
    <>
      <PageHeading
        title={group.name}
        color="green"
        size="standard"
        parents={[{ label: "Seznam aktivit", href: links.activities }]}
        intro={group.tagline}
        media={group.hero && <GroupHero hero={group.hero} />}
      />

      {(group.about || group.when || group.where || group.contacts) && (
        <div className="grid items-start gap-5 md:gap-6 lg:grid-cols-13 lg:gap-8">
          {group.about && (
            <section aria-labelledby="o-nas" className="flex min-w-0 flex-col gap-3 lg:col-span-8">
              <SectionHeading id="o-nas" title={group.aboutTitle ?? "O nás"} color="green" small />
              {group.about.map((paragraph) => (
                <p key={paragraph} className="leading-loose md:text-17">
                  {paragraph}
                </p>
              ))}
            </section>
          )}
          <div className="lg:col-span-5">
            <GroupInfoBox group={group} />
          </div>
        </div>
      )}

      {nextMeeting}

      {group.steps && (
        <section aria-labelledby="jak-to-probiha" className="flex flex-col gap-3.5">
          <SectionHeading id="jak-to-probiha" title="Jak to probíhá" color="green" small />
          <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {group.steps.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-2 rounded-18 bg-surface p-4.5">
                <span
                  aria-hidden="true"
                  className="flex size-9 items-center justify-center rounded-full bg-green font-bold text-on-green"
                >
                  {i + 1}
                </span>
                <strong className="text-17 leading-card">{step.title}</strong>
                <span className="text-15 text-ink-2">{step.text}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {group.photos && group.photos.length > 0 && (
        <GroupPhotos
          name={group.name}
          photos={group.photos}
          before={group.hero ? 1 : 0}
          total={lightboxPhotos.length}
        />
      )}
      {lightboxPhotos.length > 0 && <GroupLightbox name={group.name} photos={lightboxPhotos} />}

      {group.videos && group.videos.length > 0 && (
        <section aria-labelledby="videa" className="flex flex-col gap-3">
          <SectionHeading id="videa" title="Poslechněte si nás" color="green" small />
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {group.videos.map((video) => (
              <VideoCard key={video.youtubeId} video={video} />
            ))}
          </ul>
          {group.channel && (
            <a href={group.channel.href} {...NEW_TAB} className={arrowLink}>
              {group.channel.label}
              <ExternalLinkIcon size={18} />
              <span className="sr-only"> (otevře se v novém okně)</span>
            </a>
          )}
        </section>
      )}

      {group.downloads && <Downloads downloads={group.downloads} />}

      {group.linkCard && (
        <a
          href={group.linkCard.href}
          {...externalLinkAttrs(group.linkCard.href)}
          className="flex items-center justify-between gap-4 rounded-18 bg-orange-tint px-5 py-4.5 text-ink no-underline hover:bg-orange-tint-alt hover:text-ink"
        >
          <span className="flex flex-col gap-0.5">
            <strong className="text-17">{group.linkCard.title}</strong>
            <span className="text-14 text-ink-2">{group.linkCard.text}</span>
          </span>
          <ArrowRightIcon size={22} className="flex-none text-orange-ink" />
        </a>
      )}

      <section aria-labelledby="dalsi-skupiny" className="flex flex-col gap-3">
        <SectionHeading id="dalsi-skupiny" title="Další skupiny" color="green" small />
        <ul className="grid gap-2.5 md:grid-cols-3">
          {otherGroups(groups, group.id).map((other) => (
            <li key={other.id}>
              <a href={other.href} className={clsx("flex h-full flex-col gap-0.5", card)}>
                <strong className="text-17">{other.name}</strong>
                <span className="text-14 text-muted">{other.note}</span>
              </a>
            </li>
          ))}
        </ul>
        <a href={links.activities} className={arrowLink}>
          Všechny aktivity farnosti
          <ArrowRightIcon size={18} />
        </a>
      </section>
    </>
  );
}

/**
 * "Ke stažení" (§27, 7): link rows (Schola's songbooks) or, for items with a note, cards with a music icon (the
 * choir's voices, §27.1), and the lock pill when the files are for members only.
 */
function Downloads({ downloads }: { downloads: NonNullable<GroupPage["downloads"]> }) {
  const cards = downloads.items.some((item) => item.note);
  return (
    <section aria-labelledby="ke-stazeni" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <SectionHeading id="ke-stazeni" title={downloads.title} color="green" small />
        {downloads.restricted && (
          <span className="flex items-center gap-1.5 rounded-full bg-magenta-tint px-3 py-1 text-13 font-bold text-magenta-ink">
            <LockIcon size={16} />
            {downloads.restricted}
          </span>
        )}
      </div>
      {downloads.intro && <p className="text-15 text-ink-2">{downloads.intro}</p>}
      <ul className={clsx("grid gap-2.5", cards ? "grid-cols-2 md:grid-cols-4" : "md:grid-cols-3")}>
        {downloads.items.map((item) => (
          <li key={item.label}>
            <a
              href={item.href}
              {...externalLinkAttrs(item.href)}
              className={downloadItem({ layout: cards ? "card" : "row" })}
            >
              {cards && (
                <span
                  aria-hidden="true"
                  className="flex size-11 items-center justify-center rounded-12 bg-green-tint text-green-ink"
                >
                  <MusicIcon size={22} />
                </span>
              )}
              <span className="flex flex-col gap-0.5">
                <strong className="text-17 leading-card">{item.label}</strong>
                {item.note && <span className="text-14 text-muted">{item.note}</span>}
              </span>
              {!cards && <ExternalLinkIcon size={18} className="mt-0.5 flex-none text-green-ink" />}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
