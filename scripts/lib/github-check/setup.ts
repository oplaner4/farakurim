// The GitHub setup the workflows need (docs/github-setup.md, docs/content-pipelines.md, docs/calendar-sync.md): the
// repository's variables and secrets, the environments with what each holds and may deploy from, and the rules a
// check of the repository holds them to. A variable's value is checked against the format it must have; a secret's
// value cannot be read.

import * as z from "zod";

/** A variable, a secret, or `either` (a public value the workflows read as `secrets.X || vars.X`). */
export type SettingKind = "variable" | "secret" | "either";

export type Setting = {
  name: string;
  kind: SettingKind;
  /** Nothing breaks without it. */
  optional?: true;
  /** Only in its environment: a repository-wide value would stand in for a missing one of another environment. */
  environmentOnly?: true;
  /** The format of a variable's value, and what it says when the value is not one. */
  format?: Format;
};

export type Format = { schema: z.ZodType<string>; expected: string };

const format = (schema: z.ZodType<string>, expected: string): Format => ({ schema, expected });
const prefixed = (prefix: string) =>
  format(z.string().regex(new RegExp(`^${prefix}_[0-9A-Za-z]+$`)), `an ID ${prefix}_…`);

/** A GitHub login: letters, digits and single hyphens inside. */
const LOGIN = /^[A-Za-z0-9](?:-?[A-Za-z0-9])*$/;

/** The logins of CONTENT_REVIEWERS, split on commas and spaces as the content workflows split it. */
export const reviewerLogins = (value: string) => value.split(/[\s,]+/).filter(Boolean);

const FORMATS = {
  hostName: format(
    z.string().regex(/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i),
    "a host name only (imap.example.cz), without a scheme, port or path",
  ),
  googleApiKey: format(z.string().regex(/^AIza[0-9A-Za-z_-]{35}$/), "a Google API key (AIza…, 39 characters)"),
  httpsUrl: format(z.url({ protocol: /^https$/ }), "an https URL"),
  siteId: format(z.string().regex(/^[1-9][0-9]*$/), "a number (the Matomo site ID)"),
  appClientId: format(z.string().regex(/^Iv[0-9A-Za-z.]{8,}$/), "the App's Client ID (Iv23…), not its numeric App ID"),
  organization: format(z.guid(), "the organization's UUID"),
  reviewers: format(
    z.string().refine((value) => reviewerLogins(value).length > 0 && reviewerLogins(value).every((l) => LOGIN.test(l))),
    "GitHub logins separated by commas",
  ),
  workloadProvider: format(
    z.string().regex(/^projects\/[0-9]+\/locations\/global\/workloadIdentityPools\/[a-z0-9-]+\/providers\/[a-z0-9-]+$/),
    "projects/<project number>/locations/global/workloadIdentityPools/<pool>/providers/<provider> (the project number, not its ID)",
  ),
  serviceAccountEmail: format(
    z.string().regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$/),
    "a service account address (…@<project>.iam.gserviceaccount.com)",
  ),
  knownHosts: format(
    z.string().refine((value) => {
      const lines = value.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith("#"));
      return (
        lines.length > 0 &&
        lines.every((line) => /^\S+ (?:ssh-|ecdsa-|sk-)\S+ [A-Za-z0-9+/]+={0,2}(?: .*)?$/.test(line))
      );
    }),
    "known_hosts lines (<host> <key type> <key>)",
  ),
};

/** A ref an environment must let deploy, with a sample ref name its deployment policy must match. */
export type DeployRef = { type: "branch" | "tag"; sample: string };

export type EnvironmentSpec = {
  name: string;
  /** Required reviewers would hold the scheduled runs until someone approves. */
  noReviewers: boolean;
  deployFrom: DeployRef[];
  settings: Setting[];
};

const MAIN: DeployRef = { type: "branch", sample: "main" };
const RELEASE_TAG: DeployRef = { type: "tag", sample: "v1.2.3" };

const variable = (name: string, format: Format, extra: Partial<Setting> = {}): Setting => ({
  name,
  kind: "variable",
  format,
  ...extra,
});
const secret = (name: string): Setting => ({ name, kind: "secret" });

/** The repository-wide settings: the build's, the content App's and the Claude federation's shared IDs. */
export const REPOSITORY_SETTINGS: Setting[] = [
  variable("GOOGLE_CALENDAR_API_KEY", FORMATS.googleApiKey),
  variable("MATOMO_URL", FORMATS.httpsUrl),
  variable("MATOMO_SITE_ID", FORMATS.siteId),
  variable("CONTENT_APP_CLIENT_ID", FORMATS.appClientId),
  secret("CONTENT_APP_PRIVATE_KEY"),
  variable("ANTHROPIC_ORGANIZATION_ID", FORMATS.organization),
  variable("ANTHROPIC_SERVICE_ACCOUNT_ID", prefixed("svac")),
  variable("ANTHROPIC_WORKSPACE_ID", prefixed("wrkspc")),
  variable("CONTENT_REVIEWERS", FORMATS.reviewers, { optional: true }),
];

const federationRule = variable("ANTHROPIC_FEDERATION_RULE_ID", prefixed("fdrl"), { environmentOnly: true });
const mailbox = [variable("IMAP_HOST", FORMATS.hostName), secret("IMAP_USER"), secret("IMAP_PASSWORD")];
/** The Mapy.com key of the agents' `pnpm venue lookup`. */
const mapyKey = secret("MAPY_API_KEY");

export const ENVIRONMENTS: EnvironmentSpec[] = [
  {
    name: "Production",
    noReviewers: false,
    deployFrom: [RELEASE_TAG, MAIN],
    settings: [secret("DEPLOY_SSH_KEY"), { name: "DEPLOY_KNOWN_HOSTS", kind: "either", format: FORMATS.knownHosts }],
  },
  {
    name: "calendar-sync",
    noReviewers: true,
    deployFrom: [RELEASE_TAG, MAIN],
    settings: [
      variable("GOOGLE_WORKLOAD_IDENTITY_PROVIDER", FORMATS.workloadProvider),
      variable("GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL", FORMATS.serviceAccountEmail),
    ],
  },
  { name: "service-sheet-publish", noReviewers: true, deployFrom: [MAIN], settings: [...mailbox, federationRule] },
  { name: "events-publish", noReviewers: true, deployFrom: [MAIN], settings: [...mailbox, mapyKey, federationRule] },
  { name: "content-fix", noReviewers: true, deployFrom: [MAIN], settings: [mapyKey, federationRule] },
];

/** Names that must exist nowhere: a leftover ANTHROPIC_API_KEY, even empty, wins over the federation. */
export const FORBIDDEN = ["ANTHROPIC_API_KEY"];

/** The status check the `main` ruleset requires: the job of check.yml. */
export const REQUIRED_CHECK = "check";

/** The ruleset bypass actor of the repository admin role (GitHub's role id). */
export const ADMIN_ROLE_ID = 5;
