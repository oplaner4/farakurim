import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BibleQuote } from "@/content/types/layout";
import { jsonResponse } from "@/test/fetch";
import { at } from "@/test/fixtures";
import { useTodaysQuote } from "./use-todays-quote";

const built: BibleQuote = { date: "2026-10-13", text: "Pokoj Boží…", reference: "Fp 4,7" };
const todays: BibleQuote = { date: "2026-10-14", text: "Radujte se v Pánu vždycky.", reference: "Fp 4,4" };

/** The proxy answering `body` as JSON. */
const json =
  (body: unknown, status = 200) =>
  () =>
    Promise.resolve(jsonResponse(body, status));

/** The hook with the proxy answering `answer`, with a fresh query cache that does not retry. */
function setup(answer: () => Promise<Response>, initial = built) {
  vi.stubGlobal("fetch", vi.fn(answer));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const hook = renderHook(() => useTodaysQuote(initial), { wrapper });
  /** Waits until the proxy was asked and its answer applied. */
  const settled = () =>
    waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      expect(client.isFetching()).toBe(0);
    });
  return { ...hook, settled };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-10-14", "7:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useTodaysQuote", () => {
  it("shows the build's verse, then the proxy's verse of the visitor's day", async () => {
    const { result } = setup(json(todays));
    expect(result.current).toBe(built);
    await waitFor(() => expect(result.current).toEqual(todays));
    expect(fetch).toHaveBeenCalledWith("/biblicky-citat.php");
  });

  it("asks nothing when the build's verse is already today's", async () => {
    const { result } = setup(json(todays), todays);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current).toBe(todays);
  });

  it("keeps the build's verse when the proxy fails or answers something else", async () => {
    for (const answer of [
      json(todays, 500),
      () => Promise.resolve(new Response("<?php echo 'zdroj';", { status: 200 })),
      json({ date: "2026-10-14", text: "" }),
      () => Promise.reject(new TypeError("offline")),
    ]) {
      const { result, unmount, settled } = setup(answer);
      await settled();
      expect(result.current).toBe(built);
      unmount();
    }
  });

  it("never goes back to an older verse than the build's", async () => {
    const { result, settled } = setup(json({ ...todays, date: "2026-10-12" }));
    await settled();
    expect(result.current).toBe(built);
  });
});
