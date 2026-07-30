import { test, expect, type Page } from "@playwright/test";

/**
 * SIFR-T-0025 — presence two-tab scenario (mock BroadcastChannel adapter).
 *
 * PRESENCE / EDIT-LOCKS ONLY. Two tabs of the admin (same origin, so the real
 * `BroadcastChannel` fans presence between them) run with the flag enabled.
 * Moving the pointer in tab A must render a labeled remote cursor in tab B;
 * selecting a target in tab A must render an "editing" lock indicator on that
 * target in tab B. No UI copy may say "collaboration".
 */

const SITE_FRAME = 'iframe[title="Demo site preview"]';

async function waitConnected(page: Page): Promise<void> {
  await expect(page.locator(".admin-status")).toHaveAttribute(
    "data-state",
    "connected",
    { timeout: 25_000 },
  );
  await expect(page.locator('[data-target-id="hero"]')).toBeVisible();
}

test("two tabs: remote cursor and edit-lock appear via the mock adapter", async ({
  browser,
}) => {
  // Same context so the two pages share an origin and the BroadcastChannel bus.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const tabA = await context.newPage();
  const tabB = await context.newPage();

  await tabA.goto("/");
  await tabB.goto("/");
  await waitConnected(tabA);
  await waitConnected(tabB);
  // Let both providers connect + exchange joins.
  await tabA.waitForTimeout(500);

  // 1. Move the pointer in A across the canvas; nudge repeatedly so the
  //    throttled publisher emits and B receives.
  const canvasA = tabA.locator(".admin-canvas");
  const boxA = await canvasA.boundingBox();
  if (!boxA) throw new Error("no canvas box in tab A");
  for (let i = 0; i < 8; i++) {
    await tabA.mouse.move(boxA.x + 200 + i * 5, boxA.y + 150 + i * 5);
    await tabA.waitForTimeout(60);
  }

  // 2. B shows a remote cursor with A's label. Assert on the label chip (the
  //    cursor wrapper itself is a 0x0 anchor, so we check the sized label).
  const cursorLabelB = tabB
    .locator("[data-presence-cursor] [data-presence-cursor-label]")
    .first();
  await expect(cursorLabelB).toBeVisible({ timeout: 15_000 });
  const cursorLabel = await cursorLabelB.textContent();
  expect(cursorLabel && cursorLabel.length > 0).toBeTruthy();

  // 3. Select the hero target in A. Clicking the hero content item still
  //    resolves to `onSelect("hero", ...)`, so the edit-context target is hero.
  await tabA.locator('.ov-item[data-content-id="hero-title"]').click();

  // 4. B shows an "editing" lock indicator on hero.
  const lockB = tabB.locator('[data-presence-lock="hero"]');
  await expect(lockB).toBeVisible({ timeout: 15_000 });
  await expect(lockB).toContainText("is editing");

  // 5. No "collaboration" copy anywhere in either UI.
  const textA = (await tabA.locator("body").innerText()).toLowerCase();
  const textB = (await tabB.locator("body").innerText()).toLowerCase();
  expect(textA).not.toContain("collaborat");
  expect(textB).not.toContain("collaborat");

  await context.close();
});
