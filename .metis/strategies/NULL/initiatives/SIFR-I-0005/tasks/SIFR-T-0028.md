---
id: managed-style-element-injector-and
level: task
title: "Managed-style-element injector and discovery helper"
short_code: "SIFR-T-0028"
created_at: 2026-07-30T16:07:46.278118+00:00
updated_at: 2026-07-30T16:07:46.278118+00:00
parent: SIFR-I-0005
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0005
---

# Managed-style-element injector and discovery helper

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0005]]

## Objective **[REQUIRED]**

Build the safe, adapter-owned style injector plus the pure discovery helper — Phase 3 and the core safety fix over the prototype. The prototype's `useStyleInjector.tsx` is dangerous: it runs `while (document.styleSheets[0].cssRules.length > 0) document.styleSheets[0].deleteRule(0)`, destroying every rule in whatever stylesheet happens to be first, then inserts `!important` rules. This task replaces that with `injectStyles(css)` which lazily creates one `<style data-stardust-adapter-styles>` element in `<head>` and updates its `textContent` in place — never touching any stylesheet it does not own. It also delivers `discoverStyleElements(root)`, a pure helper that collects `[data-style-group]`/`[data-style-element]` targets so the panel can offer only relevant controls. Both run on the iframe side (where the DOM to style lives). The injector consumes the CSS string from `generateCss` (SIFR-T-0027); it does not build CSS itself.

## Acceptance Criteria **[REQUIRED]**

- [ ] `injectStyles(css)` lazily creates exactly one `<style data-stardust-adapter-styles>` element appended to `<head>` on first call, and on subsequent calls reuses that same element, setting its `textContent = css` (REQ-004).
- [ ] The injector NEVER calls `deleteRule`/`insertRule` on `document.styleSheets[0]` or any stylesheet it does not own; a jsdom test asserts that pre-existing `document.styleSheets[0]` rules are byte-for-byte untouched after injection (REQ-004, NFR-001) — this is the explicit correction of `useStyleInjector.tsx`'s destructive `deleteRule` loop.
- [ ] Idempotency: calling `injectStyles` N times produces exactly one adapter `<style>` node (no duplicates), and the last call's CSS is what is present.
- [ ] A teardown/`clearStyles()` path removes (or empties) the adapter-owned `<style>` node without affecting other stylesheets, supporting the "zero footprint when disabled" requirement (REQ-006, NFR-004).
- [ ] `discoverStyleElements(root)` is pure (no mutation): given a DOM subtree it returns the set of `data-style-group` values present (and their associated `data-style-rules`), so the panel can offer only relevant controls (REQ-002).
- [ ] `!important`, if used for override strength, is scoped only within the adapter's own `<style>` element and never leaks into global rules.
- [ ] Unit tests (Jest + jsdom) cover: single-node creation; reuse on update; idempotency; global-stylesheet-untouched assertion; `discoverStyleElements` returns correct groups for a sample subtree and an empty set for a subtree with no style attributes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
- Replace the prototype `useStyleInjector.tsx` behavior entirely. Do NOT iterate `document.styleSheets`; create and own a dedicated `<style>` node keyed by the `data-stardust-adapter-styles` attribute and swap its `textContent`.
- Look up the existing adapter node via `document.querySelector('style[data-stardust-adapter-styles]')` before creating a new one to guarantee idempotency across re-invocations (e.g. hot reload).
- Keep `discoverStyleElements(root)` pure and DOM-read-only: query `[data-style-group]`, collect unique group values plus any `data-style-rules`, return a plain data structure.
- This runs on the iframe side of the adapter (SIFR-I-0002); the injector takes an already-built CSS string, so it has no dependency on the allowlist directly.

### Dependencies
- Upstream (hard): SIFR-T-0027 (`generateCss`) supplies the CSS string the injector writes.
- Downstream: SIFR-T-0029 wires `cms/updateStyles` → `generateCss` → `injectStyles` and adds the demo assertion that page styles remain intact.

### Risk Considerations
- `!important` overrides could surprise consumers: mitigate by scoping strictly to the adapter-owned element and documenting the behavior; consider making `!important` opt-in.
- Re-entrancy / hot reload creating duplicate `<style>` nodes: mitigate with the query-before-create lookup and the idempotency test.

Recommended Agent: opus + medium

## Status Updates **[REQUIRED]**

*To be added during implementation*