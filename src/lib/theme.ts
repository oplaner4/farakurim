/*
 * Theme override: <html data-theme="light|dark">, saved in localStorage. Without it the page follows
 * `prefers-color-scheme` (the `dark` variant in globals.css handles both cases).
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

/** Runs in <head> before the first paint, so a saved theme never flashes. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})()`;

const darkQuery = "(prefers-color-scheme: dark)";

export function isDarkTheme(): boolean {
  const override = document.documentElement.dataset.theme;
  if (override === "light" || override === "dark") return override === "dark";
  return window.matchMedia(darkQuery).matches;
}

/** Notifies on OS theme changes and on `data-theme` changes (this tab or another one). */
export function subscribeTheme(onChange: () => void): () => void {
  const media = window.matchMedia(darkQuery);
  const observer = new MutationObserver(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_STORAGE_KEY) return;
    if (e.newValue === "light" || e.newValue === "dark") document.documentElement.dataset.theme = e.newValue;
    else delete document.documentElement.dataset.theme;
  };
  media.addEventListener("change", onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener("storage", onStorage);
  return () => {
    media.removeEventListener("change", onChange);
    observer.disconnect();
    window.removeEventListener("storage", onStorage);
  };
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode): the choice lasts until the page is reloaded.
  }
}
