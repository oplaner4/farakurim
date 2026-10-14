import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parishCalendars } from "@/content/site";
import type { CalendarEntry } from "@/content/types/calendar";
import type { DateRange } from "@/lib/calendar/agenda";
import { pragueDateTime } from "@/lib/shared/prague";
import { googlePage } from "@/test/fetch";

// The build's entries cover October; Google has one mass on the first day of every range it is asked for.
const OCTOBER = { from: "2026-10-01", to: "2026-10-31" };
const NOVEMBER = { from: "2026-11-01", to: "2026-11-30" };
const built: CalendarEntry = { id: "b1", calendar: "services", title: "Mše svatá", date: "2026-10-04", time: "8:00" };
const initial = { entries: [built], range: OCTOBER };

/** Google's mass on `date`, as `toEntries()` makes it. */
const googleMass = (date: string): CalendarEntry => ({
  id: `g-${date}`,
  calendar: "services",
  title: "Mše svatá",
  date,
  time: "9:00",
});

function googleFetch(url: string) {
  const params = new URL(url).searchParams;
  const date = params.get("timeMin")!.slice(0, 10);
  const items = url.includes(encodeURIComponent(parishCalendars.services.googleId))
    ? [
        {
          id: `g-${date}`,
          summary: "Mše svatá",
          start: { dateTime: pragueDateTime(date, "9:00").toISOString() },
          end: {},
        },
      ]
    : [];
  return Promise.resolve(googlePage(items));
}

/** The hook evaluated with the API key `key` ("" = none), with a fresh query cache that does not retry. */
async function setup(key: string, fetchMock: (url: string) => Promise<Response>) {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY", key);
  vi.stubGlobal("fetch", vi.fn(fetchMock));
  vi.resetModules();
  const { useCalendarEntries } = await import("./use-calendar-entries");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return renderHook(({ range }: { range: DateRange }) => useCalendarEntries(initial, range, []), {
    initialProps: { range: OCTOBER },
    wrapper,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("useCalendarEntries without an API key", () => {
  it("keeps the build's entries, also outside its range, and reads nothing", async () => {
    const { result, rerender } = await setup("", googleFetch);
    expect(result.current).toEqual({ entries: [built], status: "ready" });
    rerender({ range: NOVEMBER });
    expect(result.current).toEqual({ entries: [built], status: "ready" });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("useCalendarEntries with an API key", () => {
  it("shows the build's range at once and replaces its days with Google's entries", async () => {
    const { result } = await setup("KEY", googleFetch);
    expect(result.current).toEqual({ entries: [built], status: "ready" });
    await waitFor(() => expect(result.current.entries).toEqual([googleMass("2026-10-01")]));
    expect(result.current.status).toBe("ready");
  });

  it("is loading outside the build's range until Google answers, and keeps every range it read", async () => {
    const { result, rerender } = await setup("KEY", googleFetch);
    await waitFor(() => expect(result.current.entries).toEqual([googleMass("2026-10-01")]));
    rerender({ range: NOVEMBER });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.entries).toEqual([googleMass("2026-10-01"), googleMass("2026-11-01")]);
    rerender({ range: OCTOBER });
    expect(result.current.entries).toEqual([googleMass("2026-10-01"), googleMass("2026-11-01")]);
  });

  it("keeps the build's entries when Google fails, and reports the error outside the build's range", async () => {
    const failing = () => Promise.resolve(new Response("", { status: 403 }));
    const { result, rerender } = await setup("KEY", failing);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(result.current).toEqual({ entries: [built], status: "ready" });
    rerender({ range: NOVEMBER });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.entries).toEqual([built]);
  });
});
