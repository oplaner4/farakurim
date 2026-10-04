import { clsx } from "clsx";
import { contacts, parish } from "@/content/site";
import { mapHref, NEW_TAB, telHref } from "@/lib/links";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ArrowRightIcon, MailIcon, PhoneIcon } from "@/components/ui/icons";
import { OfficeMap } from "./OfficeMap";

/** "Fara" (design/DESIGN.md §15.1): address, call and e-mail buttons, the map and the map link. */
export function ParishOfficePanel({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="fara"
      className={clsx("relative flex flex-col gap-4 overflow-hidden rounded-28 bg-blue-tint p-6", className)}
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-20 bg-blue shard-tr" />
      <span aria-hidden="true" className="absolute top-0 right-11.5 h-11 w-8.5 bg-green shard-tr" />
      <span className="text-13 font-bold tracking-eyebrow text-blue-ink uppercase">Fara</span>
      <h2 id="fara" className="pr-16 text-24 leading-heading font-bold">
        {parish.name}
      </h2>
      <address className="text-18 not-italic">
        {contacts.street}
        <br />
        {contacts.postalCode} {contacts.town}
      </address>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={telHref(contacts.officePhone)} size="block" className="min-h-13 shrink grow basis-35 px-1">
          <PhoneIcon size={18} />
          Zavolat
        </ButtonLink>
        <ButtonLink
          href={`mailto:${contacts.email}`}
          variant="outline"
          size="block"
          className="min-h-14 shrink grow basis-35 px-1"
        >
          <MailIcon size={18} />
          Napsat e-mail
        </ButtonLink>
      </div>
      <div className="flex flex-col">
        <OfficeMap />
        <a href={mapHref(contacts.mapQuery)} {...NEW_TAB} className="flex min-h-11 items-center gap-1.5 font-bold">
          Navigovat na Mapy.cz
          <ArrowRightIcon size={18} />
        </a>
      </div>
    </section>
  );
}
