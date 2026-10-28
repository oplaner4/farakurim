"use client";

import { Fragment, type ReactNode } from "react";
import type { NativityAlbum, NativitySeason } from "@/content/types/nativity";
import { currentSeason, type ExhibitionState } from "@/lib/nativity/season";
import { statusPanel } from "@/lib/nativity/status";
import { pragueDate } from "@/lib/shared/prague";
import { useNow } from "@/hooks/use-now";
import { NativityStarIcon } from "@/components/ui/icons/nativity-icons";
import { PageHeading } from "@/components/ui/PageHeading";
import { Contest } from "./Contest";
import { OpeningHours } from "./OpeningHours";
import { PageAnchors } from "./PageAnchors";
import { Photos } from "./Photos";
import { Places } from "./Places";
import { Prayer } from "./Prayer";
import { SharedScene } from "./SharedScene";
import { StatusPanel } from "./StatusPanel";
import { Walk } from "./Walk";
import { WhatToSee } from "./WhatToSee";
import { WhyNativity } from "./WhyNativity";

type Block = "doba" | "kde" | "co" | "soutez" | "figurka" | "putovani" | "modlitba" | "foto";

/** The blocks of each state in their order (design/DESIGN.md §30.1); the anchor pills list all but the photos. */
const ORDER: Record<ExhibitionState, Block[]> = {
  before: ["figurka", "doba", "kde", "putovani", "co", "soutez", "modlitba", "foto"],
  during: ["doba", "kde", "co", "soutez", "figurka", "putovani", "modlitba", "foto"],
  after: ["soutez", "foto", "modlitba"],
};

const ANCHOR_LABELS: Record<Block, string> = {
  doba: "Otevírací doba",
  kde: "Kde",
  co: "Co uvidíte",
  soutez: "Soutěž",
  figurka: "Společný betlém",
  putovani: "Putování",
  modlitba: "Modlitba",
  foto: "Fotografie",
};

/** After the exhibition the pills name what the blocks have become. */
const AFTER_LABELS: Partial<Record<Block, string>> = { soutez: "Výsledky soutěže", modlitba: "Poděkování" };

type Props = {
  /** The seasons the page can show from the build day on, newest first. */
  seasons: NativitySeason[];
  albums: NativityAlbum[];
  oldSiteResults: { year: number; url: string }[];
  renderedAt: number;
};

/**
 * Betlémy (design/DESIGN.md §30): one template whose season, blocks and status follow the visitor's Prague time.
 * The prerendered HTML is the build time's; after load it switches without a rebuild (a new season on 1. 11., the
 * opening hours, "Právě otevřeno").
 */
export function NativityPage({ seasons, albums, oldSiteResults, renderedAt }: Props) {
  const now = useNow(renderedAt);
  const today = pragueDate(now);
  const season = currentSeason(seasons, today);
  const status = statusPanel(season, now);
  const { state } = status;
  const after = state === "after";

  const blocks: Record<Block, ReactNode> = {
    doba: <OpeningHours season={season} today={today} />,
    kde: <Places season={season} />,
    co: <WhatToSee season={season} />,
    soutez: <Contest contest={season.contest} voting={state === "during"} after={after} />,
    figurka: <SharedScene scene={season.sharedScene} />,
    putovani: <Walk walk={season.walk} />,
    modlitba: <Prayer season={season} after={after} today={today} />,
    foto: (
      <Photos
        year={season.year}
        after={after}
        album={albums.find((a) => a.year === season.year)}
        pastAlbums={albums.filter((a) => a.year < season.year)}
        oldSiteResults={oldSiteResults}
      />
    ),
  };
  const order = ORDER[state];
  const anchors = order
    .filter((id) => after || id !== "foto")
    .map((id) => ({ id, label: (after && AFTER_LABELS[id]) || ANCHOR_LABELS[id] }));

  return (
    <>
      <PageHeading
        title="Betlémy v Kuřimi"
        color="orange"
        size="standard"
        crumb="Betlémy"
        eyebrow={`Advent a Vánoce ${season.year} · ${season.edition}. ročník`}
        eyebrowIcon={<NativityStarIcon size={14} />}
        intro="Výstava betlémů v kostele sv. Maří Magdalény a na faře, soutěž školních tříd, společný kuřimský betlém a betlémské putování městem."
      />
      <PageAnchors anchors={anchors} />
      <StatusPanel status={status} planUrl={season.planUrl} hasResults={!!season.contest.results} />
      {order.map((id) => (
        <Fragment key={id}>{blocks[id]}</Fragment>
      ))}
      <WhyNativity year={Number(today.slice(0, 4))} />
    </>
  );
}
