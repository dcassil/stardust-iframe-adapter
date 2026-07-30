import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the PRESENCE two-tab scenario (SIFR-T-0025).
 *
 * Separate from the base E2E config because it must start the admin dev server
 * with the presence flag ENABLED (`VITE_PRESENCE_ENABLED=true`). The base demo
 * and its overlay-alignment spec run with presence OFF (the default), so the
 * flag's off-path stays the proven baseline.
 */
export default defineConfig({
  testDir: ".",
  testMatch: /presence\.e2e\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npx vite --config demo/site/vite.config.ts demo/site",
      url: "http://localhost:5174",
      cwd: repoRoot(),
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command:
        "VITE_PRESENCE_ENABLED=true npx vite --config demo/admin/vite.config.ts demo/admin",
      url: "http://localhost:5173",
      cwd: repoRoot(),
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});

/** Repo root (two levels up from demo/e2e). `fileURLToPath` decodes %20 etc. */
function repoRoot(): string {
  return fileURLToPath(new URL("../../", import.meta.url));
}
