import { defineConfig } from "vitest/config";

// Mirror the tsconfig path alias (`@/*` -> repo root) so tests can import
// modules the same way the app does, e.g. `@/lib/guardrails/engine`.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${process.cwd()}/` }],
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
