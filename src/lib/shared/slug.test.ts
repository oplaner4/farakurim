import { describe, expect, it } from "vitest";
import { slug } from "./slug";

describe("slug", () => {
  it("is ASCII kebab-case", () => {
    expect(slug("Pěší pouť na Vranov")).toBe("pesi-pout-na-vranov");
    expect(slug("  Žehnání – náměstí! ")).toBe("zehnani-namesti");
    expect(slug("2. část")).toBe("2-cast");
    expect(slug("mimořádné")).toBe("mimoradne");
  });

  it("is empty without a letter or digit", () => {
    expect(slug("–!")).toBe("");
  });
});
