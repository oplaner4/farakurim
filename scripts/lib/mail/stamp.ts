// How a mail's date shows in a mailbox summary line: Prague time to the minute.

import { format } from "date-fns";
import { inPrague } from "@/lib/shared/prague";

/** `date` as "2026-11-12 09:00" in Prague time. */
export const mailStamp = (date: Date) => format(inPrague(date), "yyyy-MM-dd HH:mm");
