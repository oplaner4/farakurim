// Finanční podpora: gifts, cash, the collection and bank transfers.

import { Icon, type IconProps } from "./icon";

export const HeartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
  </Icon>
);

/** A banknote: a gift in cash (Finanční podpora). */
export const CashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7h18v10H3z" />
    <circle cx="12" cy="12" r="2.5" />
  </Icon>
);

/** The collection basket in church. */
export const CollectionIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10h16l-2 9H6z" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Icon>
);

/** Two opposite arrows: a bank transfer. */
export const TransferIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8h13M13 4l4 4-4 4M20 16H7M11 12l-4 4 4 4" />
  </Icon>
);
