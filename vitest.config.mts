import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Two projects: the site (its logic and content data), which gates a release, and the content tooling in scripts/,
  // which no release needs, as nothing it does ends up in out/. `pnpm test` runs both.
  test: {
    projects: [
      { test: { name: "site", include: ["src/**/*.test.ts"] } },
      { test: { name: "scripts", include: ["scripts/**/*.test.ts"] } },
    ],
  },
});
