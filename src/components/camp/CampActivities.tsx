import { clsx } from "clsx";
import type { ComponentType } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CampfireIcon, CrossIcon, GamepadIcon, MountainIcon, StarIcon } from "@/components/ui/icons/camp-icons";
import type { IconProps } from "@/components/ui/icons/icon";

const tiles = {
  blue: "bg-blue-tint-alt text-blue-ink",
  green: "bg-green-tint text-green-ink",
  magenta: "bg-magenta-tint text-magenta-ink",
  orange: "bg-orange-tint text-orange-ink-deep",
};

const activities: { icon: ComponentType<IconProps>; tone: keyof typeof tiles; title: string; text: string }[] = [
  { icon: GamepadIcon, tone: "blue", title: "Hry", text: "celotáborová hra, hry v lese i na louce" },
  { icon: StarIcon, tone: "green", title: "Rozvojové programy", text: "spolupráce, odvaha, tvořivost" },
  { icon: CrossIcon, tone: "magenta", title: "Duchovní program", text: "společná modlitba a mše svatá" },
  { icon: CampfireIcon, tone: "orange", title: "Táboráky", text: "zpěv s kytarou a večerní příběhy" },
  { icon: MountainIcon, tone: "blue", title: "Výlet do okolí", text: "alespoň jeden větší výlet" },
];

/** "Co na táboře děláme" (design/DESIGN.md §29.2, 5): icon rows in 1 / 2 / 3 columns. */
export function CampActivities() {
  return (
    <section aria-labelledby="program" className="flex flex-col gap-3.5">
      <SectionHeading id="program" title="Co na táboře děláme" color="magenta" small />
      <ul className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
        {activities.map(({ icon: Icon, tone, title, text }) => (
          <li key={title} className="flex items-center gap-3.5 rounded-18 bg-surface px-4 py-3.5">
            <span
              aria-hidden="true"
              className={clsx("flex size-12 flex-none items-center justify-center rounded-14", tiles[tone])}
            >
              <Icon size={24} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <strong className="text-17">{title}</strong>
              <span className="text-14 text-ink-2">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
