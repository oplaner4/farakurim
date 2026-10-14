// Stands in for the `server-only` package in the tests (vitest.config.mts): the package throws outside a React Server
// Component, so a test could not import the build-time code in src/server/ otherwise.

export {};
