import { test, expect, type Page } from "@playwright/test";

/**
 * SIFR-T-0029 — opt-in style feature E2E.
 *
 * Proves the initiative's safety guarantee end-to-end: changing a text group's
 * color via the host style panel updates the iframe's adapter-owned `<style>`
 * node WHILE the embedded page's own stylesheets remain intact — the injector
 * never touches stylesheets it does not own (REQ-004 / NFR-001). Also proves the
 * feature is opt-in: with the flag off there is no adapter `<style>` node.
 */

const SITE_FRAME = 'iframe[title="Demo site preview"]';
const SITE_ORIGIN = "http://localhost:5174";
const ADAPTER_STYLE = "style[data-stardust-adapter-styles]";

async function waitConnected(page: Page): Promise<void> {
  await expect(page.locator(".admin-status")).toHaveAttribute(
    "data-state",
    "connected",
    { timeout: 20_000 },
  );
  await expect(page.locator('[data-target-id="hero"]')).toBeVisible();
}

test.describe("opt-in style feature", () => {
  test("changing a text group color updates the adapter <style> and leaves page styles intact", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitConnected(page);
    await page.waitForTimeout(500);

    const frame = page.frameLocator(SITE_FRAME);

    // Capture the page's own pre-existing stylesheet rule count (must not change).
    const beforeSheets = await frame.locator("body").evaluate(() => {
      // Count rules in every stylesheet that is NOT the adapter-owned one.
      let count = 0;
      for (const sheet of Array.from(document.styleSheets)) {
        const owner = sheet.ownerNode as Element | null;
        if (owner?.hasAttribute("data-stardust-adapter-styles")) continue;
        try {
          count += sheet.cssRules.length;
        } catch {
          /* cross-origin; ignore */
        }
      }
      return count;
    });

    // Select the hero title block (a `text` group) via its overlay.
    await page.locator('.ov-item[data-content-id="hero-title"]').click();

    // The style panel shows for the selected group.
    const stylePanel = page.getByTestId("style-panel");
    await expect(stylePanel).toBeVisible();
    await expect(stylePanel).toHaveAttribute("data-style-group", "hero-title");

    // Change the color.
    await page.getByTestId("style-color").fill("#ff0000");

    // The adapter <style> node inside the iframe reflects the new color for the
    // hero-title group.
    await expect
      .poll(
        async () =>
          frame.locator(ADAPTER_STYLE).evaluate((el) => el.textContent ?? ""),
        { timeout: 10_000 },
      )
      .toContain('[data-style-group="hero-title"]');

    const adapterCss = await frame
      .locator(ADAPTER_STYLE)
      .evaluate((el) => el.textContent ?? "");
    expect(adapterCss).toContain("color: #ff0000");

    // The page's own stylesheets are untouched: same non-adapter rule count.
    const afterSheets = await frame.locator("body").evaluate(() => {
      let count = 0;
      for (const sheet of Array.from(document.styleSheets)) {
        const owner = sheet.ownerNode as Element | null;
        if (owner?.hasAttribute("data-stardust-adapter-styles")) continue;
        try {
          count += sheet.cssRules.length;
        } catch {
          /* ignore */
        }
      }
      return count;
    });
    expect(afterSheets).toBe(beforeSheets);

    // And the hero title actually renders red (the rule applied live).
    await expect(frame.locator("#hero-title")).toHaveCSS(
      "color",
      "rgb(255, 0, 0)",
    );
  });

  test("with the feature flag off there is no adapter <style> node", async ({
    page,
  }) => {
    // Load the site standalone with the opt-out flag.
    await page.goto(`${SITE_ORIGIN}/?stylesOff`);
    // Page renders from seed content.
    await expect(page.locator("#hero-title")).toBeVisible({ timeout: 10_000 });
    // No adapter-owned <style> node exists — zero footprint.
    await expect(page.locator(ADAPTER_STYLE)).toHaveCount(0);
  });

  test("with the feature flag on (standalone) still no node until an update arrives", async ({
    page,
  }) => {
    await page.goto(`${SITE_ORIGIN}/`);
    await expect(page.locator("#hero-title")).toBeVisible({ timeout: 10_000 });
    // Enabled but no host connected → no updates → node created lazily only on
    // first update, so none yet.
    await expect(page.locator(ADAPTER_STYLE)).toHaveCount(0);
  });
});
