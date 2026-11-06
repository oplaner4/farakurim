// The GitHub setup the workflows need (docs/github-setup.md, docs/content-pipelines.md, docs/calendar-sync.md): the
// repository's variables and secrets, the environments with what each holds and may deploy from, and the rules a
// check of the repository holds them to.

/** A variable, a secret, or `either` (a public value the workflows read as `secrets.X || vars.X`). */
export type SettingKind = "variable" | "secret" | "either";

export type Setting = {
  name: string;
  kind: SettingKind;
  /** Nothing breaks without it. */
  optional?: true;
  /** Only in its environment: a repository-wide value would stand in for a missing one of another environment. */
  environmentOnly?: true;
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

const variable = (name: string, extra: Partial<Setting> = {}): Setting => ({ name, kind: "variable", ...extra });
const secret = (name: string): Setting => ({ name, kind: "secret" });

/** The repository-wide settings: the build's, the content App's and the Claude federation's shared IDs. */
export const REPOSITORY_SETTINGS: Setting[] = [
  variable("GOOGLE_CALENDAR_API_KEY"),
  variable("MATOMO_URL"),
  variable("MATOMO_SITE_ID"),
  variable("CONTENT_APP_CLIENT_ID"),
  secret("CONTENT_APP_PRIVATE_KEY"),
  variable("ANTHROPIC_ORGANIZATION_ID"),
  variable("ANTHROPIC_SERVICE_ACCOUNT_ID"),
  variable("ANTHROPIC_WORKSPACE_ID"),
  variable("CONTENT_REVIEWERS", { optional: true }),
];

const federationRule = variable("ANTHROPIC_FEDERATION_RULE_ID", { environmentOnly: true });
const mailbox = [variable("IMAP_HOST"), secret("IMAP_USER"), secret("IMAP_PASSWORD")];

export const ENVIRONMENTS: EnvironmentSpec[] = [
  {
    name: "Production",
    noReviewers: false,
    deployFrom: [RELEASE_TAG, MAIN],
    settings: [secret("DEPLOY_SSH_KEY"), { name: "DEPLOY_KNOWN_HOSTS", kind: "either" }],
  },
  {
    name: "calendar-sync",
    noReviewers: true,
    deployFrom: [RELEASE_TAG, MAIN],
    settings: [variable("GOOGLE_WORKLOAD_IDENTITY_PROVIDER"), variable("GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL")],
  },
  { name: "service-sheet-publish", noReviewers: true, deployFrom: [MAIN], settings: [...mailbox, federationRule] },
  { name: "events-publish", noReviewers: true, deployFrom: [MAIN], settings: [...mailbox, federationRule] },
  { name: "content-fix", noReviewers: true, deployFrom: [MAIN], settings: [federationRule] },
];

/** Names that must exist nowhere: a leftover ANTHROPIC_API_KEY, even empty, wins over the federation. */
export const FORBIDDEN = ["ANTHROPIC_API_KEY"];

/** The status check the `main` ruleset requires: the job of check.yml. */
export const REQUIRED_CHECK = "check";

/** The ruleset bypass actor of the repository admin role (GitHub's role id). */
export const ADMIN_ROLE_ID = 5;
