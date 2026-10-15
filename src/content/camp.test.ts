import { isMatch } from "date-fns";
import { describe, expect, it } from "vitest";
import { campContacts, campHero, campQuotes, campTeam, campYears, nextCamp } from "./camp";
import { duplicates, isSorted } from "@/test/content-checks";
import { isUpload } from "@/lib/shared/uploads";

const isDate = (date: string) => isMatch(date, "yyyy-MM-dd");

describe("Tábor (camp.ts)", () => {
  it("lists the years once each, newest first, each with valid dates in its own year", () => {
    const years = campYears.map((y) => y.year);
    expect(duplicates(years)).toEqual([]);
    expect(isSorted(years, (a, b) => a > b)).toBe(true);
    const wrong = campYears.filter(
      (y) =>
        !isDate(y.start) || !isDate(y.end) || y.end < y.start || !y.start.startsWith(`${y.year}-`) || !y.place.trim(),
    );
    expect(wrong.map((y) => y.year)).toEqual([]);
  });

  it("links each year's album and cover on the parish's Zonerama profile", () => {
    const album = /^https:\/\/eu\.zonerama\.com\/FarnostKurim\/Album\/\d+$/;
    const cover = /^https:\/\/eu\.zonerama\.com\/photos\/\d+_800x\d+_18\.jpg$/;
    const wrong = campYears.filter((y) => (y.album && !album.test(y.album)) || (y.cover && !cover.test(y.cover)));
    expect(wrong.map((y) => y.year)).toEqual([]);
  });

  it("comes after the last year listed", () => {
    expect(nextCamp.year).toBeGreaterThan(campYears[0].year);
    expect(Boolean(nextCamp.start)).toBe(Boolean(nextCamp.end));
  });

  it("gives each team member a first name, a bio and uploaded photos", () => {
    const { members } = campTeam;
    expect(duplicates(members.map((m) => m.name))).toEqual([]);
    expect(members.filter((m) => !m.name.trim() || /\s\p{L}{2,}/u.test(m.name) || !m.bio.trim())).toEqual([]);
    const photos = members.flatMap((m) => (m.photo ? [m.photo.small, m.photo.large] : []));
    expect(photos.filter((p) => !isUpload(p))).toEqual([]);
    expect([campHero.src, campHero.small].filter((p) => !isUpload(p))).toEqual([]);
  });

  it("quotes each participant once and reaches each contact by phone and e-mail", () => {
    expect(duplicates(campQuotes.map((q) => q.name))).toEqual([]);
    expect(campContacts.people.filter((p) => !/^\d{3} \d{3} \d{3}$/.test(p.phone ?? "") || !p.email)).toEqual([]);
  });
});
