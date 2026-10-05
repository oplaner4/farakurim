"use client";

import { environmentManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// The browser's reads (Google Calendar, the day's verse) go through TanStack Query. Each is read once per page
// load: the data doesn't change while the page is open, and a failed read keeps the prerendered content, so
// nothing is retried (the calendar reads a failed range again when it is shown again).
const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false } } });

let browserQueryClient: QueryClient | undefined;

/** One client in the browser; the prerender gets a fresh one per page. */
function getQueryClient() {
  if (environmentManager.isServer()) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
