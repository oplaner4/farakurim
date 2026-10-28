import { describe, expect, it } from "vitest";
import { nativityAlbums, nativitySeasons, oldSiteContestResults } from "./nativity";
import { duplicates, isClock, isSorted } from "@/test/content-checks";
import { clockMinutes } from "@/lib/shared/clock";
import { isIsoDate } from "@/lib/shared/prague";
import { isUpload } from "@/lib/shared/uploads";

describe("Betlémy (nativity.ts)", () => {
  it("lists the seasons once each, newest first, with consecutive editions", () => {
    const years = nativitySeasons.map((s) => s.year);
    expect(duplicates(years)).toEqual([]);
    expect(isSorted(years, (a, b) => a > b)).toBe(true);
    for (const s of nativitySeasons) expect(s.edition, String(s.year)).toBe(s.year - 2019);
  });

  it("opens each season on valid days in order, in December and January after its 1. 11.", () => {
    for (const { year, openingDays } of nativitySeasons) {
      const dates = openingDays.map((d) => d.date);
      const wrong = openingDays.filter(
        (d) =>
          !isIsoDate(d.date) ||
          !isClock(d.from) ||
          !isClock(d.to) ||
          clockMinutes(d.to) <= clockMinutes(d.from) ||
          !(d.date.startsWith(`${year}-12-`) || d.date.startsWith(`${year + 1}-01-`)),
      );
      expect(wrong, String(year)).toEqual([]);
      expect(dates.length, String(year)).toBeGreaterThan(0);
      expect(
        isSorted(dates, (a, b) => a < b),
        String(year),
      ).toBe(true);
    }
  });

  it("gives each season valid dates for the tour, the shared scene and the mass", () => {
    for (const { year, guest, sharedScene, intentionsMass, planUrl } of nativitySeasons) {
      const dates = [sharedScene.from, sharedScene.to, intentionsMass.date, ...(guest?.tour ? [guest.tour.date] : [])];
      expect(
        dates.filter((d) => !isIsoDate(d)),
        String(year),
      ).toEqual([]);
      expect(sharedScene.from <= sharedScene.to, String(year)).toBe(true);
      expect(isClock(intentionsMass.time), String(year)).toBe(true);
      expect(/^\d{3} \d{3} \d{3}$/.test(sharedScene.phone), String(year)).toBe(true);
      expect(isUpload(planUrl), String(year)).toBe(true);
    }
  });

  it("links the photos as uploads of the season's own folder", () => {
    for (const { year, photo, photos, contest } of nativitySeasons) {
      const all = [photo, ...(photos ?? []), ...(contest.results ?? []).map((r) => r.photo)].flatMap((p) =>
        p ? [p.small, p.large] : [],
      );
      expect(
        all.filter((p) => !isUpload(p) || !p.startsWith(`/uploads/betlemy/${year}/`)),
        String(year),
      ).toEqual([]);
      if (photo) expect(photo.alt.trim(), String(year)).not.toBe("");
    }
  });

  it("puts the contest results on a podium of three, by votes", () => {
    for (const { year, contest } of nativitySeasons) {
      if (!contest.results) continue;
      expect(contest.results.length, String(year)).toBe(3);
      expect(
        isSorted(contest.results, (a, b) => a.votes >= b.votes),
        String(year),
      ).toBe(true);
    }
  });

  it("links the albums on the parish's Zonerama profile, newest first", () => {
    const album = /^https:\/\/eu\.zonerama\.com\/FarnostKurim\/Album\/\d+$/;
    expect(nativityAlbums.filter((a) => !album.test(a.url))).toEqual([]);
    expect(isSorted(nativityAlbums, (a, b) => a.year > b.year)).toBe(true);
    expect(isSorted(oldSiteContestResults, (a, b) => a.year > b.year)).toBe(true);
  });
});
