import { describe, expect, it } from "vitest";
import { isPosterOf, posterAlt, posterHref, posterOf } from "./posters";
import { event } from "./test-fixtures";

describe("posterAlt", () => {
  it("names the event, its date, time and place", () => {
    const base = { id: "x", title: "Farní den", start: "2026-10-18", text: "" };
    expect(posterAlt({ ...base, startTime: "9:30", place: "farní zahrada" })).toBe(
      "Plakát: Farní den, neděle 18. října 2026 v 9:30, farní zahrada",
    );
    expect(posterAlt({ ...base, startTime: "14:00", endTime: "18:00" })).toBe(
      "Plakát: Farní den, neděle 18. října 2026 ve 14:00–18:00",
    );
    expect(posterAlt(base)).toBe("Plakát: Farní den, neděle 18. října 2026");
  });
});

describe("posterOf", () => {
  it("names the poster after its file", () => {
    expect(posterOf("/uploads/aktuality/x-plakat.pdf")).toBe("/uploads/aktuality/x-plakat-poster.webp");
    expect(posterOf("/uploads/aktuality/x-plakat-r2.webp")).toBe("/uploads/aktuality/x-plakat-r2-poster.webp");
  });

  it("knows the file a poster was made from, by either poster name", () => {
    expect(isPosterOf("/uploads/aktuality/x-plakat-poster.webp", "/uploads/aktuality/x-plakat.pdf")).toBe(true);
    expect(isPosterOf("/uploads/aktuality/x-plakat.webp", "/uploads/aktuality/x-plakat.pdf")).toBe(true);
    expect(isPosterOf("/uploads/aktuality/x-plakat-poster.webp", "/uploads/aktuality/x-mapka.pdf")).toBe(false);
  });
});

describe("posterHref", () => {
  const file = (label: string, name: string) => ({ label, file: `/uploads/aktuality/${name}` });
  const withPoster = (src: string, attachments: { label: string; file: string }[]) =>
    event("x", "2026-10-18", undefined, { poster: { src: `/uploads/aktuality/${src}`, alt: "" }, attachments });

  it("opens the poster's original, named like the poster", () => {
    const invitation = file("Pozvánka", "x-pozvanka.pdf");
    const program = file("Program", "x-program.pdf");
    expect(posterHref(withPoster("x-pozvanka-poster.webp", [program, invitation]))).toBe(invitation.file);
    expect(posterHref(withPoster("x-pozvanka.webp", [program, invitation]))).toBe(invitation.file);
    expect(posterHref(withPoster("x-pozvanka-r2-poster.webp", [file("Pozvánka", "x-pozvanka-r2.png")]))).toBe(
      "/uploads/aktuality/x-pozvanka-r2.png",
    );
    // A WebP original is its own file, beside its poster.
    expect(posterHref(withPoster("x-plakat-poster.webp", [file("Plakát", "x-plakat.webp")]))).toBe(
      "/uploads/aktuality/x-plakat.webp",
    );
  });

  it("falls back to the Plakát attachment, then the poster itself", () => {
    expect(posterHref(withPoster("jiny.webp", [file("Program", "x-program.pdf"), file("Plakát", "y.jpg")]))).toBe(
      "/uploads/aktuality/y.jpg",
    );
    expect(posterHref(withPoster("x-plakat-poster.webp", []))).toBe("/uploads/aktuality/x-plakat-poster.webp");
    expect(posterHref(event("x", "2026-10-18", undefined, { attachments: [file("Plakát", "y.jpg")] }))).toBe(
      "/uploads/aktuality/y.jpg",
    );
    expect(posterHref(event("x", "2026-10-18"))).toBeUndefined();
  });
});
