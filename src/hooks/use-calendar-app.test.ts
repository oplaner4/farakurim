import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let useCalendarApp: typeof import("./use-calendar-app").useCalendarApp;

const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";

// A fresh module per test: it keeps the page's choice.
beforeEach(async () => {
  vi.resetModules();
  ({ useCalendarApp } = await import("./use-calendar-app"));
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("useCalendarApp", () => {
  it("is Google in the prerendered HTML", () => {
    expect(renderToString(createElement(() => useCalendarApp()[0]))).toBe("google");
  });

  it("guesses the app from the device", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(WINDOWS);
    expect(renderHook(() => useCalendarApp()).result.current[0]).toBe("outlook");
  });

  it("remembers the visitor's choice over the guess", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(WINDOWS);
    const { result } = renderHook(() => useCalendarApp());
    act(() => result.current[1]("apple"));
    expect(result.current[0]).toBe("apple");
    expect(localStorage.getItem("calendar-app")).toBe("apple");
    expect(renderHook(() => useCalendarApp()).result.current[0]).toBe("apple");
  });

  it("ignores an unknown stored value", () => {
    localStorage.setItem("calendar-app", "yahoo");
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(WINDOWS);
    expect(renderHook(() => useCalendarApp()).result.current[0]).toBe("outlook");
  });
});
