// Tábor (design/DESIGN.md §29): the next camp's tent, what the camp does and who meets before it.

import { Icon, type IconProps } from "./icon";

/** "Tábor 2027 – připravujeme" */
export const TentIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 20L12 4l9 16z" />
    <path d="M12 20l-3-6h6l-3 6" />
    <path d="M2 20h20" />
  </Icon>
);

/** Hry */
export const GamepadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 12h4M8 10v4" />
    <circle cx="15.5" cy="11" r="1" />
    <circle cx="17.5" cy="13.5" r="1" />
    <rect x="2" y="6" width="20" height="12" rx="6" />
  </Icon>
);

/** Rozvojové programy */
export const StarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />
  </Icon>
);

/** Duchovní program */
export const CrossIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v18M7 8h10" />
  </Icon>
);

/** Táboráky */
export const CampfireIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z" />
    <path d="M4 21l16-3M20 21L4 18" />
  </Icon>
);

/** Výlet do okolí */
export const MountainIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 20l6-12 4 7 3-4 5 9z" />
  </Icon>
);

/** The meeting of everyone before the camp. */
export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M3 20a6 6 0 0 1 12 0M15 20a4 4 0 0 1 6-3.5" />
  </Icon>
);
