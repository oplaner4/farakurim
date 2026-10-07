import type { ReactNode } from "react";
import type { GroupPage } from "@/content/types/activities";
import { telHref } from "@/lib/shared/links";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ClockIcon, MailIcon, PhoneIcon, PinIcon, UserIcon } from "@/components/ui/icons/contact-icons";

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 flex-none items-center justify-center rounded-12 bg-raised text-green-ink"
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5 leading-compact">
        <span className="text-13 font-bold tracking-caps text-green-ink uppercase">{label}</span>
        {children}
      </div>
    </div>
  );
}

/** "Kdy · Kde · Kontakt" of a group page (design/DESIGN.md §27, 3): icon rows and the contact's buttons. */
export function GroupInfoBox({ group }: { group: GroupPage }) {
  const { when, where, contacts = [] } = group;
  if (!when && !where && contacts.length === 0) return null;
  // The buttons reach the first contact that has a phone or an e-mail.
  const reachable = contacts.find((c) => c.phone || c.email);
  return (
    <aside
      aria-label="Kdy, kde a kontakt"
      className="flex flex-col gap-4.5 rounded-24 bg-green-tint p-5 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7"
    >
      {when && (
        <Row icon={<ClockIcon size={20} />} label="Kdy">
          {when.map((line, i) => (
            <p key={line.label} className="flex flex-col gap-0.5">
              <strong className={i > 0 ? "mt-1.5" : undefined}>{line.label}</strong>
              <span className="text-15 text-ink-2">{line.text}</span>
            </p>
          ))}
        </Row>
      )}
      {where && (
        <Row icon={<PinIcon size={20} />} label="Kde">
          <strong>{where.name}</strong>
          {where.address && <span className="text-15 text-ink-2">{where.address}</span>}
        </Row>
      )}
      {contacts.length > 0 && (
        <Row icon={<UserIcon size={20} />} label="Kontakt">
          {contacts.map((contact, i) => (
            <p key={contact.name} className="flex flex-col gap-0.5">
              <strong className={i > 0 ? "mt-1.5" : undefined}>{contact.name}</strong>
              <span className="text-15 text-ink-2">{contact.role}</span>
              {contact.phone && <span className="text-15 text-ink-2">{contact.phone}</span>}
            </p>
          ))}
        </Row>
      )}
      {reachable && (
        <div className="flex flex-wrap gap-2">
          {reachable.phone && (
            <ButtonLink href={telHref(reachable.phone)} variant="green" size="small">
              <PhoneIcon size={18} />
              Zavolat
            </ButtonLink>
          )}
          {reachable.email && (
            <ButtonLink href={`mailto:${reachable.email}`} variant="outline-green" size="small">
              <MailIcon size={18} />
              E-mail
            </ButtonLink>
          )}
        </div>
      )}
    </aside>
  );
}
