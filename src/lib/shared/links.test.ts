import { describe, expect, it } from "vitest";
import { displayDomain, externalLinkAttrs, isExternalHref, withExternalLinkTargets } from "./links";

describe("isExternalHref", () => {
  it("treats other sites as external", () => {
    expect(isExternalHref("https://www.zonerama.com/FarnostKurim/425053")).toBe(true);
    expect(isExternalHref("http://example.com")).toBe(true);
  });

  it("keeps the parish site, relative links, mailto and tel internal", () => {
    expect(isExternalHref("https://farakurim.cz/virtualni_prohlidka/")).toBe(false);
    expect(isExternalHref("https://www.farakurim.cz/")).toBe(false);
    expect(isExternalHref("/uploads/x.pdf")).toBe(false);
    expect(isExternalHref("#obsah")).toBe(false);
    expect(isExternalHref("mailto:fara.kurim@seznam.cz")).toBe(false);
    expect(isExternalHref("tel:+420541230183")).toBe(false);
  });
});

describe("externalLinkAttrs", () => {
  it("opens external links in a new tab", () => {
    expect(externalLinkAttrs("https://mapy.cz/")).toEqual({ target: "_blank", rel: "noopener noreferrer" });
    expect(externalLinkAttrs("/kontakty/")).toEqual({});
    expect(externalLinkAttrs(undefined)).toEqual({});
  });
});

describe("withExternalLinkTargets", () => {
  it("adds target and rel to external links in content HTML only", () => {
    expect(
      withExternalLinkTargets(
        '<p><a href="https://zacnikdejsi.cz">web</a>, <a href="mailto:a@b.cz">mail</a>, <a href="/aktuality/">x</a></p>',
      ),
    ).toBe(
      '<p><a href="https://zacnikdejsi.cz" target="_blank" rel="noopener noreferrer">web</a>, <a href="mailto:a@b.cz">mail</a>, <a href="/aktuality/">x</a></p>',
    );
  });

  it("leaves a link that already has a target alone", () => {
    const html = '<a href="https://example.com" target="_self">x</a>';
    expect(withExternalLinkTargets(html)).toBe(html);
  });
});

describe("displayDomain", () => {
  it.each([
    ["https://www.cirkev.cz/", "cirkev.cz"],
    ["https://www.vaticannews.va/cs.html", "vaticannews.va"],
    ["https://donator.cz/projekt/tisnovpastorace", "donator.cz"],
  ])("%s → %s", (href, expected) => {
    expect(displayDomain(href)).toBe(expected);
  });
});
