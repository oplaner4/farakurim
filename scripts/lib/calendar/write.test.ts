import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { BaseExternalAccountClient, Impersonated, JWT } from "google-auth-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { places } from "@/content/masses";
import { parishCalendars } from "@/content/site";
import type { NewsEvent } from "@/content/types/news";
import { freshTempDir } from "../test-helpers";
import { desiredEvents, eventBody } from "./desired";
import type { Change } from "./plan";
import { desiredServices } from "./services-desired";
import type { ServicesChange } from "./services-plan";
import { accessToken, applyChange, applyServicesChange, calendarClient } from "./write";

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
  const fetchMock = vi.fn(async () => new Response(status === 204 ? null : "{}", { status }));
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

describe("applyServicesChange", () => {
  const SERVICES = encodeURIComponent(parishCalendars.services.googleId);
  const [desired] = desiredServices(
    {
      regular: [{ weekday: 0, time: "8:00", place: "kurim" }],
      sheets: [],
      later: [],
      places,
    },
    { from: "2026-10-25", to: "2026-10-25" },
  );
  const target = { id: "t1", start: {}, end: {} };
  const sent = async (change: ServicesChange, status = 200) => {
    const fetchMock = stubFetch(status);
    await applyServicesChange(change, "TOKEN");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    return { url, init, body: init.body ? JSON.parse(init.body as string) : undefined };
  };

  it("POSTs an add with the body and the deterministic id to the services calendar", async () => {
    const { url, init, body } = await sent({ kind: "add", desired });
    expect(url).toBe(`https://www.googleapis.com/calendar/v3/calendars/${SERVICES}/events`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer TOKEN" });
    expect(body).toEqual({ ...desired.body, id: desired.googleId });
  });

  it("PATCHes an update with only the changed fields", async () => {
    const { url, init, body } = await sent({
      kind: "update",
      desired,
      target,
      claim: false,
      fields: ["summary"],
      body: { summary: "Nový název" },
    });
    expect(url).toBe(`https://www.googleapis.com/calendar/v3/calendars/${SERVICES}/events/t1`);
    expect(init.method).toBe("PATCH");
    expect(body).toEqual({ summary: "Nový název" });
  });

  it("PATCHes a restore with the whole body, confirmed", async () => {
    const { url, init, body } = await sent({ kind: "restore", desired, target });
    expect(url).toBe(`https://www.googleapis.com/calendar/v3/calendars/${SERVICES}/events/t1`);
    expect(init.method).toBe("PATCH");
    expect(body).toEqual({ ...desired.body, status: "confirmed" });
  });

  it("DELETEs, and takes an event already gone (410) as done", async () => {
    const { url, init, body } = await sent({ kind: "delete", target }, 204);
    expect(url).toBe(`https://www.googleapis.com/calendar/v3/calendars/${SERVICES}/events/t1`);
    expect(init.method).toBe("DELETE");
    expect(body).toBeUndefined();
    await sent({ kind: "delete", target }, 410);
  });

  it("throws with Google's status for another failure", async () => {
    stubFetch(403);
    await expect(applyServicesChange({ kind: "delete", target }, "T")).rejects.toThrow("HTTP 403");
  });
});

const ACCOUNT = "calendar-sync@farnost.iam.gserviceaccount.com";
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const IMPERSONATION = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${ACCOUNT}:generateAccessToken`;
const federated = {
  type: "external_account",
  audience: "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/github/providers/farakurim",
  subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
  token_url: "https://sts.googleapis.com/v1/token",
  service_account_impersonation_url: IMPERSONATION,
  credential_source: {
    url: "https://token.actions.githubusercontent.com/?audience=x",
    headers: { Authorization: "Bearer REQUEST-TOKEN" },
    format: { type: "json", subject_token_field_name: "value" },
  },
};
const impersonated = {
  type: "impersonated_service_account",
  service_account_impersonation_url: IMPERSONATION,
  delegates: [],
  source_credentials: { type: "authorized_user", client_id: "id", client_secret: "secret", refresh_token: "refresh" },
};
const json = (value: object) => JSON.stringify(value);
const tempDir = freshTempDir("calendar-credentials");

describe("calendarClient", () => {
  it("acts with a service account key", () => {
    const client = calendarClient(json({ type: "service_account", client_email: ACCOUNT, private_key: "KEY" }));
    expect(client).toBeInstanceOf(JWT);
    expect(client).toMatchObject({ email: ACCOUNT, scopes: SCOPES });
  });

  it("acts with the federation of a GitHub Actions run, impersonating the account", () => {
    const client = calendarClient(json(federated));
    expect(client).toBeInstanceOf(BaseExternalAccountClient);
    expect(client).toMatchObject({ scopes: SCOPES });
    expect((client as BaseExternalAccountClient).getServiceAccountEmail()).toBe(ACCOUNT);
  });

  it("acts with a person's login impersonating the account", () => {
    const client = calendarClient(json(impersonated));
    expect(client).toBeInstanceOf(Impersonated);
    expect(client).toMatchObject({ targetPrincipal: ACCOUNT, targetScopes: SCOPES });
  });

  it("reads the credentials from a file", () => {
    const file = join(tempDir(), "credentials.json");
    writeFileSync(file, json(impersonated));
    expect(calendarClient(file)).toBeInstanceOf(Impersonated);
  });

  it("rejects credentials that are not JSON without echoing them", () => {
    expect(() => calendarClient("{ SECRET-NOT-JSON")).toThrow(
      /^GOOGLE_CALENDAR_SERVICE_ACCOUNT is neither JSON nor the path of a JSON file$/,
    );
  });

  it("rejects a key without the account's email and key, and credentials of another type", () => {
    expect(() => calendarClient(json({ type: "service_account", client_email: ACCOUNT }))).toThrow(
      "client_email and private_key",
    );
    expect(() => calendarClient(json({ client_email: ACCOUNT, private_key: "KEY" }))).toThrow(
      "not a service account key, a federated or an impersonated credential",
    );
    expect(() => calendarClient(json({ type: "authorized_user" }))).toThrow("not a service account key");
  });

  it("rejects a federation that runs a command, reads a file or goes to another token service", () => {
    const not = "not the workload identity federation of a GitHub Actions run";
    const source = federated.credential_source;
    for (const credential_source of [{ ...source, executable: { command: "rm -rf /" } }, { file: "/etc/passwd" }]) {
      expect(() => calendarClient(json({ ...federated, credential_source }))).toThrow(not);
    }
    expect(() => calendarClient(json({ ...federated, token_url: "https://evil.example/token" }))).toThrow(not);
    expect(() => calendarClient(json({ ...federated, audience: "//evil.example/pool" }))).toThrow(not);
  });

  it("rejects a federation or an impersonation of no service account", () => {
    const { service_account_impersonation_url: _, ...direct } = federated;
    expect(() => calendarClient(json(direct))).toThrow("impersonates no service account");
    expect(() =>
      calendarClient(json({ ...impersonated, service_account_impersonation_url: "https://evil.example/x" })),
    ).toThrow("impersonates no service account");
    expect(() => calendarClient(json({ ...impersonated, source_credentials: { type: "service_account" } }))).toThrow(
      "impersonates with no person's login",
    );
  });
});

describe("accessToken", () => {
  it("rejects credentials it cannot use before asking Google", async () => {
    await expect(accessToken("{ SECRET-NOT-JSON")).rejects.toThrow("neither JSON nor the path of a JSON file");
  });
});
