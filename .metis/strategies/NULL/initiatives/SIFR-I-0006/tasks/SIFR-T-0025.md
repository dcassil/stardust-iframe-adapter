---
id: wire-presence-into-sifr-i-0004
level: task
title: "Wire Presence Into SIFR-I-0004 Demo Behind A Flag With Two-Tab Playwright Scenario And Presence-Scoping Doc Note"
short_code: "SIFR-T-0025"
created_at: 2026-07-30T16:04:04.492620+00:00
updated_at: 2026-07-30T16:04:04.492620+00:00
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

# Wire Presence Into SIFR-I-0004 Demo Behind A Flag With Two-Tab Playwright Scenario And Presence-Scoping Doc Note

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0006]]

## Objective **[REQUIRED]**

Integrate the presence feature into the SIFR-I-0004 demo admin behind an explicit off-by-default flag, prove it end-to-end with a two-tab (mock-adapter) Playwright scenario, and write the presence-scoping doc note. This is the final assembly slice: it mounts the `RemoteCursors` and `EditLockIndicator` overlays (SIFR-T-0023) wired to the default `MockPresenceProvider` (SIFR-T-0022), publishes the admin's local pointer and current edit-context into the provider, and gates the whole thing on a demo flag so single-user runs are unchanged (REQ-006, NFR-003). The doc note states plainly that this is presence / edit-locks, that no CRDT/OT/Yjs is present, and that true collaborative editing is out of scope (NFR-001) — protecting the downstream PORT portfolio narrative from overclaiming.

## Acceptance Criteria **[REQUIRED]**

- [ ] The SIFR-I-0004 admin reads a presence flag (e.g. env/config `PRESENCE_ENABLED`, default false); when false, no provider is constructed, no overlays mount, and no optional deps load — the demo behaves exactly as before.
- [ ] When the flag is true, the admin constructs the default `MockPresenceProvider`, mounts `RemoteCursors` + `EditLockIndicator` (SIFR-T-0023), publishes local pointer moves (throttled) via `publishPointer`, and publishes the current selection's edit-context via `publishEditContext` (and `null` on deselect).
- [ ] Local pointer/edit-context are mapped so the local session's published coordinates are consistent with what remote sessions render through SIFR-I-0003 geometry (the mock adapter path needs no server).
- [ ] A Playwright scenario opens two browser contexts/tabs of the admin against the local demo with presence enabled (mock adapter), moves the pointer in tab A, and asserts a labeled remote cursor appears in tab B; selects a target in tab A and asserts an "editing" lock indicator for that target appears in tab B.
- [ ] A presence-scoping doc note (in the demo README or a dedicated doc) states: this is presence + edit-locks, NOT collaborative editing; there is no CRDT/OT/Yjs or conflict-resolution model; the Socket.IO adapter/server is demo-grade with an explicit CORS origin. No demo copy, README text, or UI label says "collaboration".
- [ ] The default `npm run demo` runs presence with the mock adapter and no server when the flag is enabled; with the flag disabled it runs the plain demo.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: Two-tab remote cursor and edit-lock appear (mock adapter)
- **Test ID**: TC-001
- **Preconditions**: Local demo running with `PRESENCE_ENABLED=true` and the default mock adapter; Playwright with two contexts A and B both loaded on the admin.
- **Steps**:
  1. In context A, move the pointer over the iframe to a known position.
  2. In context B, wait for a remote cursor labeled with A's participant name.
  3. In context A, select the `t-hero` target to edit.
  4. In context B, wait for an "editing" indicator on `t-hero`.
- **Expected Results**: B shows A's labeled remote cursor at the mapped position and an "editing" lock on `t-hero`; no text in either UI mentions "collaboration".
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

### Test Case 2: Flag off restores the plain demo with zero presence footprint
- **Test ID**: TC-002
- **Preconditions**: Local demo run with `PRESENCE_ENABLED` unset/false.
- **Steps**:
  1. Load the admin in a single context.
  2. Inspect the DOM/network for any presence overlays, provider construction, or presence transport activity.
  3. Grep the loaded bundle/imports for Socket.IO.
- **Expected Results**: No remote-cursor or edit-lock overlays render; no presence provider is constructed; no Socket.IO is loaded; the demo is identical to the pre-presence behavior (REQ-006, NFR-003).
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

## Documentation Sections **[CONDITIONAL: Documentation Task]**

### User Guide Content
- **Feature Description**: Presence shows other editors' live cursors and which target each is editing (edit-locks). It is a real-time UI signal, not collaborative editing — there is no automatic merging or conflict resolution.
- **Prerequisites**: Enable the presence flag (`PRESENCE_ENABLED=true`). The default mock/local adapter needs no server; open two browser tabs to see presence. The optional Socket.IO adapter (SIFR-T-0024) requires the demo presence server with its explicit CORS origin.
- **Step-by-Step Instructions**:
  1. Run the demo with the presence flag enabled.
  2. Open the admin in two tabs.
  3. Move the pointer / select a target in one tab and watch the remote cursor and "editing" indicator appear in the other.

### Troubleshooting Guide
- **Common Issue 1**: No remote cursor appears — confirm the flag is enabled and both tabs share the same mock channel/`appId`.
- **Common Issue 2**: Socket.IO adapter connection refused — confirm the demo presence server is running and the browser origin matches the server's explicit allowed origin (allow-all is intentionally not permitted).
- **Error Messages**: A CORS-rejected socket handshake means the connecting origin is not the configured demo origin — this is expected/by-design (NFR-002).

## Implementation Notes **[CONDITIONAL: Technical Task]**

Recommended Agent: sonnet + medium

### Technical Approach
In the SIFR-I-0004 admin shell, add a presence flag read from env/config, default false. When enabled, construct the default `MockPresenceProvider` (SIFR-T-0022), mount the `RemoteCursors` and `EditLockIndicator` overlays (SIFR-T-0023) into the existing overlay layer, and hook the admin's existing pointer-move and target-selection handlers to call `publishPointer` (throttled) and `publishEditContext`/`publishEditContext(null)`. Keep provider construction and overlay mounting entirely inside the `if (flagEnabled)` path so a disabled build has no footprint and never imports the optional Socket.IO adapter. Add a Playwright spec using two browser contexts against the running local demo (extend the SIFR-I-0004 Playwright setup). Write the presence-scoping doc note in the demo README (or `docs/presence.md`), explicitly disclaiming CRDT/OT and collaborative editing and noting the explicit-CORS demo server. This is wiring + a doc note following patterns already established by SIFR-T-0022/0023/0024, hence sonnet + medium.

### Dependencies
- Upstream: SIFR-T-0022 (default `MockPresenceProvider`), SIFR-T-0023 (overlays), optionally SIFR-T-0024 (Socket.IO adapter, referenced by the doc note); SIFR-I-0004 demo admin (SIFR-T-0008 admin shell) and demo site targets (SIFR-T-0007) for real target ids in edit-context; the SIFR-I-0004 Playwright harness to extend.
- Grounding reference: `useRealTime.tsx` (local pointer publish + editContext on select) and `CMSTargetItem.tsx` (who-is-editing) for the admin-side publish behavior being reproduced behind the flag.

### Risk Considerations
- Overclaiming in demo copy / README / portfolio narrative is the highest-stakes risk (NFR-001); the doc note and a copy review must ensure nothing says "collaboration" — this is the last gate before PORT consumes the narrative.
- Footprint leak when disabled: ensure the disabled path constructs nothing and imports no optional deps (assert in TC-002).
- Two-context Playwright flakiness with the mock adapter: because `BroadcastChannel` is per-origin within a browser context, ensure the two tabs share a context/origin or use the in-memory fallback appropriately so the mock fan-out actually crosses the two tabs; add explicit waits.

## Status Updates **[REQUIRED]**

*To be added during implementation.*
