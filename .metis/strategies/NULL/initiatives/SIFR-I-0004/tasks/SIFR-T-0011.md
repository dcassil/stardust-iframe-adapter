---
id: playwright-e2e-for-overlay
level: task
title: "Playwright E2E For Overlay Alignment And Live Content Injection"
short_code: "SIFR-T-0011"
created_at: 2026-07-30T16:02:14.749498+00:00
updated_at: 2026-07-30T17:40:02.871960+00:00
parent: SIFR-I-0004
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/active"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0004
---

# Playwright E2E For Overlay Alignment And Live Content Injection

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0004]]

## Objective **[REQUIRED]**

Write the Playwright end-to-end test that guards the initiative's two headline success criteria: overlay geometry alignment under window resize and iframe scroll, and live content injection. This demo is the end-to-end integration surface for SIFR-I-0002 (iframe streaming) + SIFR-I-0003 (host mapping); this test is the automated guard against alignment regressions (which regress easily) and the live-injection flow. It runs against the locally served demo pair and is CI-headless-runnable.

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] A Playwright test suite loads the admin (with the demo site embedded) against the locally served demo pair.
- [ ] Test: overlays appear over each target after connect; asserted by comparing overlay bounding boxes against target positions within a small tolerance.
- [ ] Test: performing an edit (via panel or overlay control) updates the iframe content AND the overlay geometry — live-injection flow asserted end to end.
- [ ] Test: resizing the browser window changes the iframe scale and overlays remain aligned to targets and container children (alignment-under-resize).
- [ ] Test: scrolling the iframe content keeps overlays glued to their targets (alignment-under-scroll).
- [ ] The suite uses a seeded in-memory content fixture for determinism.
- [ ] The suite runs headless in CI and passes locally against `npm run demo` (or the test-serve equivalent).

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: Alignment under resize and scroll
- **Test ID**: TC-001
- **Preconditions**: Demo pair served; seeded fixture loaded.
- **Steps**:
  1. Load the admin; wait for connected state and overlays.
  2. Capture overlay vs target bounding boxes.
  3. Resize the viewport; re-capture.
  4. Scroll the iframe content; re-capture.
- **Expected Results**: Overlay boxes track target/child boxes within tolerance in all three captures.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

### Test Case 2: Live content injection
- **Test ID**: TC-002
- **Preconditions**: Connected; seeded fixture.
- **Steps**:
  1. Edit the hero text via the side panel.
  2. Assert the iframe DOM text and the hero overlay geometry.
- **Expected Results**: Iframe content reflects the edit; overlay remains aligned to the (possibly resized) hero.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

## Implementation Notes **[CONDITIONAL: Technical Task]**

Recommended Agent: opus + medium

### Technical Approach
Add Playwright to the demo workspace with a config that serves the demo pair (reuse the SIFR-T-0012 startup or a dedicated test-serve). Use `frameLocator` to reach into the iframe DOM to assert injected content. Compare overlay bounding boxes (from the admin document) against target bounding boxes (from the iframe, adjusted for scale/offset) within a pixel tolerance. Drive resize via `page.setViewportSize` and scroll via evaluating scroll on the iframe content. Seed the in-memory store with a fixed fixture for determinism. Ensure the config runs headless for CI.

### Dependencies
- SIFR-T-0007, SIFR-T-0008, SIFR-T-0009, SIFR-T-0010 must be functional (this is the integration guard over all of them).
- SIFR-T-0012 startup command (or a test-serve variant) to bring up the pair.
- Exercises SIFR-I-0002 streaming + SIFR-I-0003 `mapGeometry` end to end.

### Risk Considerations
- Cross-frame coordinate math (scale + offset) is the main source of flakiness; use a tolerance and stable waits (wait for connected + geometry settled) rather than fixed sleeps.
- Keep the fixture seeded and deterministic so CI runs are stable.

## Status Updates **[REQUIRED]**

### Completion notes

Wrote the Playwright E2E under `demo/e2e/` — config + one spec with two tests — runnable via `npm run demo:e2e` (`playwright test -c demo/e2e/playwright.config.ts`).

- **Serving:** the config's `webServer` starts the demo pair (the same Vite dev servers as `npm run demo`, on explicit origins 5173/5174), `reuseExistingServer: true`, headless, single worker for determinism. Seeded content is the deterministic shared `SEED_CONTENT`.
- **Test 1 (alignment under resize + scroll, TC-001):** waits for `connected` + settled geometry, then for each target compares the admin overlay's `boundingBox()` against the corresponding in-iframe element (`frameLocator(...).locator('#<targetId>')`) within a 3px tolerance — for flat targets and a nested container child (`split-col.1`). Then resizes the viewport (1280→980, scale changes) and re-asserts; then scrolls the iframe content (`window.scrollTo(0,250)`) and re-asserts overlays stay glued.
- **Test 2 (live injection, TC-002):** selects the hero title overlay, fills the side-panel text field, asserts the in-iframe `#hero-title` text updates to the new value (`frameLocator`), and that the hero overlay stays aligned after the re-render.
- **Result:** `2 passed`. Chromium was installable in this environment (`npx playwright install chromium`), so the suite actually runs and passes. Reviewer command: `npx playwright install chromium` then `npm run demo:e2e` (webServer boots the pair automatically; or run `npm run demo` in another terminal first).

**Library bug fixed (minimal, at source; library tests re-run green):** the E2E surfaced a real coordinate-space mismatch between SIFR-I-0002 and SIFR-I-0003. `discoverTargets` reported **viewport-relative** geometry (`getBoundingClientRect()`) AND re-streamed on scroll, while the host's `mapGeometry` additionally subtracts a scroll offset (its tests assume **document-absolute** input). On live iframe scroll this double-counted, so overlays drifted. Fix: `discoverTargets` now reports document-absolute geometry (viewport rect + `scrollX`/`scrollY`) via a new internal `toAbsoluteGeometry` + `resolveScrollOffset`, making the host's single scroll-projection step the only place scroll is applied. `toGeometry` itself is unchanged (still a pure field-copy). Safe for existing tests: jsdom's `scrollX/scrollY` are 0 (discovery unit tests unchanged) and the host tests use static fixtures — library `tsc --noEmit` + `vitest run` remain 79/79 green.

### TC-001: Pass — overlay boxes track target/child boxes within 3px across connect, resize, and iframe-scroll captures.
### TC-002: Pass — panel edit updates in-iframe content and the overlay stays aligned.