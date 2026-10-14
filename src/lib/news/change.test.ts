import { describe, expect, it } from "vitest";
import { eventChangeBanner, eventNote } from "./change";
import { event } from "@/test/fixtures";

const lecture = (change: Parameters<typeof event>[3]) => event("prednaska-2026", "2026-10-24", undefined, change);

describe("eventNote", () => {
  it("says why an event is cancelled", () => {
    const note = "Akce se ruší z důvodu nemoci přednášejícího.";
    expect(eventNote(lecture({ change: { status: "cancelled", note } }))).toEqual({
      kind: "cancelled",
      label: "Zrušeno:",
      text: note,
    });
    expect(eventNote(lecture({ change: { status: "cancelled" } }))?.text).toBe("Akce se nekoná.");
  });

  it("says where a postponed event moved from", () => {
    const moved = { status: "moved", previousStart: "2026-10-17" } as const;
    expect(eventNote(lecture({ change: { ...moved, note: "kvůli předpovědi počasí." } }))).toEqual({
      kind: "moved",
      label: "Přesunuto",
      text: "ze soboty 17. 10. kvůli předpovědi počasí.",
    });
    expect(eventNote(lecture({ change: moved }))?.text).toBe("ze soboty 17. 10.");
  });

  it("names a series' dropped meetings", () => {
    const series = (dates: string[], note?: string) =>
      eventNote(event("vecery-2026", "2026-10-11", "2026-10-25", { cancelledMeetings: { dates, note } }));
    expect(series(["2026-10-18"])).toEqual({
      kind: "changed",
      label: "Změna:",
      text: "setkání 18. 10. odpadá, ostatní termíny platí.",
    });
    expect(series(["2026-10-18", "2026-10-25"], "Náhradní termín oznámíme.")?.text).toBe(
      "setkání 18. 10. a\u00a025. 10. odpadají, ostatní termíny platí. Náhradní termín oznámíme.",
    );
  });

  it("is missing for an event without a change", () => {
    expect(eventNote(lecture({}))).toBeUndefined();
  });
});

describe("eventChangeBanner", () => {
  it("announces a cancellation with its note and day", () => {
    const change = { status: "cancelled", note: "Přednáška se ruší.", announced: "2026-10-12" } as const;
    expect(eventChangeBanner(lecture({ change }))).toEqual({
      kind: "cancelled",
      title: "Akce byla zrušena",
      text: "Přednáška se ruší.",
      announced: "12. 10. 2026",
    });
  });

  it("gives a postponed event's new and first date", () => {
    const change = { status: "moved", previousStart: "2026-10-17", note: "kvůli předpovědi počasí." } as const;
    expect(eventChangeBanner(lecture({ startTime: "14:00", change }))?.text).toBe(
      "Nový termín: sobota 24. 10. 2026 ve 14:00. Původně 17. 10. Kvůli předpovědi počasí.",
    );
    expect(eventChangeBanner(lecture({ change: { status: "moved", previousStart: "2026-10-17" } }))?.text).toBe(
      "Nový termín: sobota 24. 10. 2026. Původně 17. 10.",
    );
    // A multi-day event moves by its days; its times belong to the first day only, so they are left out.
    const days = event("prednaska-2026", "2026-10-24", "2026-10-25", {
      startTime: "14:00",
      change: { status: "moved", previousStart: "2026-10-17" },
    });
    expect(eventChangeBanner(days)?.text).toBe("Nový termín: 24. 10. – 25. 10. 2026. Původně 17. 10.");
  });

  it("is missing for an event without a change", () => {
    expect(eventChangeBanner(lecture({}))).toBeUndefined();
  });
});
