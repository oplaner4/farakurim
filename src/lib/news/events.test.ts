import { describe, expect, it } from "vitest";
import { events as allEvents } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import { pragueDateTime } from "@/lib/shared/prague";
import {
  currentNews,
  eventHref,
  eventPageTitle,
  eventProgress,
  eventTags,
  featuredEvent,
  filterEvents,
  findEventById,
  groupEvents,
  isPast,
  isPosterOf,
  meetingsOf,
  NEWS_FILTER_META,
  NEWS_FILTERS,
  otherEvents,
  posterAlt,
  posterHref,
  posterOf,
  progressLabel,
  relativeEventLabel,
} from "./events";
import { event, events, ids, TODAY } from "./test-fixtures";

/** An instant of a Prague date and time, as `useNow()` gives it. */
const at = (date: string, time = "12:00") => pragueDateTime(date, time).getTime();

describe("isPast", () => {
  it("is past from the day after the end", () => {
    expect(isPast(events[2], "2026-10-04")).toBe(false);
    expect(isPast(events[2], "2026-10-05")).toBe(true);
  });
});

describe("eventProgress", () => {
  const evening = event("x", "2026-10-18", undefined, { time: "18:00–20:30" });

  it("is today before the start time, now until the end time, then nothing", () => {
    expect(eventProgress(evening, at("2026-10-17", "19:00"))).toBeUndefined();
    expect(eventProgress(evening, at("2026-10-18", "10:00"))).toEqual({ kind: "today", time: "18:00" });
    expect(eventProgress(evening, at("2026-10-18", "18:00"))).toEqual({ kind: "now" });
    expect(eventProgress(evening, at("2026-10-18", "20:29"))).toEqual({ kind: "now" });
    expect(eventProgress(evening, at("2026-10-18", "20:30"))).toBeUndefined();
  });

  it("is now for the rest of the day after a start time without an end", () => {
    const mass = event("x", "2026-10-18", undefined, { time: "9:30" });
    expect(eventProgress(mass, at("2026-10-18", "9:00"))).toEqual({ kind: "today", time: "9:30" });
    expect(eventProgress(mass, at("2026-10-18", "23:59"))).toEqual({ kind: "now" });
  });

  it("is now all day for an event without a clock time and every day of a multi-day event", () => {
    const afterMass = event("x", "2026-10-18", undefined, { time: "po mši" });
    expect(eventProgress(afterMass, at("2026-10-18", "0:00"))).toEqual({ kind: "now" });
    const feast = event("x", "2026-10-02", "2026-10-04", { time: "18:00" });
    expect(eventProgress(feast, at("2026-10-02", "8:00"))).toEqual({ kind: "now" });
    expect(eventProgress(feast, at("2026-10-04", "23:00"))).toEqual({ kind: "now" });
    expect(eventProgress(feast, at("2026-10-05", "0:00"))).toBeUndefined();
  });

  it("names the next meeting of a series between its meetings, skipping dropped ones", () => {
    const series = event("x", "2026-10-11", "2026-10-25", {
      time: "18:00–20:30",
      sessions: ["2026-10-11", "2026-10-18", "2026-10-25"],
      cancelledMeetings: { dates: ["2026-10-18"] },
    });
    expect(eventProgress(series, at("2026-10-10"))).toBeUndefined();
    expect(eventProgress(series, at("2026-10-11", "19:00"))).toEqual({ kind: "now" });
    expect(eventProgress(series, at("2026-10-11", "21:00"))).toEqual({ kind: "next", date: "2026-10-25" });
    expect(eventProgress(series, at("2026-10-13"))).toEqual({ kind: "next", date: "2026-10-25" });
    expect(eventProgress(series, at("2026-10-25", "17:00"))).toEqual({ kind: "today", time: "18:00" });
    expect(eventProgress(series, at("2026-10-25", "21:00"))).toBeUndefined();
  });

  it("is nothing for long-term and cancelled events", () => {
    expect(eventProgress(events[5], at(TODAY))).toBeUndefined();
    const cancelled = event("x", "2026-10-03", undefined, { change: { status: "cancelled" } });
    expect(eventProgress(cancelled, at(TODAY))).toBeUndefined();
  });
});

describe("progressLabel", () => {
  it("says what is happening", () => {
    expect(progressLabel({ kind: "now" })).toBe("Právě probíhá");
    expect(progressLabel({ kind: "today", time: "18:00" })).toBe("Dnes v 18:00");
    expect(progressLabel({ kind: "today", time: "14:00" })).toBe("Dnes ve 14:00");
    expect(progressLabel({ kind: "next", date: "2026-10-25" })).toBe("Další setkání 25. 10.");
  });
});

describe("currentNews", () => {
  it("drops finished and long-term items, sorts by start and applies the limit", () => {
    expect(ids(currentNews(events, TODAY, 2))).toEqual(["ongoing", "soon"]);
  });

  it("keeps a single-day item on its own day", () => {
    expect(ids(currentNews(events, "2026-10-07", 5))).toEqual(["soon", "pinned", "later"]);
  });
});

describe("featuredEvent", () => {
  it("is the pinned event until it ends", () => {
    expect(featuredEvent(events, TODAY)?.id).toBe("pinned");
    expect(featuredEvent(events, "2026-10-19")).toBeUndefined();
  });

  it("leaves out a cancelled pinned event", () => {
    const cancelled = event("pinned", "2026-10-18", undefined, { pinned: true, change: { status: "cancelled" } });
    expect(featuredEvent([cancelled], TODAY)).toBeUndefined();
  });
});

describe("filterEvents", () => {
  it.each([
    ["upcoming", ["later", "ongoing", "soon", "weekly"]],
    ["week", ["ongoing"]],
    ["month", ["ongoing", "soon"]],
    ["long", ["weekly"]],
    ["all", ["later", "past", "ongoing", "soon", "weekly", "long-past"]],
  ] as const)("%s", (filter, expected) => {
    expect(ids(filterEvents(events, filter, TODAY))).toEqual(expected);
  });

  it("lists the pinned event again once it has finished", () => {
    expect(ids(filterEvents(events, "all", "2026-10-19"))).toContain("pinned");
  });
});

describe("groupEvents", () => {
  it("groups by start month, then long-term, then finished, each sorted by start", () => {
    const groups = groupEvents(filterEvents(events, "all", TODAY), TODAY);
    expect(groups.map((g) => (g.kind === "month" ? g.month : g.kind))).toEqual([
      "2026-10-01",
      "2026-12-01",
      "long",
      "past",
    ]);
    expect(groups.map((g) => ids(g.events))).toEqual([
      ["ongoing", "soon"],
      ["later"],
      ["weekly"],
      ["long-past", "past"],
    ]);
  });
});

describe("detail URLs", () => {
  it("are the IDs and never clash with the Aktuality filter or archive pages", () => {
    const reserved = [...NEWS_FILTERS.map((f) => NEWS_FILTER_META[f].slug), "archiv"];
    expect(allEvents.map((e) => e.id).filter((id) => reserved.includes(id))).toEqual([]);
  });

  it("finds an event by its ID", () => {
    const jubilee = findEventById(allEvents, "jubileum-800-2026");
    expect(jubilee?.title).toBe("Slavnostní mše k jubileu 800 let");
    expect(eventHref(jubilee!)).toBe("/aktuality/jubileum-800-2026/");
  });
});

describe("otherEvents", () => {
  it("lists the nearest unfinished events without the current one", () => {
    expect(ids(otherEvents(events, events[4], TODAY, 2))).toEqual(["ongoing", "soon"]);
    expect(ids(otherEvents(events, events[2], TODAY, 2))).toEqual(["soon", "pinned"]);
  });
});

describe("eventPageTitle", () => {
  it("adds the year only when another event has the same title", () => {
    const adoration = (id: string, start: string) => ({ id, title: "Adorační den", start, text: "" });
    const list = [
      adoration("a", "2020-11-08"),
      adoration("b", "2021-11-07"),
      { ...adoration("c", "2022-05-01"), title: "Pouť" },
    ];
    expect(eventPageTitle(list[0], list)).toBe("Adorační den 2020");
    expect(eventPageTitle(list[1], list)).toBe("Adorační den 2021");
    expect(eventPageTitle(list[2], list)).toBe("Pouť");
  });

  it("tells every event of the site apart", () => {
    const titles = allEvents.map((e) => eventPageTitle(e, allEvents));
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("posterAlt", () => {
  it("names the event, its date, time and place", () => {
    const base = { id: "x", title: "Farní den", start: "2026-10-18", text: "" };
    expect(posterAlt({ ...base, time: "9:30", place: "farní zahrada" })).toBe(
      "Plakát: Farní den, neděle 18. října 2026 v 9:30, farní zahrada",
    );
    expect(posterAlt({ ...base, time: "14:00–18:00" })).toBe("Plakát: Farní den, neděle 18. října 2026 ve 14:00–18:00");
    expect(posterAlt(base)).toBe("Plakát: Farní den, neděle 18. října 2026");
  });
});

describe("meetingsOf", () => {
  it("is each meeting of a series, the first day of a weekly one, else the event's span", () => {
    const time = "13:00–18:00";
    expect(
      meetingsOf(
        event("a", "2026-10-11", undefined, { time, sessions: ["2026-10-11", { date: "2026-10-18", time: "19:00" }] }),
      ),
    ).toEqual([
      { start: "2026-10-11", end: "2026-10-11", time },
      { start: "2026-10-18", end: "2026-10-18", time: "19:00" },
    ]);
    expect(meetingsOf(event("a", "2026-10-12", "2027-06-30", { time, longTerm: { weeklyAt: "18:30" } }))).toEqual([
      { start: "2026-10-12", end: "2026-10-12", time: "18:30" },
    ]);
    expect(meetingsOf(event("a", "2026-10-12", "2026-10-14", { time }))).toEqual([
      { start: "2026-10-12", end: "2026-10-14", time },
    ]);
  });

  it("marks the dropped meetings, and every meeting of a cancelled event, as cancelled", () => {
    const sessions = ["2026-10-11", "2026-10-18", "2026-10-25"];
    const series = event("a", "2026-10-11", "2026-10-25", { sessions, cancelledMeetings: { dates: ["2026-10-18"] } });
    expect(meetingsOf(series).map((m) => m.cancelled)).toEqual([undefined, true, undefined]);
    const cancelled = { change: { status: "cancelled" } } as const;
    expect(
      meetingsOf(event("a", "2026-10-11", "2026-10-25", { sessions, ...cancelled })).every((m) => m.cancelled),
    ).toBe(true);
    expect(meetingsOf(event("a", "2026-10-12", undefined, cancelled))).toEqual([
      { start: "2026-10-12", end: "2026-10-12", time: undefined, cancelled: true },
    ]);
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
    const pozvanka = file("Pozvánka", "x-pozvanka.pdf");
    const program = file("Program", "x-program.pdf");
    expect(posterHref(withPoster("x-pozvanka-poster.webp", [program, pozvanka]))).toBe(pozvanka.file);
    expect(posterHref(withPoster("x-pozvanka.webp", [program, pozvanka]))).toBe(pozvanka.file);
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

describe("relativeEventLabel", () => {
  const span = (start: string, end?: string, extra: Partial<NewsEvent> = {}) => event("", start, end, extra);
  it("counts Prague calendar days to the start", () => {
    expect(relativeEventLabel(span("2026-10-18"), at("2026-10-03"))).toBe("Za 15 dní");
    expect(relativeEventLabel(span("2026-10-06"), at("2026-10-03"))).toBe("Za 3 dny");
    // Across the change to winter time on 25. 10.
    expect(relativeEventLabel(span("2026-10-27"), at("2026-10-24"))).toBe("Za 3 dny");
    expect(relativeEventLabel(span("2026-10-04"), at("2026-10-03"))).toBe("Zítra");
    expect(relativeEventLabel(span("2026-10-03"), at("2026-10-03"))).toBe("Dnes");
  });

  it("marks running, started and finished events", () => {
    const evening = span("2026-10-03", undefined, { time: "18:00–20:30" });
    expect(relativeEventLabel(evening, at("2026-10-03", "10:00"))).toBe("Dnes");
    expect(relativeEventLabel(evening, at("2026-10-03", "19:00"))).toBe("Právě probíhá");
    expect(relativeEventLabel(evening, at("2026-10-03", "21:00"))).toBe("Dnes");
    expect(relativeEventLabel(span("2026-10-02", "2026-10-04"), at("2026-10-04"))).toBe("Právě probíhá");
    const series = span("2026-10-11", "2026-10-25", { sessions: ["2026-10-11", "2026-10-25"] });
    expect(relativeEventLabel(series, at("2026-10-13"))).toBe("Další setkání 25. 10.");
    expect(relativeEventLabel(events[5], at(TODAY))).toBe("Právě probíhá");
    expect(relativeEventLabel(span("2026-10-02", "2026-10-04"), at("2026-10-05"))).toBe("Proběhlo");
    expect(relativeEventLabel(span("2026-10-02"), at("2026-10-03"))).toBe("Proběhlo");
  });
});

describe("eventTags", () => {
  const labels = (tags: { label: string }[]) => tags.map((t) => t.label);

  it("lists the badges in order", () => {
    const full = event("x", "2026-10-02", "2026-10-04", {
      registrationDeadline: "2026-10-03",
      price: "200 Kč",
      sessions: ["2026-10-02", "2026-10-03", "2026-10-04"],
      tags: [{ label: "Pro rodiny" }, { label: "Bez bariér", color: "orange" }],
    });
    expect(eventTags(full, at(TODAY))).toEqual([
      { kind: "now", label: "Právě probíhá" },
      { kind: "orange", label: "Přihlášky do 3. 10." },
      { kind: "blue", label: "200 Kč" },
      { kind: "blue", label: "3 setkání" },
      { kind: "blue", label: "Pro rodiny" },
      { kind: "orange", label: "Bez bariér" },
    ]);
  });

  it("gives a cancelled event only Zrušeno and puts Přesunuto first", () => {
    const priced = { price: "200 Kč", registrationDeadline: "2026-10-10" };
    const cancelled = event("x", "2026-10-18", undefined, { ...priced, change: { status: "cancelled" } });
    expect(eventTags(cancelled, at(TODAY))).toEqual([{ kind: "cancelled", label: "Zrušeno" }]);
    const moved = event("x", "2026-10-24", undefined, {
      ...priced,
      change: { status: "moved", previousStart: "2026-10-17" },
    });
    expect(labels(eventTags(moved, at(TODAY)))).toEqual(["Přesunuto", "Přihlášky do 10. 10.", "200 Kč"]);
  });

  it("puts a meeting today and the next meeting of a series first", () => {
    const evening = event("x", TODAY, undefined, { time: "18:00", price: "200 Kč" });
    expect(eventTags(evening, at(TODAY, "10:00"))).toEqual([
      { kind: "magenta", label: "Dnes v 18:00" },
      { kind: "blue", label: "200 Kč" },
    ]);
    const series = event("x", "2026-10-01", "2026-10-08", { sessions: ["2026-10-01", "2026-10-08"] });
    expect(eventTags(series, at(TODAY))).toEqual([
      { kind: "blue", label: "Další setkání 8. 10." },
      { kind: "blue", label: "2 setkání" },
    ]);
  });

  it("shows the registration deadline until its day has passed", () => {
    const until = (deadline: string) => event("x", "2026-10-18", undefined, { registrationDeadline: deadline });
    expect(labels(eventTags(until(TODAY), at(TODAY)))).toEqual(["Přihlášky do 3. 10."]);
    expect(eventTags(until("2026-10-02"), at(TODAY))).toEqual([]);
  });

  it("marks weekly series, but not other long-term events", () => {
    expect(labels(eventTags(events[5], at(TODAY)))).toEqual(["Každý týden"]);
    expect(eventTags(event("x", "2026-10-01", "2027-06-30", { longTerm: true }), at(TODAY))).toEqual([]);
  });

  it("ends a past event with Proběhlo", () => {
    expect(eventTags(events[1], at(TODAY))).toEqual([{ kind: "grey", label: "Proběhlo" }]);
  });
});
