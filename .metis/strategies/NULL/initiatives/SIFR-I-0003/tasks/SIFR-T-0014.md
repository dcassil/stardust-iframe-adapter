---
id: pure-mapgeometry-transform-scale
level: task
title: "Pure mapGeometry Transform: Scale And Scroll Projection With Exhaustive Unit Tests"
short_code: "SIFR-T-0014"
created_at: 2026-07-30T16:02:55.844650+00:00
updated_at: 2026-07-30T16:02:55.844650+00:00
parent: SIFR-I-0003
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0003
---

# Pure mapGeometry Transform: Scale And Scroll Projection With Exhaustive Unit Tests

## Parent Initiative

[[SIFR-I-0003]] — Host-Side Overlay Adapter

## Objective

Implement `mapGeometry(geometry, { scale, scrollOffset })` — the single pure function that projects an iframe-reported `Geometry` rectangle into host-viewport coordinates. This is the correctness substrate every overlay and the demo depend on (REQ-003, NFR-001). It replaces the fragile, entangled inline scale/scroll math currently scattered across the prototype's `code_temp/Stardust-CMS-App/app/useFrame.tsx` (`containerSize.scale = containerSize.width / documentSize.width`) and `code_temp/Stardust-CMS-APP-Original-backup/client/builder/src/cms_targets/CMSTargetAreas.tsx` (absolute positioning from `target.positions.top/left/width/height`). The function must be framework-agnostic (no React import), consume the `Geometry` type defined in SIFR-I-0001's protocol module, and be the sole place overlay coordinates are computed.

## Acceptance Criteria

- [ ] A pure function `mapGeometry(geometry: Geometry, transform: { scale: number; scrollOffset: { x: number; y: number } }): MappedGeometry` exists in the host-side source (e.g. `src/host/mapGeometry.ts`), imports only the `Geometry` type from the SIFR-I-0001 protocol module, and imports no React or DOM globals.
- [ ] The transform implements exactly: `left = (geometry.left - scrollOffset.x) * scale`, `top = (geometry.top - scrollOffset.y) * scale`, `width = geometry.width * scale`, `height = geometry.height * scale`, returning a `MappedGeometry` shape `{ top, left, width, height }` suitable for absolute positioning.
- [ ] A `MappedGeometry` type is exported so overlay primitives (SIFR-T-0016) can consume it.
- [ ] The function is total and side-effect free: same input always yields same output; it never reads the DOM, mutates arguments, or throws on valid numeric input.
- [ ] Unit tests achieve 100% branch coverage of `mapGeometry` and pass under Jest + jsdom, covering: identity at `scale = 1` and zero scroll; correct scaling at `scale < 1` (e.g. 0.5); correct translation under non-zero `scrollOffset`; combined scale + scroll; and boundary inputs (zero width/height, zero scale).
- [ ] NFR-001 accuracy is asserted: for representative fixtures, mapped output equals the analytically expected on-screen rectangle within 1px across `scale ∈ {1, 0.5}` and non-zero scroll.

## Test Cases

### Test Case 1: Identity at scale 1, zero scroll
- **Test ID**: TC-001
- **Preconditions**: `mapGeometry` importable.
- **Steps**: Call `mapGeometry({ top: 100, left: 50, width: 200, height: 80 }, { scale: 1, scrollOffset: { x: 0, y: 0 } })`.
- **Expected Results**: `{ top: 100, left: 50, width: 200, height: 80 }`.

### Test Case 2: Scale + non-zero scroll combined
- **Test ID**: TC-002
- **Preconditions**: `mapGeometry` importable.
- **Steps**: Call `mapGeometry({ top: 200, left: 100, width: 400, height: 100 }, { scale: 0.5, scrollOffset: { x: 20, y: 40 } })`.
- **Expected Results**: `{ left: (100 - 20) * 0.5 = 40, top: (200 - 40) * 0.5 = 80, width: 200, height: 50 }`.

## Implementation Notes

### Technical Approach
Extract the math from `useFrame.tsx`/`CMSTargetAreas.tsx` into a single tested pure function. Do NOT carry over the prototype's app-specific `-40` header offset or container insets from `useFrame.tsx`/`CmsTarget.utils.ts`; if a caller needs a fixed offset it belongs in an explicit, documented option on the hook (SIFR-T-0015), not baked into this transform. Keep the signature minimal so the hook and demo can both call it. Define `MappedGeometry` locally in the host source and export it.

### Dependencies
- Upstream: SIFR-I-0001 `Geometry` type (protocol module). If the protocol module is not yet published, define an interface matching its documented shape and wire the real import when available.
- Downstream: SIFR-T-0015 (hook maps each target via this function) and SIFR-T-0016 (overlays render from its output).

### Risk Considerations
Fractional scale and mid-scroll resize are the primary edge cases (initiative Risks). Exhaustive branch tests plus 1px-accuracy fixtures mitigate misalignment. Keeping the function pure guarantees it is trivially testable and reusable.

Recommended Agent: opus + high

## Status Updates

*To be added during implementation*
