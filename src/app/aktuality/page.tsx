import type { Metadata } from "next";
import { NewsPage } from "@/components/news/NewsPage";

export const metadata: Metadata = {
  title: "Aktuality",
  description: "Pozvánky na akce farnosti Kuřim a okolí: nadcházející akce, dlouhodobé programy a plakáty.",
};

export default function AktualityPage() {
  return <NewsPage filter="upcoming" />;
}
