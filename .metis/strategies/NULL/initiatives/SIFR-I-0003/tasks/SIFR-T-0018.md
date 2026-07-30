---
id: usestardusthost-hook-frame-link
level: task
title: "useStardustHost Hook: Frame-Link Host Connection, Position Request/Stream, Scale And Scroll Tracking"
short_code: "SIFR-T-0018"
created_at: 2026-07-30T16:03:38.666182+00:00
updated_at: 2026-07-30T16:03:38.666182+00:00
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

# useStardustHost Hook: Frame-Link Host Connection, Position Request/Stream, Scale And Scroll Tracking

## Parent Initiative

[[SIFR-I-0003]] — Host-Side Overlay Adapter

## Objective

Implement the `useStardustHost(iframeRef, options)` React hook — the host-side entry point that owns the frame-link connection to the iframe, requests target positions, subscribes to streamed position/scroll updates, tracks iframe scale, and returns mapped targets in host coordinates. This hook is the successor to the prototype's `code_temp/Stardust-CMS-APP-Original-backup/client/builder/src/cms_targets/useCMSTarget.tsx` (which holds `targetPositions`, listens for `cms_positions`, requests `get_cms_positions`) and the scale/scroll math ownership of `code_temp/Stardust-CMS-App/app/useFrame.tsx` — but decoupled from Stardust's `UIContext`/`ContentContext`/`PagesContext` (NFR-002). It satisfies REQ-001, REQ-002, and REQ-006 and delegates all coordinate math to `mapGeometry` (SIFR-T-0014).

## Acceptance Criteria

- [ ] `useStardustHost(iframeRef: RefObject<HTMLIFrameElement>, options: { origin: string; onInsert?; onMove?; onSelect? })` establishes a frame-link host connection to `iframeRef.current.contentWindow` using FLINK `frame-link-react`'s host connection API with an explicit `origin` (never `"*"`).
- [ ] On connect the hook sends `cms/requestTargetPositions` and populates state from the received `ContentTarget[]` (per SIFR-I-0002 output / SIFR-I-0001 protocol keys).
- [ ] The hook subscribes to `cms/sendElementPositions` and `cms/sendScrollPositions`; on each message it updates geometry/scroll state so `targets` reflect fresh positions (REQ-002), replacing the prototype `get_cms_positions`/`cms_positions` round-trip.
- [ ] The hook computes `scale` as container-width / document-width (from `useFrame.tsx`) via a `ResizeObserver` on the iframe and its container, and exposes `scale` in the return value (REQ-006) so the demo can also `transform: scale(...)` the iframe element.
- [ ] The hook returns `{ targets: MappedTarget[], scale: number, connectionState }`, where each `MappedTarget` carries its id, its mapped geometry (produced by calling `mapGeometry` from SIFR-T-0014 with the current `scale` and `scrollOffset`), and its content list for the overlays.
- [ ] Position-stream handling is coalesced (e.g. rAF or microtask batching) so rapid scroll/resize updates do not thrash React state (NFR-003).
- [ ] The hook imports zero Stardust legacy contexts (`UIContext`/`ContentContext`/`PagesContext`); all edit intent is surfaced only through the `onInsert`/`onMove`/`onSelect` option callbacks (NFR-002).
- [ ] The hook tears down the frame-link connection, message subscriptions, and `ResizeObserver` on unmount.

## Test Cases

### Test Case 1: Positions request and mapping on connect
- **Test ID**: TC-001
- **Preconditions**: A mock frame-link peer that responds to `cms/requestTargetPositions` with a known `ContentTarget[]` and emits a `cms/sendScrollPositions`.
- **Steps**: Render a component using `useStardustHost` with a fake iframe ref; let the mock respond.
- **Expected Results**: `targets` contains one `MappedTarget` per `ContentTarget`, each with geometry equal to `mapGeometry(target.geometry, { scale, scrollOffset })`; `connectionState` reports connected.

### Test Case 2: Coalesced scroll updates
- **Test ID**: TC-002
- **Preconditions**: Connected hook.
- **Steps**: Emit 10 `cms/sendScrollPositions` messages synchronously.
- **Expected Results**: React state settles to the final scroll offset with a bounded number of committed renders (batched); mapped targets reflect the last scroll.

## Implementation Notes

### Technical Approach
Own the connection lifecycle in a `useEffect` keyed on `iframeRef.current` and `origin`. Keep a ref for the latest scroll/scale and derive `targets` via `useMemo`/`useSyncExternalStore` so `mapGeometry` is the only place coordinates are computed. Do not bake in the prototype's `-40` header offset — if needed, accept it as an explicit documented option and fold it into the scroll offset. Structured-operation types and the `dataTransfer`→op construction consumed by the callbacks are defined in SIFR-T-0020; import them rather than redefining. The connection-state enum is also finalized in SIFR-T-0020; a minimal local state is acceptable until then.

### Dependencies
- Upstream: SIFR-T-0014 (`mapGeometry`); SIFR-I-0001 protocol (message keys `cms/requestTargetPositions`, `cms/sendElementPositions`, `cms/sendScrollPositions`; `ContentTarget`/`Geometry`/`ScrollState` types); SIFR-I-0002 (iframe emits these); FLINK `frame-link-react` host API.
- Downstream: SIFR-T-0019 overlays consume `targets`; SIFR-T-0021 exports and integration-tests this hook against a mock peer.

### Risk Considerations
Mid-scroll resize and fractional scale must not desync the `scale` and `scrollOffset` used in a single map pass — snapshot both before mapping. Coalescing is required to meet NFR-003.

Recommended Agent: opus + medium

## Status Updates

*To be added during implementation*
