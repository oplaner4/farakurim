// "Kalendář v telefonu" (design/DESIGN.md §16.6): the links that subscribe a calendar app to a parish calendar,
// all built from the calendar's Google ID and name.

/** The calendar apps the visitor picks from, in the picker's order. */
export const CALENDAR_APPS = ["google", "apple", "outlook", "office", "other"] as const;

export type CalendarApp = (typeof CALENDAR_APPS)[number];

/** An app the two subscribe buttons serve ("Jiná aplikace" copies the feed instead). */
export type LinkedCalendarApp = Exclude<CalendarApp, "other">;

export const CALENDAR_APP_LABELS: Record<CalendarApp, string> = {
  google: "Google Kalendář",
  apple: "iPhone / Mac",
  outlook: "Outlook.com",
  office: "Outlook (práce, škola)",
  other: "Jiná aplikace",
};

export const CALENDAR_APP_HINTS: Record<LinkedCalendarApp, string> = {
  google: "Otevře Google Kalendář v prohlížeči – přidání jen potvrďte. Do telefonu se kalendář dostane sám.",
  apple: "Otevře aplikaci Kalendář a zeptá se, zda kalendář odebírat.",
  outlook: "Otevře Outlook.com s předvyplněným kalendářem (osobní účty).",
  office: "Pro pracovní a školní účty Microsoft 365.",
};

type Calendar = { googleId: string; name: string };

/** The public iCal feed Google publishes for a public calendar. */
export const calendarFeedUrl = ({ googleId }: Pick<Calendar, "googleId">) =>
  `https://calendar.google.com/calendar/ical/${encodeURIComponent(googleId)}/public/basic.ics`;

/** The link that adds `calendar` to `app`. */
export function subscribeHref(app: LinkedCalendarApp, calendar: Calendar): string {
  const feed = calendarFeedUrl(calendar);
  switch (app) {
    case "google":
      return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendar.googleId)}`;
    case "apple":
    case "office":
      // Hands the feed over to the device's calendar app (Apple Calendar, Outlook installed for work or school).
      return feed.replace(/^https:/, "webcal:");
    case "outlook":
      return `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feed)}&name=${encodeURIComponent(calendar.name)}`;
  }
}

/** The app a device most likely uses: Android and ChromeOS Google, Apple devices their Calendar, Windows Outlook. */
export function guessCalendarApp(userAgent: string): CalendarApp {
  if (/Android|CrOS/i.test(userAgent)) return "google";
  if (/iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(userAgent)) return "apple";
  if (/Windows/i.test(userAgent)) return "outlook";
  return "google";
}

export const isCalendarApp = (value: unknown): value is CalendarApp => CALENDAR_APPS.includes(value as CalendarApp);
