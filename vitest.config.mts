import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path("./src"),
      // The real package throws outside a React Server Component; the build-time code in src/server/ imports it.
      "server-only": path("./src/test/server-only.ts"),
    },
  },
  // The site (its logic and content data, and its hooks in a browser-like jsdom), which gates a release, and the content
  // tooling in scripts/, which no release needs, as nothing it does ends up in out/. `pnpm test` runs all three.
  test: {
    projects: [
      { test: { name: "site", include: ["src/**/*.test.ts"], exclude: ["src/hooks/**"] } },
      {
        test: {
          name: "hooks",
          include: ["src/hooks/**/*.test.ts"],
          environment: "jsdom",
          setupFiles: ["./src/test/setup-hooks.ts"],
        },
      },
      { test: { name: "scripts", include: ["scripts/**/*.test.ts"] } },
    ],
  },
});
