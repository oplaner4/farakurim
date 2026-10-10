import { describe, expect, it } from "vitest";
import { matomoConfig, pageViewCommands, setupCommands, trackedUrl } from "./analytics";

describe("matomoConfig", () => {
  it("builds the tracker and script URLs", () => {
    expect(matomoConfig("https://statistiky.farakurim.cz", "1")).toEqual({
      trackerUrl: "https://statistiky.farakurim.cz/matomo.php",
      scriptUrl: "https://statistiky.farakurim.cz/matomo.js",
      siteId: "1",
    });
  });

  it("tolerates trailing slashes and surrounding spaces", () => {
    expect(matomoConfig(" https://statistiky.farakurim.cz// ", " 3 ")).toEqual({
      trackerUrl: "https://statistiky.farakurim.cz/matomo.php",
      scriptUrl: "https://statistiky.farakurim.cz/matomo.js",
      siteId: "3",
    });
  });

  it("is off when either value is missing or blank", () => {
    expect(matomoConfig(undefined, "1")).toBeUndefined();
    expect(matomoConfig("https://statistiky.farakurim.cz", undefined)).toBeUndefined();
    expect(matomoConfig("", "1")).toBeUndefined();
    expect(matomoConfig("https://statistiky.farakurim.cz", "  ")).toBeUndefined();
  });
});

describe("setupCommands", () => {
  it("disables cookies before anything else", () => {
    const commands = setupCommands(matomoConfig("https://statistiky.farakurim.cz", "1")!);
    expect(commands[0]).toEqual(["disableCookies"]);
    expect(commands).toEqual([
      ["disableCookies"],
      ["setTrackerUrl", "https://statistiky.farakurim.cz/matomo.php"],
      ["setSiteId", "1"],
    ]);
  });
});

describe("trackedUrl", () => {
  it("joins the origin and the pathname", () => {
    expect(trackedUrl("https://2026.farakurim.cz", "/aktuality/")).toBe("https://2026.farakurim.cz/aktuality/");
  });

  it("drops a query string or hash that slipped into the pathname", () => {
    expect(trackedUrl("https://farakurim.cz", "/aktuality/?obdobi=tyden")).toBe("https://farakurim.cz/aktuality/");
    expect(trackedUrl("https://farakurim.cz", "/fotogalerie/#foto-3")).toBe("https://farakurim.cz/fotogalerie/");
  });
});

describe("pageViewCommands", () => {
  it("sets the referrer, URL and title, tracks the view and re-scans links", () => {
    expect(pageViewCommands("https://farakurim.cz/kontakty/", "Kontakty | Farnost", "https://farakurim.cz/")).toEqual([
      ["setReferrerUrl", "https://farakurim.cz/"],
      ["setCustomUrl", "https://farakurim.cz/kontakty/"],
      ["setDocumentTitle", "Kontakty | Farnost"],
      ["trackPageView"],
      ["enableLinkTracking"],
    ]);
  });

  it("leaves the browser's referrer alone on the first page", () => {
    expect(pageViewCommands("https://farakurim.cz/", "Úvod", undefined)[0]).toEqual([
      "setCustomUrl",
      "https://farakurim.cz/",
    ]);
  });
});
