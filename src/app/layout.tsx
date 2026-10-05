import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { QueryProvider } from "@/components/layout/QueryProvider";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SITE_URL } from "@/content/site";
import "@/styles/globals.css";

// Farnost Sans is Oxygen with fixed caron letters (scripts/build-fonts.py); the OFL forbids the name "Oxygen" on it.
// Weight 300 (farnost-sans-300.woff2) is available but unused; add it here when a design needs it.
const farnostSans = localFont({
  src: [
    { path: "../fonts/farnost-sans-300.woff2", weight: "300", style: "normal" },
    { path: "../fonts/farnost-sans-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/farnost-sans-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-farnost-sans",
  fallback: ["Segoe UI", "Helvetica Neue", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Římskokatolická farnost Kuřim", template: "%s | Římskokatolická farnost Kuřim" },
  description:
    "Farnost Kuřim, Moravské Knínice, Jinačovice a Česká: nejbližší mše svatá, pořad bohoslužeb, aktuality, fotogalerie a farní zpravodaj Petrklíč.",
};

export const viewport: Viewport = {
  themeColor: "#1D71B7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes' inline script sets data-theme before hydration.
    <html lang="cs" className={farnostSans.variable} suppressHydrationWarning>
      <body>
        {/*
          Theme override: <html data-theme="light|dark">, saved in localStorage ("theme") and synced across tabs.
          Without JS no attribute is set and the `dark` variant in globals.css follows `prefers-color-scheme`.
          globals.css also sets `color-scheme`, so next-themes doesn't.
        */}
        <ThemeProvider attribute="data-theme" enableColorScheme={false} disableTransitionOnChange>
          <a
            href="#obsah"
            className="sr-only z-50 rounded-12 bg-blue px-4 py-2.5 font-bold text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:text-white"
          >
            Přejít na obsah
          </a>
          {/* Each page renders <SiteHeader> (it marks the current page) and <main id="obsah">. */}
          <QueryProvider>
            <NuqsAdapter>{children}</NuqsAdapter>
            <SiteFooter />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
