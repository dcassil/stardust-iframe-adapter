---
id: presenceprovider-interface-and
level: task
title: "PresenceProvider Interface And Default Mock BroadcastChannel Adapter With Fan-Out And Throttle Tests"
short_code: "SIFR-T-0022"
created_at: 2026-07-30T16:03:52.462496+00:00
updated_at: 2026-07-30T16:03:52.462496+00:00
parent: SIFR-I-0006
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0006
---

# PresenceProvider Interface And Default Mock BroadcastChannel Adapter With Fan-Out And Throttle Tests

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0006]]

## Objective **[REQUIRED]**

Define the transport-agnostic `PresenceProvider` interface and the `Participant` type that model presence in the demo, and ship the **default** mock/local adapter (`BroadcastChannel`-based, with an in-memory fallback for jsdom) so the presence feature runs in the standard demo with no server. This is the load-bearing abstraction for SIFR-I-0006: it is the successor to the prototype's `code_temp/Stardust-CMS-APP-Original-backup/client/builder/src/hooks/useRealTime.tsx`, distilling that hook's `client-pointer`/`server-pointer` and `client-edit-context` (`{ id, target }`) flow into a small, backend-neutral API. It satisfies REQ-001 (provider interface), REQ-002 (mock/local default, no server), and the throttle half of NFR-004 (~100ms pointer publish, matching `useRealTime.tsx`). It deliberately does NOT render overlays (SIFR-T-0023) and does NOT include Socket.IO (SIFR-T-0024). All naming uses "presence"/"editing" terminology, never "collaboration" (NFR-001).

## Acceptance Criteria **[REQUIRED]**

- [ ] A `PresenceProvider` interface exists in the demo layer (not in the core SIFR-I-0002/0003 packages) exposing exactly: `publishPointer(pos: { x: number; y: number }): void`, `publishEditContext(ctx: { id: string; target: string } | null): void`, `subscribe(cb: (participants: Participant[]) => void): () => void` (returns an unsubscribe), and lifecycle `connect()`/`disconnect()`.
- [ ] A `Participant` type is defined as `{ id: string; name: string; color: string; pointer?: { x: number; y: number }; editContext?: { id: string; target: string } }` — modeling the collaborator shape used by `useRealTime.tsx`/`CMSTargetItem.tsx`.
- [ ] A `MockPresenceProvider` (default) implements the interface over `BroadcastChannel` when available, falling back to a shared in-memory event bus when `BroadcastChannel` is absent (jsdom/tests); two provider instances on the same channel name see each other's `Participant` updates.
- [ ] Local pointer publishing is throttled to ~100ms (configurable, default 100ms) so rapid pointer moves emit at most ~one message per interval; `publishEditContext` is NOT throttled (edit-lock changes are low-frequency and must be prompt).
- [ ] A remote participant that goes silent / disconnects is removed from the subscriber's `participants` list (leave/timeout handling), so stale cursors do not linger.
- [ ] No type, method name, comment, or exported symbol uses the word "collaboration" or implies concurrent/merged editing; terminology is "presence" and "editing".
- [ ] Zero footprint when unused: importing the module pulls no network transport and no Socket.IO; the mock adapter has no third-party runtime dependency.
- [ ] Unit tests (Jest + jsdom) cover: two-participant fan-out of pointer and editContext, the pointer throttle interval, unsubscribe stops delivery, and remote-leave removes the participant.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: Two participants exchange pointer and editContext via the mock adapter
- **Test ID**: TC-001
- **Preconditions**: Two `MockPresenceProvider` instances (A, B) constructed with the same channel name, each `connect()`ed, each with a distinct participant id/name/color.
- **Steps**:
  1. Subscribe a collector on B.
  2. On A call `publishPointer({ x: 120, y: 340 })`.
  3. On A call `publishEditContext({ id: 'c1', target: 't-hero' })`.
  4. Advance timers past the throttle interval and flush the channel.
- **Expected Results**: B's collector receives a participant list containing A with `pointer = { x: 120, y: 340 }` and `editContext = { id: 'c1', target: 't-hero' }`; A does not appear as its own remote participant in B's own local list handling.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

### Test Case 2: Pointer publishing is throttled and unsubscribe stops delivery
- **Test ID**: TC-002
- **Preconditions**: Provider A connected with fake timers; provider B connected with a subscribed collector.
- **Steps**:
  1. Call `publishPointer` 10 times synchronously with different coordinates within one 100ms window.
  2. Advance timers by 100ms and flush.
  3. Record how many pointer messages B observed for A in that window.
  4. Call the unsubscribe function returned by B's `subscribe`, then publish another pointer from A and flush.
- **Expected Results**: B observes at most one (the latest/leading-or-trailing per implementation) pointer update for A within the 100ms window, not 10; after unsubscribe, B's collector receives no further updates.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

## Implementation Notes **[CONDITIONAL: Technical Task]**

Recommended Agent: opus + medium

### Technical Approach
Create a demo-layer presence module (e.g. `demo/presence/PresenceProvider.ts` for the interface + types, `demo/presence/MockPresenceProvider.ts` for the default adapter). Extract the essential message vocabulary from `useRealTime.tsx`: a local pointer message and an edit-context message, each tagged with the sending participant's identity. The `MockPresenceProvider` broadcasts join/pointer/editContext/leave events over a `BroadcastChannel` keyed by channel name; on receipt it maintains a `Map<participantId, Participant>` and calls subscribers with the array of remote participants (excluding self). Detect `typeof BroadcastChannel !== 'undefined'`; when absent, use a module-level shared `EventTarget`/array bus so tests in jsdom exercise the same fan-out logic. Implement the throttle as a small leading+trailing throttle at ~100ms (mirroring the prototype's throttling) around `publishPointer`. Implement leave via an explicit `disconnect()` broadcast and a heartbeat/last-seen timeout that prunes silent participants. Keep the interface pure/transport-agnostic so SIFR-T-0024's Socket.IO adapter is a drop-in second implementation.

### Dependencies
- Upstream: none of the core packages are modified; this is the abstraction that SIFR-T-0023 (overlays) subscribes to and SIFR-T-0024 (Socket.IO adapter) implements a second time. Coordinate the `editContext { id, target }` vocabulary with the demo's target/content ids from SIFR-I-0004 (SIFR-T-0007 target ids, SIFR-T-0009 content store ids) so edit-locks reference real targets.
- Grounding reference: `code_temp/Stardust-CMS-APP-Original-backup/client/builder/src/hooks/useRealTime.tsx` (`client-pointer`/`server-pointer`, `client-edit-context`, ~100ms throttle) and `CMSTargetItem.tsx` (who-is-editing reflection).

### Risk Considerations
- Overclaiming: the single biggest risk (NFR-001). Enforce presence/editing-only terminology in symbol names and comments; add a note in the module header that no CRDT/OT is present.
- Self-echo: `BroadcastChannel` does not deliver a message to the sender, but the in-memory fallback might — ensure both paths exclude self identically so tests and runtime agree.
- Throttle correctness under fake timers: use an injectable clock/throttle so Jest fake timers deterministically exercise the interval; avoid relying on real `Date.now()` in the throttle.
- Stale participants: without leave/timeout handling, cursors linger; cover the prune path in tests.

## Status Updates **[REQUIRED]**

*To be added during implementation.*
