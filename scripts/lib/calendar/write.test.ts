import { afterEach, describe, expect, it, vi } from "vitest";
import { parishCalendars } from "@/content/site";
import type { NewsEvent } from "@/content/types/news";
import { desiredEvents, eventBody } from "./desired";
import type { Change } from "./plan";
import { accessToken, applyChange } from "./write";

const event: NewsEvent = {
  id: "adoracni-den-2026",
  title: "Adorační den",
  start: "2026-10-12",
  startTime: "13:00",
  text: "Text.",
};
const [item] = desiredEvents(event, "2026-10-01");
const CALENDAR = encodeURIComponent(parishCalendars.events.googleId);

afterEach(() => vi.unstubAllGlobals());

const stubFetch = (status = 200) => {
  const fetchMock = vi.fn(async () => new Response("{}", { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("applyChange", () => {
  it("POSTs an add with the body and the deterministic id", async () => {
    const fetchMock = stubFetch();
    const body = eventBody(item);
    await applyChange({ kind: "add", desired: item, body }, "TOKEN");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR}/events`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer TOKEN", "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual({ ...body, id: item.googleId });
  });

  it("PATCHes an update on the target's id with only the changed fields", async () => {
    const fetchMock = stubFetch();
    const change: Change = {
      kind: "update",
      desired: item,
      target: { id: "target1", start: {}, end: {} },
      claim: false,
      fields: ["summary"],
      body: { summary: "Nový název" },
    };
    await applyChange(change, "TOKEN");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR}/events/target1`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ summary: "Nový název" });
  });

  it("throws with Google's status", async () => {
    stubFetch(409);
    await expect(applyChange({ kind: "add", desired: item, body: eventBody(item) }, "T")).rejects.toThrow("HTTP 409");
  });
});

describe("accessToken", () => {
  it("rejects a key that is not JSON without echoing it", async () => {
    await expect(accessToken("{ SECRET-NOT-JSON")).rejects.toThrow(
      /^GOOGLE_CALENDAR_SERVICE_ACCOUNT is neither JSON nor the path of a JSON file$/,
    );
  });

  it("rejects a JSON without the account's email and key", async () => {
    await expect(accessToken('{"client_email":"a@b.c"}')).rejects.toThrow("client_email and private_key");
  });
});
