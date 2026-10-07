import type { Metadata } from "next";
import { ChronicleEras } from "@/components/chronicle/ChronicleEras";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageHeading } from "@/components/ui/PageHeading";
import { chronicle } from "@/content/chronicle";
import { events } from "@/content/news";
import { links } from "@/content/site";
import { eventHref } from "@/lib/news/events";

const lead = "Přehled událostí kostela sv. Maří Magdaleny a kuřimské farnosti od roku 1226.";

export const metadata: Metadata = {
  title: "Kronika farnosti",
  alternates: { canonical: links.chronicle },
  description: `${lead} Založení kostela, vznik farnosti, přestavba v 18. století, zvony, varhany a opravy.`,
};

/** The jubilee article, while it is among the current Aktuality. */
const jubilee = events.find((e) => e.id === "jubileum-800-2026");

/** Kronika farnosti (design/DESIGN.md §26): the history of the church and the parish as a timeline per era. */
export default function ChroniclePage() {
  return (
    <>
      <SiteHeader currentHref={links.chronicle} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <PageHeading title="Kronika farnosti" color="blue" size="standard" intro={lead} />
        <ChronicleEras eras={chronicle} />
        <p className="text-15 text-ink-2">
          Zvýrazněné jsou nejdůležitější milníky. Více o historii najdete také{" "}
          {jubilee && (
            <>
              v článku{" "}
              <a href={eventHref(jubilee)} className="font-bold">
                {jubilee.title}
              </a>{" "}
              a{" "}
            </>
          )}
          na stránce{" "}
          <a href={links.priestsFromParish} className="font-bold">
            Kněží – rodáci
          </a>
          .
        </p>
        <noscript>
          <style>{"[data-js-only]{display:none}"}</style>
        </noscript>
      </main>
    </>
  );
}
