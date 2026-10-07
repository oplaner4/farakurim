import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A fake `window` with a history stack: enough for the helpers, without a DOM environment.
function fakeWindow(url: string) {
  const entries = [new URL(url, "https://farakurim.cz")];
  let index = 0;
  const go = (to: string, replace: boolean) => {
    const next = new URL(to, entries[index]);
    if (replace) entries[index] = next;
    else entries.splice(++index, entries.length, next);
  };
  const win = {
    get location() {
      return entries[index];
    },
    history: {
      pushState: vi.fn((_: unknown, __: string, to: string) => go(to, false)),
      replaceState: vi.fn((_: unknown, __: string, to: string) => go(to, true)),
      // The real one is asynchronous and fires `popstate`; the tests only need where it lands.
      back: vi.fn(() => {
        index = Math.max(0, index - 1);
      }),
    },
    dispatchEvent: vi.fn(),
    entries: () => entries.length,
  };
  vi.stubGlobal("window", win);
  return win;
}

// `pushed` is module state: each test gets a fresh copy.
const load = () => import("./location-hash");

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("location hash", () => {
  it("goes back to the entry before a pushed hash", async () => {
    const win = fakeWindow("/fotogalerie/?rok=2026");
    const { clearHash, pushHash } = await load();
    pushHash("#album-pout-foto-1");
    expect(win.location.hash).toBe("#album-pout-foto-1");
    expect(win.entries()).toBe(2);

    clearHash();
    expect(win.history.back).toHaveBeenCalledOnce();
    expect(win.location.href).toBe("https://farakurim.cz/fotogalerie/?rok=2026");
  });

  it("replaces the hash in place while the lightbox moves, and still goes back once", async () => {
    const win = fakeWindow("/fotogalerie/");
    const { clearHash, pushHash, replaceHash } = await load();
    pushHash("#album-pout-foto-1");
    replaceHash("#album-pout-foto-2");
    expect(win.location.hash).toBe("#album-pout-foto-2");
    expect(win.entries()).toBe(2);

    clearHash();
    expect(win.history.back).toHaveBeenCalledOnce();
    expect(win.location.hash).toBe("");
  });

  it("removes a hash opened from a link in place, keeping the path and query", async () => {
    const win = fakeWindow("/aktuality/farni-den/?x=1#plakat");
    const { clearHash } = await load();
    clearHash();
    expect(win.history.back).not.toHaveBeenCalled();
    expect(win.location.href).toBe("https://farakurim.cz/aktuality/farni-den/?x=1");
    expect(win.dispatchEvent).toHaveBeenCalledOnce();
  });

  it("does not go back after the visitor moved through the history", async () => {
    const win = fakeWindow("/aktuality/farni-den/");
    const { clearHash, forgetPushedHash, pushHash } = await load();
    pushHash("#plakat");
    forgetPushedHash();
    clearHash();
    expect(win.history.back).not.toHaveBeenCalled();
    expect(win.location.hash).toBe("");
  });

  it("goes back only once for one push", async () => {
    const win = fakeWindow("/fotogalerie/");
    const { clearHash, pushHash } = await load();
    pushHash("#album-pout-foto-1");
    clearHash();
    // Then a link with a hash on the same page (not ours to go back from).
    win.history.replaceState(null, "", "#album-pout-foto-3");
    clearHash();
    expect(win.history.back).toHaveBeenCalledOnce();
    expect(win.location.href).toBe("https://farakurim.cz/fotogalerie/");
  });

  it("does nothing without a hash", async () => {
    const win = fakeWindow("/aktuality/");
    const { clearHash } = await load();
    clearHash();
    expect(win.history.back).not.toHaveBeenCalled();
    expect(win.history.replaceState).not.toHaveBeenCalled();
    expect(win.dispatchEvent).not.toHaveBeenCalled();
  });

  it("announces each change with its own event", async () => {
    const win = fakeWindow("/aktuality/");
    const { HASH_EVENT, pushHash, replaceHash } = await load();
    pushHash("#plakat");
    replaceHash("#plakat-2");
    expect(win.dispatchEvent).toHaveBeenCalledTimes(2);
    expect(win.dispatchEvent.mock.calls.map(([e]) => (e as Event).type)).toEqual([HASH_EVENT, HASH_EVENT]);
  });
});
