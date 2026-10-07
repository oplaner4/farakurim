import { links, parishCalendars } from "@/content/site";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ArrowRightIcon } from "@/components/ui/icons/navigation-icons";

const buttonClass = "min-h-12 grow basis-45 px-3.5";

/** "Kalendář v telefonu" (design/DESIGN.md §16.2, 5): subscribe to the parish's Google Calendars. */
export function SubscribePanel() {
  return (
    <section
      aria-labelledby="kalendar-v-telefonu"
      className="relative flex flex-col gap-3 overflow-hidden rounded-24 bg-blue-tint p-4.5 md:p-5.5 lg:p-6"
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-14 bg-blue shard-tr" />
      <h2 id="kalendar-v-telefonu" className="pr-12 text-18 font-bold md:text-20 lg:text-22">
        Kalendář v telefonu
      </h2>
      <p className="text-ink-2">
        Přidejte si naše kalendáře do svého telefonu nebo počítače. Změny se vám pak zobrazí samy.
      </p>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={parishCalendars.services.subscribeUrl} size="block" className={buttonClass}>
          + {parishCalendars.services.name}
        </ButtonLink>
        <ButtonLink href={parishCalendars.events.subscribeUrl} variant="magenta" size="block" className={buttonClass}>
          + {parishCalendars.events.name}
        </ButtonLink>
      </div>
      <a href={links.services} className="flex min-h-11 items-center gap-1.5 self-start font-bold">
        Pravidelný pořad bohoslužeb
        <ArrowRightIcon size={18} />
      </a>
    </section>
  );
}
