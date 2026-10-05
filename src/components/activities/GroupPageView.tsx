import { clsx } from "clsx";
import type { GroupLink, GroupPage } from "@/content/types/activities";
import { links } from "@/content/site";
import { otherGroups } from "@/lib/activities/groups";
import { externalLinkAttrs, NEW_TAB } from "@/lib/shared/links";
import { ArrowRightIcon, ExternalLinkIcon } from "@/components/ui/icons";
import { PageHeading } from "@/components/ui/PageHeading";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GroupInfoBox } from "./GroupInfoBox";
import { GroupPhotos } from "./GroupPhotos";
import { VideoCard } from "./VideoCard";

const arrowLink = clsx("flex min-h-11 items-center gap-1.5 self-start font-bold");

/**
 * The group page template (design/DESIGN.md §27), shown first with Schola: hero photo and title, "O nás" with the
 * Kdy · Kde · Kontakt box, photos, videos, downloads and the other groups. Every block but the title is optional.
 */
export function GroupPageView({ group, groups }: { group: GroupPage; groups: GroupLink[] }) {
  return (
    <>
      <PageHeading
        title={group.name}
        color="green"
        size="standard"
        parents={[{ label: "Seznam aktivit", href: links.activities }]}
        intro={group.tagline}
        media={
          group.hero && (
            <div className="relative h-55 overflow-hidden rounded-24 bg-green-tint md:h-80 md:rounded-26 lg:h-95 lg:rounded-28">
              <img src={group.hero.src} alt={group.hero.alt} fetchPriority="high" className="size-full object-cover" />
              <span aria-hidden="true" className="absolute right-0 bottom-0 h-20 w-30 bg-green shard-br" />
            </div>
          )
        }
      />

      {(group.about || group.when || group.where || group.contact) && (
        <div className="grid items-start gap-5 md:gap-6 lg:grid-cols-13 lg:gap-8">
          {group.about && (
            <section aria-labelledby="o-nas" className="flex min-w-0 flex-col gap-3 lg:col-span-8">
              <SectionHeading id="o-nas" title="O nás" color="green" small />
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

      {group.photos && group.photos.length > 0 && <GroupPhotos name={group.name} photos={group.photos} />}

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

      {group.downloads && (
        <section aria-labelledby="ke-stazeni" className="flex flex-col gap-3">
          <SectionHeading id="ke-stazeni" title={group.downloads.title} color="green" small />
          <ul className="grid gap-2.5 md:grid-cols-3">
            {group.downloads.items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  {...externalLinkAttrs(item.href)}
                  className="flex h-full items-start justify-between gap-3 rounded-18 bg-surface p-4 text-ink no-underline hover:bg-line hover:text-ink"
                >
                  <span className="flex flex-col gap-0.5">
                    <strong className="text-17 leading-card">{item.label}</strong>
                    {item.membersOnly && <span className="text-14 text-muted">jen pro členy</span>}
                  </span>
                  <ExternalLinkIcon size={18} className="mt-0.5 flex-none text-green-ink" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="dalsi-skupiny" className="flex flex-col gap-3">
        <SectionHeading id="dalsi-skupiny" title="Další skupiny" color="green" small />
        <ul className="grid gap-2.5 md:grid-cols-3">
          {otherGroups(groups, group.id).map((other) => (
            <li key={other.id}>
              <a
                href={other.href}
                className="flex h-full flex-col gap-0.5 rounded-18 bg-surface p-4 text-ink no-underline hover:bg-line hover:text-ink"
              >
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
