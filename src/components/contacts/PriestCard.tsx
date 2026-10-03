import { contacts, priest } from "@/content/site";
import { telHref } from "@/lib/links";
import { UserIcon } from "@/components/ui/icons";
import { ContactCard } from "./ContactCard";

const rows = [
  { label: "Fara", value: contacts.officePhone, href: telHref(contacts.officePhone) },
  { label: "Mobil", value: contacts.mobilePhone, href: telHref(contacts.mobilePhone) },
  { label: "E-mail", value: contacts.email, href: `mailto:${contacts.email}` },
];

/** "Duchovní správce" (§15.1). The photo is a placeholder until the parish sends one. */
export function PriestCard() {
  return (
    <ContactCard id="duchovni-spravce" title="Duchovní správce" spacing={4}>
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-22 flex-none items-center justify-center rounded-full bg-surface text-muted"
        >
          <UserIcon size={36} />
        </span>
        <span className="flex min-w-0 flex-col">
          <strong className="text-19 leading-card">{priest.name}</strong>
          <span className="text-15 text-muted">{priest.role}</span>
        </span>
      </div>
      <dl className="flex flex-col">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-3 border-t border-line py-3 last:border-b">
            <dt className="w-24 shrink-0 text-muted">{row.label}</dt>
            <dd className="min-w-0">
              <a href={row.href} className="font-bold break-words">
                {row.value}
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </ContactCard>
  );
}
