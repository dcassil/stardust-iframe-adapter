import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { demoAliases, demoDedupe } from "./shared/aliases";

/**
 * Vitest config for the demo workspace (store unit tests + admin component
 * tests). Separate from the library's root vitest config so the two test suites
 * stay independent. Reuses the shared demo aliases so `@stardust-cms/*`,
 * `@demo/shared/*`, and the frame-link peers resolve identically to the apps.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: demoAliases,
    dedupe: demoDedupe,
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["demo/**/*.test.ts", "demo/**/*.test.tsx"],
    setupFiles: ["demo/vitest.setup.ts"],
  },
});
