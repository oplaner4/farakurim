import { describe, expect, it } from "vitest";
import { calendarFeedUrl, guessCalendarApp, isCalendarApp, subscribeHref } from "./subscribe";

const calendar = { googleId: "04gtmq4vqvu2jg624uiu2o0d18@group.calendar.google.com", name: "Události" };
const FEED =
  "https://calendar.google.com/calendar/ical/04gtmq4vqvu2jg624uiu2o0d18%40group.calendar.google.com/public/basic.ics";

describe("calendarFeedUrl", () => {
  it("is the calendar's public iCal feed", () => {
    expect(calendarFeedUrl(calendar)).toBe(FEED);
  });
});

describe("subscribeHref", () => {
  it("adds the calendar by its ID in Google Calendar", () => {
    expect(subscribeHref("google", calendar)).toBe(
      "https://calendar.google.com/calendar/r?cid=04gtmq4vqvu2jg624uiu2o0d18%40group.calendar.google.com",
    );
  });

  it("hands the feed to the device's calendar app over webcal", () => {
    expect(subscribeHref("apple", calendar)).toBe(FEED.replace("https://", "webcal://"));
  });

  it("passes the encoded feed and the name to Outlook, personal and work", () => {
    const query =
      "url=https%3A%2F%2Fcalendar.google.com%2Fcalendar%2Fical%2F04gtmq4vqvu2jg624uiu2o0d18%2540group.calendar.google.com%2Fpublic%2Fbasic.ics&name=Ud%C3%A1losti";
    expect(subscribeHref("outlook", calendar)).toBe(`https://outlook.live.com/calendar/0/addfromweb?${query}`);
    expect(subscribeHref("office", calendar)).toBe(`https://outlook.office.com/calendar/0/addfromweb?${query}`);
  });
});

describe("guessCalendarApp", () => {
  it.each([
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36", "google"],
    ["Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/131.0 Safari/537.36", "google"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148", "apple"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.1 Safari/605.1.15", "apple"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0", "outlook"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0", "google"],
  ] as const)("%s → %s", (userAgent, app) => {
    expect(guessCalendarApp(userAgent)).toBe(app);
  });
});

describe("isCalendarApp", () => {
  it("accepts only the picker's apps", () => {
    expect(isCalendarApp("office")).toBe(true);
    expect(isCalendarApp("yahoo")).toBe(false);
    expect(isCalendarApp(null)).toBe(false);
  });
});
