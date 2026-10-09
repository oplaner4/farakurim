import { events } from "@/content/news";
import { SITE_URL } from "@/content/site";
import { eventCalendar } from "@/lib/news/ics";
import { eventHref, findEventById } from "@/lib/news/events";

// "Přidat do kalendáře": a static `/aktuality/<id>/kalendar.ics` per event, written by `next build`.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.id }));
}

export async function GET(_request: Request, { params }: RouteContext<"/aktuality/[slug]/kalendar.ics">) {
  const event = findEventById(events, (await params).slug);
  if (!event) return new Response(null, { status: 404 });
  return new Response(eventCalendar(event, `${SITE_URL}${eventHref(event)}`), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
}
