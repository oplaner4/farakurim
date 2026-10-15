import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import type { CampTeamMember } from "@/content/types/camp";
import { ageLabel, initial, type TeamGroup } from "@/lib/camp/team";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TeamPhoto } from "./TeamPhoto";

/** The first group (Hlavní vedoucí a zdravotnice) has larger, horizontal cards on its tint; the others are lighter. */
const featured = (group: TeamGroup) => group.id === "hlavni-vedouci";

const card = cva("flex items-start gap-3.5 rounded-20", {
  variants: {
    featured: {
      true: "bg-magenta-tint p-5 lg:gap-5.5",
      /* Desktop: the photo on top, the text below. */
      false: "bg-surface p-4 lg:flex-col lg:px-3.5 lg:pt-3.5 lg:pb-4.5",
    },
  },
});

/** The photo box: a round avatar (64 px for the first group on tablet), on desktop a 4:5 portrait. */
const photoBox = cva("", {
  variants: {
    featured: {
      true: "size-13 md:size-16 lg:h-62.5 lg:w-50",
      false: "size-13 lg:aspect-4/5 lg:h-auto lg:w-full",
    },
  },
});

const tones = {
  magenta: { placeholder: "bg-raised text-magenta-ink", badge: "bg-magenta text-white" },
  blue: { placeholder: "bg-blue-tint text-blue-ink", badge: "bg-blue-tint text-blue-ink" },
  green: { placeholder: "bg-green-tint text-green-ink", badge: "bg-green-tint text-green-ink" },
};

type CardProps = {
  member: CampTeamMember;
  group: TeamGroup;
  /** The member's photo in the lightbox (1-based), when there is one. */
  photoN?: number;
};

function TeamCard({ member, group, photoN }: CardProps) {
  const isFeatured = featured(group);
  const tone = tones[group.color];
  const box = photoBox({ featured: isFeatured });
  return (
    <li className={card({ featured: isFeatured })}>
      {member.photo && photoN ? (
        <TeamPhoto name={member.name} photo={member.photo} n={photoN} className={box} />
      ) : (
        // Without a photo: the initial in the same shape and size, not clickable.
        <span
          aria-hidden="true"
          className={clsx(
            "flex flex-none items-center justify-center rounded-full text-19 font-bold lg:rounded-16 lg:text-56",
            box,
            tone.placeholder,
          )}
        >
          {initial(member.name)}
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <strong className={isFeatured ? "text-20 lg:text-22" : "text-18"}>{member.name}</strong>
          {member.age !== undefined && <span className="text-14 text-muted">{ageLabel(member.age)}</span>}
        </span>
        <span className={clsx("self-start rounded-full px-2.5 py-0.5 text-13 font-bold", tone.badge)}>
          {member.role}
        </span>
        <span className="text-15 leading-normal text-ink-2">{member.bio}</span>
      </span>
    </li>
  );
}

type Props = {
  group: TeamGroup;
  /** Each member's photo in the lightbox (1-based), by member. */
  photoNumbers: Map<CampTeamMember, number>;
};

/**
 * One group of Tábor – Vedoucí (design/DESIGN.md §29.3): the heading with the count and the cards, 1 / 2 columns, on
 * desktop 2 horizontal cards for the first group and 4 vertical ones for the others.
 */
export function TeamSection({ group, photoNumbers }: Props) {
  const isFeatured = featured(group);
  return (
    <section aria-labelledby={group.id} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <SectionHeading id={group.id} title={group.title} color={group.color} small />
          <span className="text-15 text-muted">
            <span className="sr-only">Počet: </span>
            {group.members.length}
          </span>
        </div>
        {group.id === "praktikanti" && (
          <p className="text-15 text-ink-2">Praktikanti jsou mladí od 15 do 18 let, kteří se učí vést tábor.</p>
        )}
      </div>
      <ul className={clsx("grid gap-2.5 md:grid-cols-2 lg:gap-3.5", !isFeatured && "lg:grid-cols-4")}>
        {group.members.map((member) => (
          <TeamCard key={member.name} member={member} group={group} photoN={photoNumbers.get(member)} />
        ))}
      </ul>
    </section>
  );
}
