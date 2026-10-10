import * as z from "zod";
import type {
  OhlaskyFile,
  PlaceId,
  ScheduleException,
  ScheduleExceptionsFile,
  ServiceSheetRecord,
} from "@/content/types/services";
import { revSchema } from "@/lib/shared/revision";
import { periodDates } from "./service-sheet";

// The rules of the ohlášky, in one place: src/server/ohlasky.ts checks src/content/ohlasky.json with them when the
// site loads it, and scripts/lib/services/add-ohlasky.ts checks a new record and the file before the farnost-create-porad-bohosluzeb
// skill stages its PDF. The rules across sheets (their order, the aktuality an announcement links) are
// sheetOrderProblems() and the content test's.

const date = z.iso.date();
const clock = z.string().regex(/^(1?\d|2[0-3]):[0-5]\d$/, "must be H:MM");
const text = z.string().trim().min(1);
const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const rowSchema = z.strictObject({
  time: clock,
  place: text,
  title: text,
  detail: text.optional(),
  public: z.boolean().optional(),
  mass: z.boolean().optional(),
  service: z.boolean().optional(),
  changed: z.boolean().optional(),
});

const daySchema = z.strictObject({
  date,
  feast: text.optional(),
  solemnity: z.boolean().optional(),
  rows: z.array(rowSchema),
});

const announcementSchema = z.strictObject({
  category: z.enum(["zmena", "smireni", "pozvanka", "podekovani", "info"]),
  html: text,
  newsId: text.optional(),
});

/** A ServiceSheetRecord (src/content/types/services.ts); its fields in the order the generated files write them. */
export const serviceSheetSchema = z
  .strictObject({
    validFrom: date,
    validTo: date,
    rev: revSchema,
    days: z.array(daySchema),
    announcements: z.array(announcementSchema),
  })
  .superRefine((sheet, ctx) => {
    if (sheet.validTo <= sheet.validFrom) {
      ctx.addIssue({ code: "custom", path: ["validTo"], message: "must be after validFrom" });
      return;
    }
    // During the sheet's period only its rows count (sheetExceptions()), so a missing day would have no services.
    const period = periodDates(sheet.validFrom, sheet.validTo);
    const dates = sheet.days.map((d) => d.date);
    const missing = period.filter((d) => !dates.includes(d));
    if (missing.length > 0) {
      ctx.addIssue({ code: "custom", path: ["days"], message: `missing ${missing.join(", ")}` });
    }
    dates.forEach((d, i) => {
      if (!period.includes(d)) {
        ctx.addIssue({ code: "custom", path: ["days", i, "date"], message: `${d} is outside the sheet's period` });
      } else if (i > 0 && d <= dates[i - 1]) {
        ctx.addIssue({
          code: "custom",
          path: ["days", i, "date"],
          message: "must be after the previous day (in date order, once)",
        });
      }
    });
    sheet.days.forEach((day, i) => {
      if (day.rows.some((r, j) => j > 0 && minutes(r.time) < minutes(day.rows[j - 1].time))) {
        ctx.addIssue({ code: "custom", path: ["days", i, "rows"], message: "must be in time order" });
      }
    });
  }) satisfies z.ZodType<ServiceSheetRecord>;

/** Every PlaceId once: a place added to the type must be added here too, or this does not compile. */
const PARISH_CHURCHES: Record<PlaceId, true> = { kurim: true, "moravske-kninice": true, jinacovice: true };

const serviceEntrySchema = z.strictObject({
  time: clock,
  place: z.enum(Object.keys(PARISH_CHURCHES) as PlaceId[]),
  title: text.optional(),
  note: text.optional(),
});

/** A ScheduleException announced for later (src/content/schedule-exceptions.json). */
export const scheduleExceptionSchema = z.strictObject({
  date,
  services: z.array(serviceEntrySchema),
  reason: text.optional(),
}) satisfies z.ZodType<ScheduleException>;

/** The whole of src/content/ohlasky.json; src/server/ohlasky.ts and scripts/lib/services/add-ohlasky.ts parse it. */
export const ohlaskyFileSchema = z.strictObject({
  sheets: z.array(serviceSheetSchema),
}) satisfies z.ZodType<OhlaskyFile>;

/** The whole of src/content/schedule-exceptions.json; src/content/schedule-exceptions.ts and the scripts parse it. */
export const scheduleExceptionsFileSchema = z.strictObject({
  exceptions: z.array(scheduleExceptionSchema),
}) satisfies z.ZodType<ScheduleExceptionsFile>;
