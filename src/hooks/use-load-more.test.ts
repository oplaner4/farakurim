// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import type { MouseEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLoadMore } from "./use-load-more";

/** A click on "Načíst další"; `extra` sets the button or a modifier key. */
const click = (extra: Partial<MouseEvent<HTMLAnchorElement>> = {}) =>
  ({
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...extra,
  }) as unknown as MouseEvent<HTMLAnchorElement>;

/** The hook on page `page`; `setPage` re-renders it on the new page, as nuqs does. */
function setup(withSetPage = true) {
  const setPage = vi.fn((page: number): void => rerender({ page }));
  const { result, rerender } = renderHook(
    ({ page }: { page: number }) => useLoadMore(page, withSetPage ? setPage : undefined),
    {
      initialProps: { page: 1 },
    },
  );
  return { result, setPage };
}

beforeEach(() => {
  document.body.innerHTML = '<a id="aktualita-11" href="/aktuality/x/">Nová</a>';
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("useLoadMore", () => {
  it("loads the next page in place and focuses its first new item once it is shown", () => {
    const { result, setPage } = setup();
    const e = click();
    act(() => result.current(e, "aktualita-11"));
    expect(e.preventDefault).toHaveBeenCalled();
    expect(setPage).toHaveBeenCalledWith(2);
    expect(document.activeElement?.id).toBe("aktualita-11");
  });

  it("leaves a middle click or a click with a modifier key to the browser", () => {
    const { result, setPage } = setup();
    for (const e of [click({ button: 1 }), click({ ctrlKey: true }), click({ metaKey: true })]) {
      act(() => result.current(e, "aktualita-11"));
      expect(e.preventDefault).not.toHaveBeenCalled();
    }
    expect(setPage).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);
  });

  it("follows the link before the list reads the URL", () => {
    const { result } = setup(false);
    const e = click();
    act(() => result.current(e, "aktualita-11"));
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});
