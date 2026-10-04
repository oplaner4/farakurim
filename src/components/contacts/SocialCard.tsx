import type { ComponentType } from "react";
import { socialLinks, webmaster } from "@/content/site";
import { externalLinkAttrs } from "@/lib/links";
import { FacebookIcon, InstagramIcon, LinkIcon } from "@/components/ui/icons";
import { ContactCard } from "./ContactCard";

type IconComponent = ComponentType<{ size?: number; className?: string }>;

const icons: Record<(typeof socialLinks)[number]["label"], { Icon: IconComponent; color: string }> = {
  Facebook: { Icon: FacebookIcon, color: "text-blue-ink" },
  Instagram: { Icon: InstagramIcon, color: "text-magenta-ink" },
  Linktree: { Icon: LinkIcon, color: "text-green-ink" },
};

/** "Sledujte nás" (§15.1): social profiles and who to tell about problems with the website. */
export function SocialCard({ className }: { className?: string }) {
  return (
    <ContactCard id="sledujte-nas" title="Sledujte nás" tone="surface" className={className}>
      <ul className="flex flex-wrap gap-2">
        {socialLinks.map(({ label, href }) => {
          const { Icon, color } = icons[label];
          return (
            <li key={label}>
              <a
                href={href}
                {...externalLinkAttrs(href)}
                className="flex min-h-12 items-center gap-2 rounded-12 bg-raised px-4 font-bold text-ink no-underline hover:text-blue-ink"
              >
                <Icon size={18} className={color} />
                {label}
              </a>
            </li>
          );
        })}
      </ul>
      <p className="pt-2 text-15 text-ink-2">
        Náměty a chyby na webu: <strong className="text-ink">{webmaster.name}</strong>,{" "}
        <a href={`mailto:${webmaster.email}`}>{webmaster.email}</a>
      </p>
    </ContactCard>
  );
}
