import { describe, expect, it } from "vitest";
import { places } from "@/content/masses";
import type { PlaceId } from "@/content/types/services";
import type { GoogleEvent } from "@/lib/calendar/google-calendar";
import { SERVICES_URL, serviceEventId, type DesiredService } from "./services-desired";
import { servicesLines, servicesProblemLines } from "./services-lines";
import type { ServicesChange, ServicesPlan } from "./services-plan";

const service = (date: string, time: string, summary = "Mše svatá v Kuřimi", place: PlaceId = "kurim") => {
  const [hour, minute] = time.split(":").map(Number);
  const at = (h: number) => ({
    dateTime: `${date}T${String(h).padStart(2, "0")}:${minute === 0 ? "00" : minute}:00+02:00`,
  });
  return {
    googleId: serviceEventId(date, time, place),
    date,
    time,
    place,
    status: "regular",
    body: {
      summary,
      location: places[place].address,
      description: SERVICES_URL,
      start: at(hour),
      end: at(hour + 1),
    },
  } as DesiredService;
};

const google = (id: string, date: string, time: string, summary: string, extra: Partial<GoogleEvent> = {}) => ({
  id,
  summary,
  start: { dateTime: `${date}T${time}:00+02:00` },
  end: { dateTime: `${date}T${time}:00+02:00` },
  ...extra,
});

const add = (date: string, time: string): ServicesChange => ({ kind: "add", desired: service(date, time) });

const update = (claim: boolean, fields: Extract<ServicesChange, { kind: "update" }>["fields"]): ServicesChange => ({
  kind: "update",
  desired: service("2026-10-20", "8:00"),
  target: google("u", "2026-10-20", "08:00", "Mše svatá v Kuřimi"),
  claim,
  fields,
  body: {},
});

const plan = (changes: ServicesChange[], reports: ServicesPlan["reports"] = []): ServicesPlan => ({ changes, reports });

describe("servicesLines", () => {
  const claim: ServicesChange = {
    kind: "update",
    desired: service("2026-10-12", "17:30", "Adorace"),
    target: google("c", "2026-10-12", "17:30", "Modlitba růžence a požehnání"),
    claim: true,
    fields: ["summary", "description"],
    body: {},
  };
  const del: ServicesChange = {
    kind: "delete",
    target: google("d", "2026-10-13", "18:00", "Mše svatá v Kuřimi"),
  };
  const restore: ServicesChange = {
    kind: "restore",
    desired: service("2026-10-14", "8:00"),
    target: google("r", "2026-10-14", "08:00", "Mše svatá v Kuřimi", { status: "cancelled" }),
  };
  const duplicate: ServicesPlan["reports"][number] = {
    kind: "duplicate",
    desired: service("2026-10-25", "9:00"),
    events: [google("x", "2026-10-25", "09:00", "Mše svatá v Kuřimi", { recurringEventId: "series" })],
  };
  const full = plan(
    [claim, del, restore, add("2026-10-18", "9:30"), add("2026-10-18", "8:00"), update(false, ["start", "end"])],
    [duplicate],
  );

  it("previews: one line per change, the adds of a date together in time order, dates in order, reports last", () => {
    expect(servicesLines(full, false)).toEqual([
      'Bohoslužby, 2026-10-12: claim 17:30 "Modlitba růžence a požehnání" and update its title, description',
      'Bohoslužby, 2026-10-13: delete 18:00 "Mše svatá v Kuřimi"',
      'Bohoslužby, 2026-10-14: restore 8:00 "Mše svatá v Kuřimi" (it was deleted)',
      'Bohoslužby, 2026-10-18: add 8:00 "Mše svatá v Kuřimi", 9:30 "Mše svatá v Kuřimi"',
      'Bohoslužby, 2026-10-20: update 8:00 "Mše svatá v Kuřimi": time',
      'Bohoslužby, 2026-10-25: 9:00 "Mše svatá v Kuřimi" doubles "Mše svatá v Kuřimi" (repeating): remove it by hand',
    ]);
  });

  it("says what was done with --apply, and why a write failed", () => {
    const failures = new Map<ServicesChange, string>([[del, "HTTP 403"]]);
    expect(servicesLines(full, true, failures)).toEqual([
      'Bohoslužby, 2026-10-12: claimed 17:30 "Modlitba růžence a požehnání" and updated its title, description',
      'Bohoslužby, 2026-10-13: deleted 18:00 "Mše svatá v Kuřimi" — failed: HTTP 403',
      'Bohoslužby, 2026-10-14: restored 8:00 "Mše svatá v Kuřimi" (it was deleted)',
      'Bohoslužby, 2026-10-18: added 8:00 "Mše svatá v Kuřimi", 9:30 "Mše svatá v Kuřimi"',
      'Bohoslužby, 2026-10-20: updated 8:00 "Mše svatá v Kuřimi": time',
      'Bohoslužby, 2026-10-25: 9:00 "Mše svatá v Kuřimi" doubles "Mše svatá v Kuřimi" (repeating): remove it by hand',
    ]);
  });

  it("gives a failed add its own line, apart from the adds that went through", () => {
    const first = add("2026-10-18", "8:00");
    const lines = servicesLines(plan([first, add("2026-10-18", "9:30")]), true, new Map([[first, "HTTP 409"]]));
    expect(lines).toEqual([
      'Bohoslužby, 2026-10-18: added 9:30 "Mše svatá v Kuřimi"',
      'Bohoslužby, 2026-10-18: added 8:00 "Mše svatá v Kuřimi" — failed: HTTP 409',
    ]);
  });

  it("names every event a service doubles, a single one without 'repeating'", () => {
    const lines = servicesLines(
      plan(
        [],
        [
          {
            kind: "duplicate",
            desired: service("2026-10-25", "9:00"),
            events: [google("a", "2026-10-25", "09:00", "Mše"), google("b", "2026-10-25", "09:00", "Mše sv.")],
          },
        ],
      ),
      false,
    );
    expect(lines).toEqual([
      'Bohoslužby, 2026-10-25: 9:00 "Mše svatá v Kuřimi" doubles "Mše", "Mše sv.": remove them by hand',
    ]);
  });

  it("says there is nothing to do", () => {
    expect(servicesLines(plan([]), false)).toEqual(["Bohoslužby: nothing to do."]);
  });

  it("gives only the reports as the lines that need a person, and none when there is none", () => {
    expect(servicesProblemLines(full)).toEqual([
      'Bohoslužby, 2026-10-25: 9:00 "Mše svatá v Kuřimi" doubles "Mše svatá v Kuřimi" (repeating): remove it by hand',
    ]);
    expect(servicesProblemLines(plan([add("2026-10-18", "8:00")]))).toEqual([]);
  });
});
