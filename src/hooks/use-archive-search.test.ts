import { act, renderHook } from "@testing-library/react";
import type { SetValues } from "nuqs";
import type { ChangeEvent, SubmitEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { archiveParams } from "@/lib/news/query-params";
import { useArchiveSearch } from "./use-archive-search";

/** The hook on `?q=` `query`; `setParams` re-renders it with the new query, as nuqs does. */
function setup(withSetParams = true) {
  const setParams = vi.fn<SetValues<typeof archiveParams>>((values) => {
    if (values && typeof values === "object") rerender({ query: values.query ?? "" });
    return Promise.resolve(new URLSearchParams());
  });
  const { result, rerender } = renderHook(
    ({ query }: { query: string }) => useArchiveSearch(query, withSetParams ? setParams : undefined),
    { initialProps: { query: "" } },
  );
  return { result, rerender, setParams };
}

const typed = (value: string) => ({ target: { value } }) as ChangeEvent<HTMLInputElement>;
const submit = () => ({ preventDefault: vi.fn() }) as unknown as SubmitEvent<HTMLFormElement>;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useArchiveSearch", () => {
  it("puts every keystroke in the field and the URL, and resets the page", () => {
    const { result, setParams } = setup();
    act(() => result.current.onChange(typed("pou")));
    expect(setParams).toHaveBeenLastCalledWith({ query: "pou", page: null });
    expect(result.current.value).toBe("pou");
    act(() => result.current.onChange(typed("")));
    expect(setParams).toHaveBeenLastCalledWith({ query: null, page: null });
  });

  it("searches the list only after a short pause", () => {
    const { result } = setup();
    act(() => result.current.onChange(typed("pout")));
    expect(result.current.search).toBe("");
    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(result.current.search).toBe("");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.search).toBe("pout");
  });

  it("searches at once on Enter, without submitting the form", () => {
    const { result } = setup();
    act(() => result.current.onChange(typed("pout")));
    const e = submit();
    act(() => result.current.onSubmit(e));
    expect(e.preventDefault).toHaveBeenCalled();
    expect(result.current.search).toBe("pout");
  });

  it("shows the whole list at once when the field is emptied", () => {
    const { result } = setup();
    act(() => result.current.onChange(typed("pout")));
    act(() => {
      vi.advanceTimersByTime(250);
    });
    act(() => result.current.onChange(typed("")));
    expect(result.current.search).toBe("");
  });

  it("clears the search and puts the focus back in the field", () => {
    const { result, setParams } = setup();
    const input = document.body.appendChild(document.createElement("input"));
    result.current.inputRef.current = input;
    act(() => result.current.onChange(typed("pout")));
    act(() => result.current.clear());
    expect(setParams).toHaveBeenLastCalledWith({ query: null, page: null });
    expect(result.current.value).toBe("");
    expect(document.activeElement).toBe(input);
    input.remove();
  });

  it("submits the form as usual before the list reads the URL", () => {
    const { result } = setup(false);
    const e = submit();
    act(() => result.current.onSubmit(e));
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});
