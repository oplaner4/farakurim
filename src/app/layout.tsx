import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

// Weight 300 (oxygen-latin-ext-300.woff2) is available but unused; add it here when a design needs it.
const oxygen = localFont({
  src: [
    { path: "../fonts/oxygen-latin-ext-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/oxygen-latin-ext-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-oxygen",
  fallback: ["Segoe UI", "Helvetica Neue", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Římskokatolická farnost Kuřim",
  description:
    "Farnost Kuřim, Moravské Knínice, Jinačovice a Česká: nejbližší mše svatá, pořad bohoslužeb, aktuality, fotogalerie a farní zpravodaj Petrklíč.",
};

export const viewport: Viewport = {
  themeColor: "#1D71B7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script may set data-theme before hydration.
    <html lang="cs" className={oxygen.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
