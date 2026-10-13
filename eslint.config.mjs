import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Static export has no image optimizer, and the carousel needs <picture> art direction.
      "@next/next/no-img-element": "off",
      // `const { body, ...rest } = event` drops fields before they are passed to a client component.
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
      // Object shapes are `type` aliases, never `interface`.
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      // Flags a function with too many branches to follow; split it into named steps.
      complexity: ["warn", 15],
    },
  },
  {
    // A component's optional blocks (`{x && <Block />}`) each count as a branch.
    files: ["**/*.tsx"],
    rules: { complexity: ["warn", 20] },
  },
  {
    // Typed linting, for the deprecated APIs (`@deprecated` in their types).
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: { parserOptions: { projectService: true } },
    rules: { "@typescript-eslint/no-deprecated": "warn" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
