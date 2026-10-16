import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEscapeFirst } from "./use-escape-first";

const page = vi.fn();
afterEach(() => {
  document.removeEventListener("keydown", page);
  page.mockClear();
});

/** A key pressed on the page, which listens on `document` like the lightbox. */
function press(key: string) {
  document.addEventListener("keydown", page);
  document.body.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("useEscapeFirst", () => {
  it("keeps an Esc it takes from the page", () => {
    const onEscape = vi.fn(() => true);
    renderHook(() => useEscapeFirst(onEscape));
    press("Escape");
    expect(onEscape).toHaveBeenCalledOnce();
    expect(page).not.toHaveBeenCalled();
  });

  it("passes on an Esc it leaves and every other key", () => {
    const onEscape = vi.fn(() => false);
    renderHook(() => useEscapeFirst(onEscape));
    press("Escape");
    press("ArrowRight");
    expect(onEscape).toHaveBeenCalledOnce();
    expect(page).toHaveBeenCalledTimes(2);
  });

  it("stops listening once unmounted", () => {
    const onEscape = vi.fn(() => true);
    renderHook(() => useEscapeFirst(onEscape)).unmount();
    press("Escape");
    expect(onEscape).not.toHaveBeenCalled();
    expect(page).toHaveBeenCalledOnce();
  });
});
