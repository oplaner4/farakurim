import type { CampRole, CampTeamMember } from "@/content/types/camp";
import { plural } from "@/lib/shared/czech";

// Vedoucí (design/DESIGN.md §29.3): the team in three groups, and the photos the lightbox goes through.

export type TeamGroupId = "hlavni-vedouci" | "vedouci" | "praktikanti";

export type TeamGroup = {
  /** The section's id (`aria-labelledby`); Czech, as an HTML id is a URL fragment. */
  id: TeamGroupId;
  title: string;
  /** The heading's shard, the cards' tint and the photo placeholder. */
  color: "magenta" | "blue" | "green";
  members: CampTeamMember[];
};

const GROUP_OF: Record<CampRole, TeamGroupId> = {
  "Hlavní vedoucí": "hlavni-vedouci",
  Zdravotnice: "hlavni-vedouci",
  Zdravotník: "hlavni-vedouci",
  Vedoucí: "vedouci",
  Praktikant: "praktikanti",
  Praktikantka: "praktikanti",
};

/**
 * The team in its three groups (Hlavní vedoucí a zdravotnice, Vedoucí, Praktikanti), each in the members' order;
 * a group without members is left out. The first group's title follows its medic: "zdravotnice" or "zdravotník".
 */
export function teamGroups(members: CampTeamMember[]): TeamGroup[] {
  const of = (id: TeamGroupId) => members.filter((m) => GROUP_OF[m.role] === id);
  const leads = of("hlavni-vedouci");
  const medic = leads.some((m) => m.role === "Zdravotník") ? "zdravotník" : "zdravotnice";
  const groups: TeamGroup[] = [
    { id: "hlavni-vedouci", title: `Hlavní vedoucí a ${medic}`, color: "magenta", members: leads },
    { id: "vedouci", title: "Vedoucí", color: "blue", members: of("vedouci") },
    { id: "praktikanti", title: "Praktikanti", color: "green", members: of("praktikanti") },
  ];
  return groups.filter((g) => g.members.length > 0);
}

/** "22 let", "1 rok", "3 roky" */
export const ageLabel = (age: number) => `${age} ${plural(age, ["rok", "roky", "let"])}`;

/** The lightbox caption of a member's photo: "Honza · Hlavní vedoucí · 22 let". */
export const photoCaption = ({ name, role, age }: CampTeamMember) =>
  [name, role, age === undefined ? undefined : ageLabel(age)].filter(Boolean).join(" · ");

/** The members with a photo, in page order: the lightbox's photos ("#foto-N" is the N-th of them). */
export const membersWithPhotos = (groups: TeamGroup[]) => groups.flatMap((g) => g.members.filter((m) => m.photo));

/** The first letter of a member's name: the placeholder without a photo ("Olda" → "O"). */
export const initial = (name: string) => name.charAt(0).toUpperCase();
