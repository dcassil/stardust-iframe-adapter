import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * SIFR-T-0011 — overlay alignment + live content injection E2E.
 *
 * Guards the initiative's two headline criteria against the locally-served demo
 * pair: (1) overlay geometry stays aligned to targets under resize and iframe
 * scroll, and (2) an edit updates the iframe content AND the overlay geometry
 * (live injection). Uses a small pixel tolerance for cross-frame scale math and
 * waits for the connected state + settled geometry rather than fixed sleeps.
 */

const SITE_FRAME = 'iframe[title="Demo site preview"]';
/** Cross-frame scale/offset math needs a small tolerance. */
const TOL = 3;

/** Wait for the admin to connect and overlays to appear. */
async function waitConnected(page: Page): Promise<void> {
  await expect(page.locator(".admin-status")).toHaveAttribute(
    "data-state",
    "connected",
    { timeout: 20_000 },
  );
  // Overlays for the flat targets should be present.
  await expect(page.locator('[data-target-id="hero"]')).toBeVisible();
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function boxOf(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox();
  if (!b) throw new Error("no bounding box");
  return b;
}

/** Assert the overlay box for `targetId` tracks the iframe element box. */
async function expectAligned(page: Page, targetId: string): Promise<void> {
  const overlay = await boxOf(page.locator(`[data-target-id="${targetId}"]`));
  const inFrame = await boxOf(
    page.frameLocator(SITE_FRAME).locator(`#${cssEscape(targetId)}`),
  );
  expect(Math.abs(overlay.x - inFrame.x)).toBeLessThanOrEqual(TOL);
  expect(Math.abs(overlay.y - inFrame.y)).toBeLessThanOrEqual(TOL);
  expect(Math.abs(overlay.width - inFrame.width)).toBeLessThanOrEqual(TOL);
  expect(Math.abs(overlay.height - inFrame.height)).toBeLessThanOrEqual(TOL);
}

/** CSS.escape for ids that contain a dot (e.g. `split-col.1`). */
function cssEscape(id: string): string {
  return id.replace(/\./g, "\\.");
}

test.describe("overlay alignment + live injection", () => {
  test("overlays align to targets, and stay aligned under resize and scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitConnected(page);
    // Let geometry settle after connect.
    await page.waitForTimeout(500);

    // 1. Aligned on connect (flat targets + a nested container child).
    for (const id of ["hero", "intro", "showcase", "features"]) {
      await expectAligned(page, id);
    }
    await expectAligned(page, "split-col.1");

    // 2. Under resize: scale changes; overlays remain aligned.
    await page.setViewportSize({ width: 980, height: 900 });
    await page.waitForTimeout(500);
    await expectAligned(page, "hero");
    await expectAligned(page, "features");
    await expectAligned(page, "split-col.1");

    // 3. Under iframe scroll: overlays stay glued to targets.
    await page
      .frameLocator(SITE_FRAME)
      .locator("body")
      .evaluate(() => {
        window.scrollTo(0, 250);
      });
    await page.waitForTimeout(500);
    await expectAligned(page, "features");
    await expectAligned(page, "split-col.1");
  });

  test("editing the hero text updates the iframe content and keeps the overlay aligned", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitConnected(page);
    await page.waitForTimeout(500);

    // Select the hero title item overlay (top-most content item).
    const heroItem = page.locator('.ov-item[data-content-id="hero-title"]');
    await heroItem.click();

    // Edit the text in the side panel.
    const field = page.getByTestId("panel-text");
    await expect(field).toBeVisible();
    const NEW_TEXT = "E2E LIVE EDIT";
    await field.fill(NEW_TEXT);

    // The iframe content reflects the edit.
    await expect(
      page.frameLocator(SITE_FRAME).locator("#hero-title"),
    ).toHaveText(NEW_TEXT, { timeout: 10_000 });

    // The hero overlay remains aligned to the (re-rendered) hero target.
    await page.waitForTimeout(300);
    await expectAligned(page, "hero");
  });
});
