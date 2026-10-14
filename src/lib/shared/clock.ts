import type { ClockTime } from "@/content/types/shared";

// Clock times as the content writes them ("9:30", "18:00"): Prague wall-clock time (src/lib/shared/prague.ts), checked
// by the content schemas (clockSchema in schema.ts) and compared by the schedules, the calendar and the content tests.

/** "9:30" or "18:00": the hour 0–23 without a leading zero (never "09:30"), the minutes in two digits. */
export const CLOCK = /^(1?\d|2[0-3]):[0-5]\d$/;

/** Minutes since midnight, for comparing and sorting times: "9:30" → 570. */
export function clockMinutes(time: ClockTime): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
