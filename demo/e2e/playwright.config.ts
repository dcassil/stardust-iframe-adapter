import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the demo E2E (SIFR-T-0011).
 *
 * Serves the demo pair via `webServer` (the same Vite dev servers the
 * `npm run demo` command starts, on the explicit localhost origins 5173/5174),
 * then runs the specs headless against the admin at 5173. CI-runnable.
 */
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "npx vite --config demo/site/vite.config.ts demo/site",
      url: "http://localhost:5174",
      cwd: fileURLToRepoRoot(),
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npx vite --config demo/admin/vite.config.ts demo/admin",
      url: "http://localhost:5173",
      cwd: fileURLToRepoRoot(),
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});

/** Repo root (two levels up from demo/e2e). */
function fileURLToRepoRoot(): string {
  return new URL("../../", import.meta.url).pathname;
}
