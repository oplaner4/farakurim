import * as z from "zod";
import {
  type ServiceSheetsFile,
  PLACE_IDS,
  type ScheduleException,
  type ScheduleExceptionsFile,
  type ServiceSheetRecord,
} from "@/content/types/services";
import { clockMinutes, clockSchema } from "@/lib/shared/clock";
import { revSchema } from "@/lib/shared/revision";
import { periodDates } from "./service-sheet";

// The rules of the service sheets, in one place: src/server/service-sheets.ts checks src/content/service-sheets.json
// with them when the site loads it, and scripts/lib/services/add-service-sheet.ts checks a new record and the file
// before the parish-create-service-sheet skill stages its PDF. The rules across sheets (their order, the events an
// announcement links) are sheetOrderProblems() and the content test's.

const date = z.iso.date();
const text = z.string().trim().min(1);

const rowSchema = z.strictObject({
  time: clockSchema,
  place: text,
  title: text,
  detail: text.optional(),
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
  category: z.enum(["change", "confession", "invitation", "thanks", "info"]),
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
      if (day.rows.some((r, j) => j > 0 && clockMinutes(r.time) < clockMinutes(day.rows[j - 1].time))) {
        ctx.addIssue({ code: "custom", path: ["days", i, "rows"], message: "must be in time order" });
      }
    });
  }) satisfies z.ZodType<ServiceSheetRecord>;

const serviceEntrySchema = z.strictObject({
  time: clockSchema,
  place: z.enum(PLACE_IDS),
  title: text.optional(),
  note: text.optional(),
});

/** A ScheduleException announced for later (src/content/schedule-exceptions.json). */
export const scheduleExceptionSchema = z.strictObject({
  date,
  services: z.array(serviceEntrySchema),
  reason: text.optional(),
}) satisfies z.ZodType<ScheduleException>;

/** The whole of src/content/service-sheets.json; src/server/service-sheets.ts and scripts/lib/services/add-service-sheet.ts parse it. */
export const serviceSheetsFileSchema = z.strictObject({
  sheets: z.array(serviceSheetSchema),
}) satisfies z.ZodType<ServiceSheetsFile>;

/** The whole of src/content/schedule-exceptions.json; src/content/schedule-exceptions.ts and the scripts parse it. */
export const scheduleExceptionsFileSchema = z.strictObject({
  exceptions: z.array(scheduleExceptionSchema),
}) satisfies z.ZodType<ScheduleExceptionsFile>;
