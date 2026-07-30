---
id: host-side-package-entry-export-and
level: task
title: "Host-Side Package Entry Export And Integration Test Against A Mock Frame-Link Peer"
short_code: "SIFR-T-0021"
created_at: 2026-07-30T16:03:44.023686+00:00
updated_at: 2026-07-30T16:03:44.023686+00:00
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

# Host-Side Package Entry Export And Integration Test Against A Mock Frame-Link Peer

## Parent Initiative

[[SIFR-I-0003]] — Host-Side Overlay Adapter

## Objective

Assemble the host-side public entry of `@stardust-cms/iframe-adapter` — exporting `useStardustHost`, `TargetAreaOverlay`, `ContentItemOverlay`, `mapGeometry`, and the operation/connection types — under the host export path defined by SIFR-I-0001's iframe/host export split (SIFR-T-0004). Then write an integration test that drives `useStardustHost` against a mock frame-link peer emitting a known `ContentTarget[]` + `ScrollState`, asserting mapped targets and that a simulated drop emits the expected `InsertOp`. This is mechanical wiring following the SIFR-I-0002 test pattern; full two-frame behavior is validated separately in SIFR-I-0004.

## Acceptance Criteria

- [ ] A host entry module (matching the package's host export subpath from SIFR-T-0004, e.g. `@stardust-cms/iframe-adapter/host`) re-exports the public host API: `useStardustHost`, `TargetAreaOverlay`, `ContentItemOverlay`, `mapGeometry`, `MappedGeometry`, `MappedTarget`, `InsertOp`, `MoveOp`, `SelectOp`, `StardustHostOp`, and `ConnectionState`.
- [ ] The entry exports no iframe-side symbols and imports none of Stardust's legacy contexts (NFR-002); the host/iframe split of the package is preserved.
- [ ] An integration test (Jest + jsdom, following the SIFR-I-0002 mock-peer test pattern) stands up a mock frame-link peer that responds to `cms/requestTargetPositions` with a static `ContentTarget[]` fixture and emits a `cms/sendScrollPositions` with a known `ScrollState`.
- [ ] The test renders a component that uses `useStardustHost` + `TargetAreaOverlay`, asserts the overlays render at the coordinates produced by `mapGeometry` for the fixture's `scale`/`scrollOffset`, and asserts that a simulated drop emits the expected `InsertOp` through the `onInsert` callback.
- [ ] The test verifies connection teardown on unmount (subscriptions/observer removed) and that `connectionState` transitions to connected after the mock responds.
- [ ] `mapGeometry` unit tests (SIFR-T-0014), overlay tests (SIFR-T-0019), and op tests (SIFR-T-0020) plus this integration test all run and pass via the package's test script.

## Test Cases

### Test Case 1: End-to-end mapped render against mock peer
- **Test ID**: TC-001
- **Preconditions**: Mock frame-link peer configured with a `ContentTarget[]` fixture and a `ScrollState`.
- **Steps**: Render host component with a fake iframe ref; let the mock respond; inspect DOM.
- **Expected Results**: One overlay box per fixture target at `mapGeometry`-computed coordinates; `connectionState` = connected.

### Test Case 2: Simulated drop emits InsertOp through public API
- **Test ID**: TC-002
- **Preconditions**: Rendered host component with an `onInsert` spy passed to `useStardustHost`.
- **Steps**: Fire dragOver + drop of a `{ type: 'text' }` payload on a target area at index 0.
- **Expected Results**: `onInsert(targetId, 0, { type: 'text' })` fires exactly once; no store mutation occurs anywhere in the package.

## Implementation Notes

### Technical Approach
This is integration/wiring, not new logic — reuse the mock-peer harness and conventions established by the SIFR-I-0002 iframe-side tests (SIFR-T-0006 and siblings) so the two sides share a testing style. Keep the host entry a thin re-export barrel; do not add behavior here. Confirm the export subpath name against SIFR-T-0004's package `exports` map so the host/iframe split is honored.

### Dependencies
- Upstream: SIFR-T-0014, SIFR-T-0018, SIFR-T-0019, SIFR-T-0020 (all host symbols being exported); SIFR-T-0004 (package `exports` iframe/host split); SIFR-I-0002 mock-peer test pattern; FLINK `frame-link-react`.
- Downstream: SIFR-I-0004 demo imports from this host entry; full two-frame validation happens there.

### Risk Considerations
The mock peer must faithfully emit the SIFR-I-0001 message keys and payload shapes, or the integration test gives false confidence — mirror the SIFR-I-0002 harness exactly. Do not let the barrel accidentally re-export iframe-side code (would break the package split).

Recommended Agent: sonnet + medium

## Status Updates

*To be added during implementation*
