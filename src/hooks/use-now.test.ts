import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { at } from "@/test/fixtures";
import { useHydrated, useNow, useToday } from "./use-now";

const BUILT = at("2026-10-01");

/** The HTML a component showing `value()` prerenders to, as `next build` does. */
const prerendered = (value: () => unknown) => renderToString(createElement(() => String(value())));

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(at("2026-10-14", "10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useNow", () => {
  it("is the build time in the prerendered HTML and the visitor's time in the browser", () => {
    expect(prerendered(() => useNow(BUILT))).toBe(String(BUILT));
    expect(renderHook(() => useNow(BUILT)).result.current).toBe(at("2026-10-14", "10:00"));
  });

  it("ticks every 20 seconds", () => {
    const { result } = renderHook(() => useNow(BUILT));
    act(() => {
      vi.advanceTimersByTime(19_999);
    });
    expect(result.current).toBe(at("2026-10-14", "10:00"));
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(at("2026-10-14", "10:00") + 20_000);
  });

  it("catches up at once when the tab becomes visible again", () => {
    const { result } = renderHook(() => useNow(BUILT));
    // A hidden tab's timers may not run: the clock moves on without a tick.
    vi.setSystemTime(at("2026-10-14", "15:00"));
    act(() => setVisibility("hidden"));
    expect(result.current).toBe(at("2026-10-14", "10:00"));
    act(() => setVisibility("visible"));
    expect(result.current).toBe(at("2026-10-14", "15:00"));
  });

  it("shares one timer and stops it when the last component unmounts", () => {
    const first = renderHook(() => useNow(BUILT));
    const second = renderHook(() => useNow(BUILT));
    expect(vi.getTimerCount()).toBe(1);
    first.unmount();
    expect(vi.getTimerCount()).toBe(1);
    second.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("useToday", () => {
  it("is the build day in the prerendered HTML and the visitor's day in the browser", () => {
    expect(prerendered(() => useToday(BUILT))).toBe("2026-10-01");
    expect(renderHook(() => useToday(BUILT)).result.current).toBe("2026-10-14");
  });

  it("changes at midnight in Prague and re-renders only then", () => {
    vi.setSystemTime(at("2026-10-14", "23:59"));
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return useToday(BUILT);
    });
    const before = renders;
    act(() => {
      vi.advanceTimersByTime(40_000);
    });
    expect(result.current).toBe("2026-10-14");
    expect(renders).toBe(before);
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(result.current).toBe("2026-10-15");
    expect(renders).toBe(before + 1);
  });
});

describe("useHydrated", () => {
  it("is false in the prerendered HTML and true in the browser", () => {
    expect(prerendered(useHydrated)).toBe("false");
    expect(renderHook(useHydrated).result.current).toBe(true);
  });
});
