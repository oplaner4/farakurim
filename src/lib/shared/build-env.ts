import { z } from "zod";

// The public keys a build inlines (`content/site.ts`), checked by next.config.ts before every build. A release build
// (RELEASE_BUILD=1, set by check.yml for a release and by `pnpm release --local`) needs all of them: without the
// calendar key it would ship the generated calendars, without Matomo it would not count visits. Other builds (CI
// checks, `pnpm build` for preview, `pnpm dev`) may leave them out, but a key that is set must be well formed. The
// messages never print a value.

/** The message for a key that is missing, or else `invalid`. */
const message = (invalid: string) => ({
  error: (issue: { input?: unknown }) => (issue.input === undefined ? "missing" : invalid),
});

const keys = z.object({
  NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY: z
    .string(message("not a string"))
    .regex(/^AIza[\w-]{35}$/, "not a Google API key (AIza…, 39 characters)"),
  NEXT_PUBLIC_MATOMO_URL: z.url({ protocol: /^https$/, ...message("not an https URL") }),
  NEXT_PUBLIC_MATOMO_SITE_ID: z
    .string(message("not a string"))
    .regex(/^[1-9]\d*$/, "not a Matomo site ID (a positive whole number)"),
});

type Keys = z.infer<typeof keys>;
const names = Object.keys(keys.shape) as (keyof Keys)[];

/**
 * Throws when the keys in `env` do not fit the build: a release misses one, or a key is malformed, or only one of the
 * two Matomo keys is set. An empty or blank value counts as unset.
 */
export function validateBuildEnv(env: Record<string, string | undefined>): void {
  const values = Object.fromEntries(names.flatMap((name) => (env[name]?.trim() ? [[name, env[name]]] : [])));
  const release = env.RELEASE_BUILD === "1";
  const base: z.ZodType<Partial<Keys>> = release ? keys : keys.partial();
  const schema = base.refine(
    (k) => !k.NEXT_PUBLIC_MATOMO_URL === !k.NEXT_PUBLIC_MATOMO_SITE_ID,
    "set both Matomo keys or neither",
  );
  const result = schema.safeParse(values);
  if (result.success) return;
  const build = release ? "A release build (RELEASE_BUILD=1)" : "This build";
  throw new Error(`${build} has invalid keys (.env.local or the environment):\n${z.prettifyError(result.error)}`);
}
