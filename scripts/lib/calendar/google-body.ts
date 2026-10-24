import { format } from "date-fns";
import { inPrague } from "@/lib/shared/prague";

// The shape of the Google event the syncs write, shared by the Události and the Bohoslužby calendars.

export const TIME_ZONE = "Europe/Prague";

export type GoogleTime = { date?: string; dateTime?: string; timeZone?: string };

/** The fields the sync writes to a Google event. */
export type GoogleEventBody = {
  summary: string;
  location?: string;
  description: string;
  start: GoogleTime;
  end: GoogleTime;
  recurrence?: string[];
};

/** An instant as a Google time: Prague wall-clock with its offset. */
export const pragueTime = (instant: Date): GoogleTime => ({
  dateTime: format(instant, "yyyy-MM-dd'T'HH:mm:ssxxx", { in: inPrague }),
  timeZone: TIME_ZONE,
});
