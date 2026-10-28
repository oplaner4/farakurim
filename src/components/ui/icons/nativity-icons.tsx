// Betlémy (design/DESIGN.md §30): the season's star, the prayer candle and the accessible entrance.

import { Icon, type IconProps } from "./icon";

/** The season's motif: a filled five-point star (the eyebrow, the seasonal menu item, the photo placeholders). */
export const NativityStarIcon = (p: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...p}>
    <path d="M12 2.5l2.6 6.4 6.9.5-5.3 4.4 1.7 6.7L12 16.8l-5.9 3.7 1.7-6.7-5.3-4.4 6.9-.5z" />
  </Icon>
);

/** "Místo pro modlitbu" */
export const CandleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3c1.5 2 2 3 0 5-2-2-1.5-3 0-5z" />
    <rect x="8" y="10" width="8" height="11" rx="1" />
  </Icon>
);

/** "Bezbariérový vstup" */
export const AccessibleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="4.5" r="1.8" />
    <path d="M7 8h10M12 8v6l4 6M12 14l-4 6" />
  </Icon>
);
