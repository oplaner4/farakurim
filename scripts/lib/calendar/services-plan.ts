import { places } from "@/content/masses";
import type { PlaceId } from "@/content/types/services";
import type { GoogleEvent } from "@/lib/calendar/google-calendar";
import type { GoogleEventBody } from "./google-body";
import { bodyOf, differingFields, type BodyField } from "./in-line";
import { SERVICES_URL, type DesiredService } from "./services-desired";

// Plans the sync of the desired services to the Bohoslužby calendar without writing anything. A calendar event is
// owned when its description holds the marker URL. A desired service takes the owned event with its id, else the
// owned event at its date, start and church, else claims the only unmarked single event at that time naming its
// church; failing all, it is added. Owned events no service wants any more are deleted, unless they are over.

export type ServicesChange =
  | { kind: "add"; desired: DesiredService }
  | {
      kind: "update";
      desired: DesiredService;
      target: GoogleEvent;
      /** The target holds no marker yet: the update adds it. */
      claim: boolean;
      fields: BodyField[];
      body: Partial<GoogleEventBody>;
    }
  /** The sync's event, deleted by hand (Google keeps it as cancelled): written again. */
  | { kind: "restore"; desired: DesiredService; target: GoogleEvent }
  | { kind: "delete"; target: GoogleEvent };

/** What the sync leaves for a person to settle: unmarked events that double a desired service. */
export type ServicesReport = { kind: "duplicate"; desired: DesiredService; events: GoogleEvent[] };

export type ServicesPlan = { changes: ServicesChange[]; reports: ServicesReport[] };

/** Whether the event carries the marker (Google may return the description as HTML). */
export const isOwned = (event: GoogleEvent): boolean => event.description?.includes(SERVICES_URL) ?? false;

const isLive = (event: GoogleEvent) => event.status !== "cancelled";

const startOf = (event: GoogleEvent): number => Date.parse(event.start.dateTime ?? "");

/** The place's name and its locative without the preposition: "Kuřim", "Kuřimi". */
const placeWords = (place: PlaceId): string[] =>
  [places[place].name, places[place].locative.replace(/^ve? /, "")].map((word) => word.toLowerCase());

/**
 * Whether the event's location or title names the church and no other one. The postal suffix "-Kuřim" of the
 * villages' addresses ("Moravské Knínice-Kuřim") does not name Kuřim.
 */
const namesPlace = (event: GoogleEvent, place: PlaceId): boolean => {
  const text = `${event.location ?? ""} ${event.summary ?? ""}`.toLowerCase().replaceAll("-kuřim", "");
  const names = (id: PlaceId) => placeWords(id).some((word) => text.includes(word));
  return names(place) && (Object.keys(places) as PlaceId[]).every((id) => id === place || !names(id));
};

const atTime = (event: GoogleEvent, desired: DesiredService): boolean =>
  startOf(event) === Date.parse(desired.body.start.dateTime ?? "");

const isSingle = (event: GoogleEvent) => !event.recurringEventId && !event.recurrence;

/** The changes and reports that bring the Bohoslužby calendar in line with `desired`; `instances` is the window. */
export function planServices(desired: DesiredService[], instances: GoogleEvent[], now: Date): ServicesPlan {
  const plan: ServicesPlan = { changes: [], reports: [] };
  const used = new Set<string>();
  const ids = new Set(desired.map((service) => service.googleId));
  const live = instances.filter(isLive);
  // An owned event another service owns by its id is never matched by slot.
  const ownedBySlot = live.filter((event) => isOwned(event) && !ids.has(event.id));
  const unmarked = live.filter((event) => !isOwned(event));
  for (const service of desired) {
    const byId = instances.find((event) => event.id === service.googleId);
    if (byId && !isLive(byId)) {
      used.add(byId.id);
      plan.changes.push({ kind: "restore", desired: service, target: byId });
      continue;
    }
    // An event with the desired id but no marker is ours too: it is claimed.
    if (byId) {
      used.add(byId.id);
      bringInLine(service, byId, !isOwned(byId), plan);
      continue;
    }
    const sameSlot = ownedBySlot.find(
      (event) =>
        !used.has(event.id) && atTime(event, service) && (event.location ?? "") === (service.body.location ?? ""),
    );
    if (sameSlot) {
      used.add(sameSlot.id);
      bringInLine(service, sameSlot, false, plan);
      continue;
    }
    const nearby = unmarked.filter(
      (event) => !used.has(event.id) && atTime(event, service) && namesPlace(event, service.place),
    );
    const claimable = nearby.filter(isSingle);
    if (claimable.length === 1) {
      used.add(claimable[0].id);
      bringInLine(service, claimable[0], true, plan);
      continue;
    }
    plan.changes.push({ kind: "add", desired: service });
  }
  // What no service used and still sits at a service's time and church doubles it.
  for (const service of desired) {
    const left = unmarked.filter(
      (event) => !used.has(event.id) && atTime(event, service) && namesPlace(event, service.place),
    );
    if (left.length > 0) plan.reports.push({ kind: "duplicate", desired: service, events: left });
  }
  for (const event of ownedBySlot) {
    if (!used.has(event.id) && startOf(event) > now.getTime()) plan.changes.push({ kind: "delete", target: event });
  }
  return plan;
}

/** Brings `target` in line with `desired`; a claim always writes the description, which adds the marker. */
function bringInLine(desired: DesiredService, target: GoogleEvent, claim: boolean, plan: ServicesPlan): void {
  const differing = differingFields(desired.body, target, false);
  const fields = claim && !differing.includes("description") ? [...differing, "description" as const] : differing;
  if (fields.length === 0) return;
  plan.changes.push({
    kind: "update",
    desired,
    target,
    claim,
    fields,
    body: bodyOf(desired.body, fields),
  });
}
