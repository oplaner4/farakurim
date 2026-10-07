import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageHeading } from "@/components/ui/PageHeading";
import { contacts, links, parish } from "@/content/site";

export const metadata: Metadata = {
  title: "Dotazníky – GDPR",
  alternates: { canonical: links.questionnaireConsent },
  description: "Souhlas se zpracováním osobních údajů v dotaznících Římskokatolické farnosti Kuřim podle GDPR.",
};

/** Dotazníky – GDPR (no mockup): the consent the parish questionnaires link to, worded as on the old site. */
export default function QuestionnaireConsentPage() {
  return (
    <>
      <SiteHeader currentHref={links.questionnaireConsent} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <PageHeading
          title="Souhlas se zpracováním osobních údajů"
          crumb="Dotazníky – GDPR"
          intro="Pro údaje, které vyplníte v dotaznících farnosti: co zpracováváme, jak dlouho a jaká máte práva."
          color="blue"
          size="standard"
        />
        <ol className="flex max-w-170 list-decimal flex-col gap-4 pl-6 text-15 text-ink-2 marker:font-bold">
          <li>
            <div className="rich-text">
              <p>
                Udělujete tímto souhlas Římskokatolické farnosti Kuřim, se sídlem {contacts.street}, {contacts.town},
                IČ: {parish.ico} (dále jen „Správce“), aby ve smyslu nařízení Evropského parlamentu a Rady (EU) č.
                2016/679 o ochraně fyzických osob v souvislosti se zpracováním osobních údajů a o volném pohybu těchto
                údajů a o zrušení směrnice 95/46/ES (obecné nařízení o ochraně osobních údajů) (dále jen „Nařízení“)
                zpracovávala tyto osobní údaje:
              </p>
              <ul>
                <li>e-mail,</li>
                <li>telefonní číslo,</li>
                <li>osobní údaje uvedené v tomto dotazníku.</li>
              </ul>
            </div>
          </li>
          <li>
            Údaje v bodě 1 je možné zpracovat na základě Vámi uděleného souhlasu a je nutné zpracovat za účelem
            vyhodnocení dotazníku ke spokojenosti farnosti. Tyto údaje budou Správcem zpracovány po dobu 1 roku.
          </li>
          <li>Vaše osobní údaje nebudou dále poskytnuty 3. osobě.</li>
          <li>
            S výše uvedeným zpracováním udělujete svůj výslovný souhlas. Poskytnutí osobních údajů je dobrovolné.
            Souhlas lze vzít kdykoliv zpět, a to například zasláním e-mailu na adresu{" "}
            <a href={`mailto:${contacts.email}`} className="font-bold">
              {contacts.email}
            </a>{" "}
            nebo zasláním dopisu na kontaktní údaje farnosti, viz adresa výše v tomto dokumentu.
          </li>
          <li>
            <div className="rich-text">
              <p>Vezměte, prosíme, na vědomí, že podle Nařízení máte právo:</p>
              <ul>
                <li>vzít souhlas kdykoliv zpět,</li>
                <li>požadovat po nás informaci, jaké vaše osobní údaje zpracováváme, žádat si kopii těchto údajů,</li>
                <li>
                  vyžádat si u nás přístup k těmto údajům a tyto nechat aktualizovat nebo opravit, popřípadě požadovat
                  omezení zpracování,
                </li>
                <li>požadovat po nás výmaz těchto osobních údajů,</li>
                <li>na přenositelnost údajů,</li>
                <li>podat stížnost u Úřadu pro ochranu osobních údajů nebo se obrátit na soud.</li>
              </ul>
            </div>
          </li>
        </ol>
        <p className="max-w-170 text-15 text-ink-2">
          Jak s údaji návštěvníků zachází tento web, popisuje stránka{" "}
          <a href={links.privacy} className="font-bold">
            Ochrana osobních údajů
          </a>
          .
        </p>
      </main>
    </>
  );
}
