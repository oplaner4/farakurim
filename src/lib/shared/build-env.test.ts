import { describe, expect, it } from "vitest";
import { validateBuildEnv } from "./build-env";

// A made-up key of the right shape.
const calendarKey = `AIza${"x".repeat(35)}`;
const all = {
  NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY: calendarKey,
  NEXT_PUBLIC_MATOMO_URL: "https://statistiky.farakurim.cz",
  NEXT_PUBLIC_MATOMO_SITE_ID: "1",
};

describe("validateBuildEnv", () => {
  it("lets a build that is not a release run without keys", () => {
    expect(() => validateBuildEnv({})).not.toThrow();
    expect(() =>
      validateBuildEnv({ NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY: "", NEXT_PUBLIC_MATOMO_URL: " " }),
    ).not.toThrow();
  });

  it("accepts every key, in a release too", () => {
    expect(() => validateBuildEnv(all)).not.toThrow();
    expect(() => validateBuildEnv({ ...all, RELEASE_BUILD: "1" })).not.toThrow();
  });

  it("needs every key in a release, an empty one counting as missing", () => {
    expect(() => validateBuildEnv({ RELEASE_BUILD: "1" })).toThrow(/missing\n.*NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY/);
    expect(() => validateBuildEnv({ ...all, NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY: "", RELEASE_BUILD: "1" })).toThrow(
      /release build.*\n.*\n.*NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY/i,
    );
  });

  it("rejects malformed keys in any build, without printing them", () => {
    expect(() => validateBuildEnv({ NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY: "secret-123" })).toThrow(
      /not a Google API key/,
    );
    expect(() => validateBuildEnv({ NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY: "secret-123" })).not.toThrow(/secret-123/);
    expect(() => validateBuildEnv({ ...all, NEXT_PUBLIC_MATOMO_URL: "http://statistiky.farakurim.cz" })).toThrow(
      /not an https URL/,
    );
    expect(() => validateBuildEnv({ ...all, NEXT_PUBLIC_MATOMO_SITE_ID: "0" })).toThrow(/not a Matomo site ID/);
  });

  it("needs both Matomo keys or neither", () => {
    expect(() => validateBuildEnv({ NEXT_PUBLIC_MATOMO_URL: all.NEXT_PUBLIC_MATOMO_URL })).toThrow(/both Matomo keys/);
    expect(() => validateBuildEnv({ NEXT_PUBLIC_MATOMO_SITE_ID: "1" })).toThrow(/both Matomo keys/);
  });
});
