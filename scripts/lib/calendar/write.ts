import { readFileSync } from "node:fs";
import { JWT } from "google-auth-library";
import { parishCalendars } from "@/content/site";
import type { Change } from "./plan";

// Writes the changes of a plan to the Události calendar with a service account.

const EVENTS_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(parishCalendars.events.googleId)}/events`;
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const NAME = "GOOGLE_CALENDAR_SERVICE_ACCOUNT";

/** An access token of the service account: `serviceAccount` is its JSON key, or the path of the JSON file. */
export async function accessToken(serviceAccount: string): Promise<string> {
  let key: { client_email?: unknown; private_key?: unknown };
  try {
    key = JSON.parse(
      serviceAccount.trimStart().startsWith("{") ? serviceAccount : readFileSync(serviceAccount, "utf8"),
    );
  } catch {
    // No cause or message: they may quote the key.
    throw new Error(`${NAME} is neither JSON nor the path of a JSON file`);
  }
  if (typeof key?.client_email !== "string" || typeof key.private_key !== "string") {
    throw new Error(`${NAME} has no client_email and private_key`);
  }
  const client = new JWT({ email: key.client_email, key: key.private_key, scopes: SCOPES });
  const { token } = await client.getAccessToken();
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
