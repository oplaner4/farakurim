import { clsx } from "clsx";
import { contacts, parish } from "@/content/site";
import { mapHref, telHref } from "@/lib/links";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ArrowRightIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/ui/icons";

/** "Fara" (design/DESIGN.md §15.1): address, call and e-mail buttons, and the map link. */
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
      {/* A designed stand-in until there is a static map image (or a lazy-loaded Mapy.cz embed). */}
      <a href={mapHref(contacts.mapQuery)} className="flex flex-col no-underline">
        <span
          aria-hidden="true"
          className="flex h-45 items-center justify-center gap-2 rounded-18 bg-blue-tint-alt text-14 text-blue-ink md:h-50 lg:h-75"
        >
          <PinIcon />
          {contacts.street}
        </span>
        <span className="flex min-h-11 items-center gap-1.5 font-bold underline">
          Navigovat na Mapy.cz
          <ArrowRightIcon size={18} />
        </span>
      </a>
    </section>
  );
}
