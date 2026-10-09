import * as z from "zod";
import type { ServiceSheet } from "@/content/types/services";
import { periodDates } from "./service-sheet";

// The rules of one ohlášky sheet, in one place: ohlasky.test.ts checks every sheet in src/content/ohlasky/ with them,
// and scripts/add-ohlasky.ts checks a new record before the farnost-create-porad-bohosluzeb skill stages its PDF.
// The rules across sheets (their order, the aktuality an announcement links) are sheetOrderProblems() and the script's.

const date = z.iso.date();
const clock = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "must be H:MM");
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

/** A ServiceSheet (src/content/types/services.ts); its fields in the order the generated files write them. */
export const serviceSheetSchema = z
  .strictObject({
    pdfUrl: z
      .string()
      .regex(/^\/uploads\/porady_bohosluzeb\/[\w.-]+\.pdf$/, "must be a /uploads/porady_bohosluzeb/ PDF"),
    validFrom: date,
    validTo: date,
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
  }) satisfies z.ZodType<ServiceSheet>;
