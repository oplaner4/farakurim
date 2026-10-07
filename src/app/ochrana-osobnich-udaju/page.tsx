import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageHeading } from "@/components/ui/PageHeading";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { contacts, links, parish } from "@/content/site";

const lead = "Jak web farnosti zachází s údaji návštěvníků.";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů",
  alternates: { canonical: links.privacy },
  description: `${lead} Anonymní statistika návštěvnosti bez cookies na hostingu farnosti.`,
};

/** Privacy page (no mockup yet): statistics, browser storage and the third-party services the site loads. */
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader currentHref={links.privacy} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <PageHeading title="Ochrana osobních údajů" color="blue" size="standard" intro={lead} />

        <section aria-labelledby="provozovatel" className="flex max-w-170 flex-col gap-4">
          <SectionHeading id="provozovatel" title="Kdo web provozuje" color="blue" small />
          <p className="text-15 text-ink-2">
            Web provozuje {parish.name}, {contacts.street}, {contacts.postalCode} {contacts.town}. Dotazy k ochraně
            údajů posílejte na <a href={`mailto:${contacts.email}`}>{contacts.email}</a>.
          </p>
        </section>

        <section aria-labelledby="statistika" className="flex max-w-170 flex-col gap-4">
          <SectionHeading id="statistika" title="Statistika návštěvnosti" color="blue" small />
          <div className="rich-text text-15 text-ink-2">
            <p>
              Abychom věděli, které stránky čtete a co stahujete, počítáme návštěvy nástrojem Matomo. Běží na hostingu
              farnosti, data nikomu nepředáváme.
            </p>
            <ul>
              <li>Nepoužívá cookies ani jiné ukládání ve vašem prohlížeči.</li>
              <li>IP adresy zkracujeme, takže z nich nelze poznat konkrétního člověka.</li>
              <li>Podrobné záznamy o návštěvách po 90 dnech mažeme, ponecháváme jen souhrnná čísla.</li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="prohlizec" className="flex max-w-170 flex-col gap-4">
          <SectionHeading id="prohlizec" title="Co se ukládá ve vašem prohlížeči" color="blue" small />
          <p className="text-15 text-ink-2">
            Tento web sám ukládá jen zvolený barevný režim (světlý nebo tmavý), aby zůstal stejný i při další návštěvě.
            Nikam se neodesílá.
          </p>
        </section>

        <section aria-labelledby="sluzby" className="flex max-w-170 flex-col gap-4">
          <SectionHeading id="sluzby" title="Obsah z jiných služeb" color="blue" small />
          <div className="rich-text text-15 text-ink-2">
            <p>
              Některé části stránek načítá váš prohlížeč přímo z jiných služeb. Ty proto uvidí vaši IP adresu, stejně
              jako kterýkoli jiný web, který navštívíte:
            </p>
            <ul>
              <li>
                <strong>Google</strong> – události v kalendářích (Google Kalendář),
              </li>
              <li>
                <strong>Zonerama</strong> – fotografie z alb na úvodní stránce a ve Fotogalerii,
              </li>
              <li>
                <strong>Mapy.com</strong> – mapa na stránce Kontakty,
              </li>
              <li>
                <strong>YouTube</strong> – videa, a to až když je spustíte.
              </li>
            </ul>
            <p>
              Vložená mapa a přehrávač videa mohou ve vašem prohlížeči ukládat vlastní údaje podle pravidel těchto
              služeb.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
