import type { GoogleEvent } from "@/lib/calendar/google-calendar";
import type { GoogleEventBody } from "./google-body";

// What "in line" means: the fields of a Google event that differ from what the sync would write. Times compare as
// instants (Google may answer in another offset than the sync wrote) or as dates for all-day events.

export type BodyField = keyof GoogleEventBody;

const FIELDS: BodyField[] = ["summary", "location", "description", "start", "end"];

type Time = GoogleEventBody["start"];

const sameTime = (wanted: Time, current: GoogleEvent["start"]): boolean =>
  wanted.dateTime
    ? current.dateTime !== undefined && Date.parse(current.dateTime) === Date.parse(wanted.dateTime)
    : current.dateTime === undefined && current.date === wanted.date;

function sameField(field: BodyField, body: GoogleEventBody, current: GoogleEvent): boolean {
  switch (field) {
    case "start":
    case "end":
      return sameTime(body[field], current[field]);
    case "recurrence":
      return JSON.stringify(body.recurrence ?? []) === JSON.stringify(current.recurrence ?? []);
    case "location":
      return (body.location ?? "") === (current.location ?? "");
    case "summary":
    case "description":
      return body[field] === current[field];
  }
}

/**
 * The fields of `body` that `current` does not have, the rule only for a repeating event. A meeting without an end
 * time gets the end that keeps `current`'s duration (`eventBody`), so its end differs only when its start does.
 */
export function differingFields(body: GoogleEventBody, current: GoogleEvent, repeating: boolean): BodyField[] {
  const fields: BodyField[] = repeating ? [...FIELDS, "recurrence"] : FIELDS;
  return fields.filter((field) => !sameField(field, body, current));
}

/** The part of `body` to write for `fields`; a place the record no longer has is cleared. */
export function bodyOf(body: GoogleEventBody, fields: BodyField[]): Partial<GoogleEventBody> {
  return Object.fromEntries(
    fields.map((field) => [field, field === "location" ? (body.location ?? "") : body[field]]),
  ) as Partial<GoogleEventBody>;
}
