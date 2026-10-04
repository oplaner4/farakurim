// The URL hash of an open lightbox (`#album-pout-foto-3`, `#plakat`): the browser's back button closes it and a
// link can open it. `useLocationHash()` reads it; these helpers change it through the History API, which fires no
// `hashchange`, so they announce the change with their own event.

/** Fired after the helpers below change the hash. */
export const HASH_EVENT = "locationhashchange";

// Whether the current history entry was added by `pushHash()`, so closing goes back instead of adding an entry.
let pushed = false;

function announce() {
  window.dispatchEvent(new Event(HASH_EVENT));
}

/** Adds a history entry with `hash` (`"#plakat"`), e.g. when a lightbox opens. */
export function pushHash(hash: string) {
  window.history.pushState(null, "", hash);
  pushed = true;
  announce();
}

/** Replaces the current entry's hash, e.g. when the lightbox moves to another photo. */
export function replaceHash(hash: string) {
  window.history.replaceState(null, "", hash);
  announce();
}

/** Removes the hash: back to the entry before `pushHash()`, or (opened from a link) in place. */
export function clearHash() {
  if (!window.location.hash) return;
  if (pushed) {
    pushed = false;
    window.history.back();
    return;
  }
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  announce();
}

/** The browser moved through the history itself (back, forward): the entry is no longer ours. */
export function forgetPushedHash() {
  pushed = false;
}
