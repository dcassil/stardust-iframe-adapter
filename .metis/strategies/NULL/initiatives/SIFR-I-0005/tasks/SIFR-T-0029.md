---
id: opt-in-cms-updatestyles-wiring-and
level: task
title: "Opt-in cms/updateStyles wiring and minimal demo style panel"
short_code: "SIFR-T-0029"
created_at: 2026-07-30T16:07:49.988929+00:00
updated_at: 2026-07-30T16:07:49.988929+00:00
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

# Opt-in cms/updateStyles wiring and minimal demo style panel

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0005]]

## Objective **[REQUIRED]**

Wire the style feature end-to-end as an opt-in capability and prove it in the demo — Phase 4. On the iframe side, subscribe to the SIFR-I-0001 `cms/updateStyles` channel ONLY when the style feature is enabled; on each message, run `generateCss` (SIFR-T-0027) over the allowlist (SIFR-T-0026) and hand the result to `injectStyles` (SIFR-T-0028). When the feature is disabled there is no subscription and no adapter `<style>` node — zero footprint. On the host side (SIFR-I-0004 demo), add a minimal style panel that offers only allowlisted controls for the discovered groups and sends `cms/updateStyles({ group, rule, value })`. Add a demo integration assertion (Playwright) that changing a group's color updates the injected `<style>` while the page's own styles remain intact.

## Acceptance Criteria **[REQUIRED]**

- [ ] The iframe adapter subscribes to the SIFR-I-0001 `cms/updateStyles` channel ONLY when the style feature is enabled via an explicit opt-in flag; disabled means no subscription, no `<style>` node, and no behavioral change to the adapter (REQ-005, REQ-006, NFR-004).
- [ ] On each `cms/updateStyles({ group, rule, value })` message, the adapter runs `generateCss` over the current style values + allowlist and calls `injectStyles` with the result; the embedded page reflects the change live (REQ-005, Use Case 1).
- [ ] A malformed or non-allowlisted style value results in that property being dropped by `generateCss` — nothing unsafe is injected (Use Case 2, NFR-003).
- [ ] The demo (SIFR-I-0004) gains a minimal style panel that lists the discovered `data-style-group`s (via `discoverStyleElements`) and offers only allowlisted controls (e.g. a color picker for a `text` group), sending `cms/updateStyles` on change.
- [ ] A Playwright integration test in the demo E2E: change a text group's color via the panel, assert the injected adapter `<style>` reflects the new color AND the page's pre-existing styles are unchanged (REQ-004/NFR-001 safety guarantee end-to-end).
- [ ] With the feature flag off, an equivalent test confirms no adapter `<style>` node exists and the panel is absent/inert.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
- Follow the established adapter subscription pattern from SIFR-I-0002 for registering the `cms/updateStyles` handler; gate registration behind the opt-in flag so disabled = zero footprint.
- Maintain the accumulated style-value state on the iframe side and re-run `generateCss` → `injectStyles` on each update (the injector reuses its single `<style>` node).
- Keep the demo panel minimal per the non-goals: no full visual editor, just enough controls (color, maybe font-size) over discovered groups to exercise the feature.
- Use `discoverStyleElements` (SIFR-T-0028) to populate the panel's group/control list so only relevant, allowlisted controls appear.

### Dependencies
- Upstream (hard): SIFR-T-0026 (allowlist), SIFR-T-0027 (`generateCss`), SIFR-T-0028 (`injectStyles`/`discoverStyleElements`); SIFR-I-0001 (`cms/updateStyles` channel + style-value types) and SIFR-I-0002 (adapter subscription pattern, emits `data-style-*`).
- Platform: SIFR-I-0004 demo app + its Playwright harness.

### Risk Considerations
- Feature creep toward a full style editor: hold the panel to the minimal control set per the initiative's supporting-only non-goals.
- Ensure the opt-in default is OFF so consumers get zero footprint unless they explicitly enable it.

Recommended Agent: sonnet + medium

## Status Updates **[REQUIRED]**

*To be added during implementation*