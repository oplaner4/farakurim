import { readFileSync } from "node:fs";
import {
  ExternalAccountClient,
  Impersonated,
  JWT,
  UserRefreshClient,
  type AuthClient,
  type ExternalAccountClientOptions,
  type JWTInput,
} from "google-auth-library";
import { parishCalendars } from "@/content/site";
import type { Change } from "./plan";

// Writes the changes of a plan to the Události calendar as the service account it is shared with.

const EVENTS_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(parishCalendars.events.googleId)}/events`;
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const NAME = "GOOGLE_CALENDAR_SERVICE_ACCOUNT";
const IMPERSONATION_URL =
  /^https:\/\/iamcredentials\.googleapis\.com\/v1\/projects\/-\/serviceAccounts\/([^/:]+):generateAccessToken$/;
const AUDIENCE =
  /^\/\/iam\.googleapis\.com\/projects\/\d+\/locations\/global\/workloadIdentityPools\/[^/]+\/providers\/[^/]+$/;

type Json = Record<string, unknown>;

const text = (json: Json, field: string) => (typeof json[field] === "string" ? json[field] : undefined);

/** The service account's address in an impersonation URL, or undefined when it is not one. */
const impersonatedAccount = (json: Json) =>
  IMPERSONATION_URL.exec(text(json, "service_account_impersonation_url") ?? "")?.[1];

/** Reads `credentials`, a JSON text or the path of a JSON file; the error never quotes it. */
function readCredentials(credentials: string): Json {
  let json: unknown;
  try {
    json = JSON.parse(credentials.trimStart().startsWith("{") ? credentials : readFileSync(credentials, "utf8"));
  } catch {
    // No cause or message: they may quote the key.
    throw new Error(`${NAME} is neither JSON nor the path of a JSON file`);
  }
  if (typeof json !== "object" || json === null) throw new Error(`${NAME} is not a JSON object`);
  return json as Json;
}

/** The client of a service account key. */
function keyClient(json: Json): AuthClient {
  const email = text(json, "client_email");
  const key = text(json, "private_key");
  if (!email || !key) throw new Error(`${NAME} has no client_email and private_key`);
  return new JWT({ email, key, scopes: SCOPES });
}

/**
 * The client of a GitHub Actions run's workload identity federation (google-github-actions/auth): it reads the run's
 * OIDC token from a URL, never from a file or a command, exchanges it at Google's STS and impersonates the account.
 */
function federatedClient(json: Json): AuthClient {
  const source = json.credential_source as Json | undefined;
  const sourceKeys = Object.keys(source ?? {}).filter((key) => !["url", "headers", "format"].includes(key));
  if (
    !AUDIENCE.test(text(json, "audience") ?? "") ||
    text(json, "token_url") !== "https://sts.googleapis.com/v1/token" ||
    typeof source?.url !== "string" ||
    sourceKeys.length > 0
  ) {
    throw new Error(`${NAME} is not the workload identity federation of a GitHub Actions run`);
  }
  if (!impersonatedAccount(json)) throw new Error(`${NAME} impersonates no service account`);
  const client = ExternalAccountClient.fromJSON({ ...json, scopes: SCOPES } as ExternalAccountClientOptions);
  if (!client) throw new Error(`${NAME} is not an external account`);
  return client;
}

/** The client of a person's login impersonating the account (`gcloud auth application-default login`). */
function impersonatedClient(json: Json): AuthClient {
  const targetPrincipal = impersonatedAccount(json);
  if (!targetPrincipal) throw new Error(`${NAME} impersonates no service account`);
  const source = json.source_credentials as Json | undefined;
  if (source?.type !== "authorized_user") throw new Error(`${NAME} impersonates with no person's login`);
  const sourceClient = new UserRefreshClient();
  sourceClient.fromJSON(source as JWTInput);
  return new Impersonated({ sourceClient, targetPrincipal, targetScopes: SCOPES });
}

/**
 * The client that acts as the service account, for one of the credentials Google writes, each checked before use (a
 * credential configuration can run commands or read files): a service account key, the workload identity federation
 * of a GitHub Actions run or a person's login impersonating the account.
 */
export function calendarClient(credentials: string): AuthClient {
  const json = readCredentials(credentials);
  switch (json.type) {
    case "service_account":
      return keyClient(json);
    case "external_account":
      return federatedClient(json);
    case "impersonated_service_account":
      return impersonatedClient(json);
    default:
      throw new Error(`${NAME} is not a service account key, a federated or an impersonated credential`);
  }
}

/** An access token of the service account for the Události calendar, from `credentials` (`calendarClient()`). */
export async function accessToken(credentials: string): Promise<string> {
  const { token } = await calendarClient(credentials).getAccessToken();
  if (!token) throw new Error("Google gave no access token");
  return token;
}

/** Adds the event, or patches the changed fields of the calendar event; throws with Google's status. */
export async function applyChange(change: Change, token: string): Promise<void> {
  const add = change.kind === "add";
  const url = add ? EVENTS_URL : `${EVENTS_URL}/${encodeURIComponent(change.target.id)}`;
  const body = add ? { ...change.body, id: change.desired.googleId } : change.body;
  const response = await fetch(url, {
    method: add ? "POST" : "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const reason = await response
      .json()
      .then((json: { error?: { message?: string } }) => json.error?.message)
      .catch(() => undefined);
    throw new Error(`HTTP ${response.status}${reason ? ` ${reason}` : ""}`);
  }
}
