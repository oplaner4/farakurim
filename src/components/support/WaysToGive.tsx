import { CopyButton } from "@/components/ui/CopyButton";
import { ArrowRightIcon } from "@/components/ui/icons/navigation-icons";
import { CashIcon, CollectionIcon, TransferIcon } from "@/components/ui/icons/support-icons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { links, parish } from "@/content/site";

const ways = [
  { icon: CashIcon, title: "Hotově", text: "na faře nebo v obálce do sbírky" },
  { icon: CollectionIcon, title: "Při sbírce", text: "v kostele při bohoslužbách" },
  { icon: TransferIcon, title: "Převodem", text: "na účet farnosti s variabilním symbolem projektu" },
];

/** "Jak můžete přispět" (§22.1): the three ways, the parish account and the tax receipt note, on the orange tint. */
export function WaysToGive() {
  return (
    <section
      aria-labelledby="jak-prispet"
      className="relative flex flex-col gap-4.5 overflow-hidden rounded-24 bg-orange-tint p-5 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7"
    >
      <span aria-hidden="true" className="absolute right-0 bottom-0 h-17.5 w-27.5 bg-orange shard-br" />
      <SectionHeading id="jak-prispet" title="Jak můžete přispět" color="orange" small />
      <div className="relative flex flex-wrap gap-x-6 gap-y-5">
        <ul className="grid grow-2 basis-105 gap-x-5 gap-y-3.5 lg:grid-cols-3">
          {ways.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-10 flex-none items-center justify-center rounded-12 bg-raised text-orange-ink"
              >
                <Icon size={22} />
              </span>
              <span className="flex flex-col leading-card">
                <strong>{title}</strong>
                <span className="text-14 text-ink-2">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        {/* The mockup's 260px flex basis is content-box: + 2 × 18px padding. */}
        <div className="flex grow basis-74 flex-col gap-2 rounded-18 bg-raised p-4.5">
          <span className="text-14 text-muted">Bankovní účet farnosti</span>
          <strong className="text-24 md:text-28">{parish.bankAccount}</strong>
          <CopyButton text={parish.bankAccount} label="Zkopírovat číslo účtu" className="self-start" />
          <span className="text-14 text-ink-2">Bez variabilního symbolu jde dar na běžný chod farnosti.</span>
        </div>
      </div>
      <p className="relative pr-22.5 text-15 text-ink-2">
        Na požádání vystavíme <strong className="text-ink">potvrzení o daru</strong> pro daňové účely.{" "}
        <a href={links.contacts} className="inline-flex items-center gap-1 font-bold">
          Kontaktujte faru
          <ArrowRightIcon size={16} />
        </a>
      </p>
    </section>
  );
}
