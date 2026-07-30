---
id: add-resizeobserver
level: task
title: "Add ResizeObserver/MutationObserver plus throttled scroll/resize with leak-free cleanup"
short_code: "SIFR-T-0015"
created_at: 2026-07-30T16:03:04.995392+00:00
updated_at: 2026-07-30T16:03:04.995392+00:00
parent: SIFR-I-0002
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0002
---

# Add ResizeObserver/MutationObserver plus throttled scroll/resize with leak-free cleanup

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0002]]

## Objective **[REQUIRED]**

Add the observer/update bundle to `StardustAdapterProvider`: a `ResizeObserver` on the root, a `MutationObserver` on the subtree, and throttled `scroll`/`resize` window handlers that recompute discovery and push `cms/sendElementPositions` and `cms/sendScrollPositions`. This is the prototype's known-defect area: `CmsBase.context.tsx` adds `resize`/`scroll` listeners with fresh arrow functions so `removeEventListener` never removes them (a listener leak), uses an empty dependency array while closing over `sendElementPositions`, and streams unthrottled. This task replaces that with named handlers held in refs, symmetric add/remove, observer `disconnect()`, and per-animation-frame throttling.

## Acceptance Criteria **[REQUIRED]**

- [ ] A `ResizeObserver` on the root and a `MutationObserver` on the subtree are established on mount and each triggers a discovery recompute + position push (REQ-004).
- [ ] `scroll`/`resize` window handlers push `cms/sendElementPositions` and `cms/sendScrollPositions`, throttled to at most once per animation frame (REQ-004, NFR-001).
- [ ] All listeners and observers use **stable references** (named handlers in refs / observer instances); every `addEventListener` has a matching `removeEventListener` with the same reference, and every observer is `disconnect()`ed on unmount (REQ-005).
- [ ] A test mounting and unmounting the provider N times shows no growth in active listeners/observers (mocked observers + spied add/removeEventListener), proving no leak (NFR-002).
- [ ] A test asserts the throttle coalesces a burst of scroll/resize events into a single push per frame (NFR-001).
- [ ] `npm test` passes.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: Symmetric listener cleanup
- **Test ID**: TC-001
- **Preconditions**: `addEventListener`/`removeEventListener` spied; `ResizeObserver`/`MutationObserver` mocked.
- **Steps**:
  1. Mount then unmount the provider.
  2. Compare add vs remove call references.
- **Expected Results**: Every added listener removed with the same reference; every observer disconnected. No net active listeners.
- **Status**: Pass/Fail/Blocked

### Test Case 2: Throttled push
- **Test ID**: TC-002
- **Preconditions**: Fake timers / rAF mock; mock frame-link `post` spied.
- **Steps**:
  1. Fire many `scroll`/`resize` events within one frame.
- **Expected Results**: Exactly one `cms/sendElementPositions` push per frame.
- **Status**: Pass/Fail/Blocked

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Store handler functions and observer instances in `useRef`. In the setup effect: create `ResizeObserver`/`MutationObserver`, `addEventListener('scroll'|'resize', handlerRef.current)`; the cleanup calls the identical references for `removeEventListener` and `observer.disconnect()`. Wrap the push in a `requestAnimationFrame`-based throttle util (coalesce pending push, cancel on unmount). Recompute discovery via `discoverTargets` (SIFR-T-0006) and post using SIFR-I-0001 message names.

### Dependencies
Builds on SIFR-T-0013 (`StardustAdapterProvider`) and SIFR-T-0006 (`discoverTargets`). SIFR-I-0001 message names for `cms/sendElementPositions` / `cms/sendScrollPositions`.

### Risk Considerations
Observer firing storms can still saturate the channel — mitigated by rAF coalescing. Ensure the rAF handle is cancelled on unmount to avoid a post after teardown.

**Recommended Agent: opus + medium**

## Status Updates **[REQUIRED]**

*To be added during implementation*