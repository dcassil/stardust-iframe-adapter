---
id: presence-demo-not-collaboration
level: initiative
title: "Presence Demo, Not Collaboration Package"
short_code: "SIFR-I-0006"
created_at: 2026-07-30T15:01:25.195208+00:00
updated_at: 2026-07-30T16:03:45.827219+00:00
parent: SIFR-V-0001
blocked_by: []
archived: false

tags:
  - "#initiative"
  - "#phase/decompose"


exit_criteria_met: false
estimated_complexity: M
strategy_id: NULL
initiative_id: presence-demo-not-collaboration
---

# Presence Demo, Not Collaboration Package Initiative

## Context **[REQUIRED]**

Stardust's prototype has a real-time layer that is genuinely interesting as a portfolio signal: `code_temp/Stardust-CMS-APP-Original-backup/client/builder/src/hooks/useRealTime.tsx` tracks collaborators — remote pointer positions (Socket.IO `client-pointer` / `server-pointer`) and an `editContext` (`client-edit-context`, `{ id, target }`) — and applies the same iframe scale/scroll math as the overlay so remote cursors land in the right place. The backing server (`client/builder/server/index.js`) fans pointer and edit-context events out to other sockets sharing an `appId`, and `CMSTargetItem.tsx` reflects who is editing what.

The vision and the plan are emphatic about scoping: this is **presence** (live cursors + "who is editing" edit-locks), **not** collaborative editing. There is no CRDT/OT/Yjs conflict-resolution model in the prototype, so calling it "collaboration" would overclaim. This initiative preserves the impressive presence signal in the demo without creating a standalone collaboration package and without implying real concurrent-editing guarantees. It is deliberately the last SIFR initiative and is optional relative to the core adapter value.

The prototype also has a security smell to correct: the server's Socket.IO CORS callback allows *any* origin (`callback(null, true)`). Any presence transport shipped in the demo must use an explicit origin and be clearly demo-scoped.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Define an optional `PresenceProvider` interface (transport-agnostic) so presence can be plugged into the demo without coupling the adapter to a specific backend.
- Provide a Socket.IO adapter *and* a local/mock presence adapter, using the mock by default so the demo needs no server.
- Render remote cursors and an "editing" lock/indicator state (successors to `useRealTime.tsx` + `CMSTargetItem.tsx`), reusing the SIFR-I-0003 geometry mapping so remote cursors and locks align under scale/scroll.
- Scope and label the feature explicitly as presence / edit-locks — never "collaborative editing" — in code, docs, and demo copy.

**Non-Goals:**
- Building a standalone collaboration package (explicit vision non-goal).
- Any CRDT/OT/Yjs or conflict-resolution model — out of scope unless a future, separately-scoped initiative adds true collaborative editing.
- Production presence infrastructure, auth, or persistence — the Socket.IO adapter is demo-grade.
- Changing the core adapter packages (SIFR-I-0002/0003) — presence layers on top via the reserved protocol channel and the host overlay geometry.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### User Requirements
- **User Characteristics**: Reviewers/recruiters who see the presence demo as evidence of real-time UI capability; and engineers who might plug in their own presence transport.
- **System Functionality**: With presence enabled, multiple sessions show each other's cursors and which target/content each is editing; with it disabled (default in single-user runs), nothing changes.
- **User Interfaces**: Remote-cursor overlays and edit-lock indicators in the admin, plus a small `PresenceProvider` API.

### System Requirements
- **Functional Requirements**:
  - REQ-001: A `PresenceProvider` interface abstracts presence transport with methods to publish local pointer/edit-context and subscribe to remote participants (modeled on `useRealTime.tsx`'s `client-pointer`/`client-edit-context` + `server-pointer` flow).
  - REQ-002: A **mock/local** presence adapter (e.g. `BroadcastChannel` or in-memory) is the default, requiring no server.
  - REQ-003: An **optional Socket.IO** adapter reproduces the prototype's pointer/edit-context fan-out but uses an explicit allowed origin (correcting the server's allow-all CORS).
  - REQ-004: Remote cursors render at correct positions using SIFR-I-0003's `mapGeometry`/scale so they align under iframe scale and scroll.
  - REQ-005: An edit-lock indicator shows which participant is editing a given target/content (from `editContext { id, target }`).
  - REQ-006: The entire feature is optional and off by default; all UI copy/labels say "presence" / "editing", never "collaboration".
- **Non-Functional Requirements**:
  - NFR-001 (Honest scoping): No API, type, or doc claims collaborative/concurrent editing; presence is clearly labeled.
  - NFR-002 (Security): Any network transport uses an explicit origin; the demo server does not allow arbitrary origins.
  - NFR-003 (Optionality): Zero footprint and zero dependency pull when disabled; Socket.IO is a peer/optional dependency of the demo, not the core packages.
  - NFR-004 (Performance): Pointer publishing is throttled (the prototype throttles at ~100ms) to bound message volume.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Two editors see each other's cursors
- **Actor**: Two content editors in separate sessions (or two tabs via the mock adapter).
- **Scenario**: Each moves their pointer; throttled pointer events publish; the other renders a labeled remote cursor mapped through the iframe scale/scroll.
- **Expected Outcome**: Cursors appear at the correct on-screen position for both participants.

### Use Case 2: Editing lock is visible
- **Actor**: Editor A selects a target to edit.
- **Scenario**: A's `editContext { target, id }` publishes; B sees an "A is editing" indicator on that target.
- **Expected Outcome**: B is informed of the edit context; the feature is presented as an edit-lock/presence signal, not a merge guarantee.

## Architecture **[CONDITIONAL: Technically Complex Initiative]**

### Overview
A `PresenceProvider` interface with two interchangeable adapters (mock/local default, optional Socket.IO). Presence state (participants → pointer + editContext) feeds cursor and lock overlays that reuse SIFR-I-0003's geometry mapping. The core adapter packages are untouched; presence is a demo-layer concern wired through an optional protocol channel and the existing overlay coordinate system.

### Sequence Diagrams
Local pointer move (throttled) → provider publishes `pointer` → transport fans out → remote sessions receive → map through scale/scroll → render remote cursor. Local select → provider publishes `editContext` → remote sessions render edit-lock on the target.

Class and deployment diagrams are largely omitted: the deliverable is a provider interface + two small adapters + overlay components, not an OOP hierarchy. A minimal deployment note applies only to the optional Socket.IO adapter (a demo-only Node server with an explicit CORS origin), documented in Detailed Design rather than as a formal diagram.

## Detailed Design **[REQUIRED]**

1. **`PresenceProvider` interface** (from `useRealTime.tsx`): `publishPointer(pos)`, `publishEditContext(ctx)`, `subscribe(cb: (participants: Participant[]) => void)`, `Participant { id, name, color, pointer?, editContext? }`. Transport-agnostic.
2. **Mock/local adapter (default)**: `BroadcastChannel`-based (or in-memory) so two tabs demonstrate presence with no server. This makes the feature runnable in the standard `npm run demo`.
3. **Optional Socket.IO adapter**: reproduces `client-pointer`/`server-pointer` and `client-edit-context` from `useRealTime.tsx` + `server/index.js`, but the demo server sets an **explicit** allowed origin (fixing the prototype's `callback(null, true)` allow-all). Socket.IO is an optional/peer dependency of the demo only.
4. **Pointer/edit-lock overlays**: render remote cursors and "editing" badges positioned via SIFR-I-0003's `mapGeometry`/scale (reusing the prototype's collaborator scale math, now centralized). Cursors are throttled on publish (~100ms, per `useRealTime.tsx`).
5. **Labeling discipline**: types, hooks, and UI use "presence"/"editing" terminology; a short doc note states no CRDT/OT is present and true collaborative editing is out of scope.
6. **Optionality**: presence is enabled via a demo flag; disabled means no transport, no overlays, no optional deps.

## Testing Strategy **[CONDITIONAL: Separate Testing Initiative]**

### Unit Testing
- **Strategy**: Test the mock adapter's publish/subscribe fan-out (two in-process participants exchange pointer + editContext) and the pointer throttle. Test that remote cursor positions map correctly through the SIFR-I-0003 transform (reuse those geometry tests).
- **Coverage Target**: Mock adapter publish/subscribe and throttle paths; cursor/lock overlay positioning.
- **Tools**: Jest + jsdom; `BroadcastChannel` mocked or run in jsdom.

### Integration Testing
- **Strategy**: In the SIFR-I-0004 demo, a two-tab (mock adapter) Playwright scenario asserts a remote cursor and an edit-lock indicator appear for a second session. The Socket.IO adapter gets a smoke test only (demo-scoped).
- **Test Environment**: Playwright with two browser contexts against the local demo.
- **Data Management**: Ephemeral in-memory participants; no persistence.

### Test Selection
- Prioritize the presence-scoping guarantee (no collaboration claims, NFR-001), correct cursor mapping under scale/scroll (REQ-004), and the default mock adapter working without a server (REQ-002) — the plan's acceptance criteria emphasize clear presence scoping and no standalone collaboration package.

### Bug Tracking
- The prototype's allow-all CORS and any overclaiming language are tracked as explicit correction tasks; new issues become tasks or backlog bugs.

## Alternatives Considered **[REQUIRED]**

- **Extract a standalone collaboration package** — Rejected per the vision's explicit non-goal; presence is a demo feature, not a package, in this phase.
- **Add CRDT/OT/Yjs for real collaborative editing** — Rejected/deferred: out of scope unless a future initiative explicitly scopes true collaborative editing; adding it now would overreach and overclaim.
- **Ship only the Socket.IO adapter (as the prototype did)** — Rejected: it requires a running server and carries the allow-all CORS smell; a default mock/local adapter makes the demo self-contained and safe.
- **Call the feature "collaboration" for portfolio impact** — Rejected: dishonest given no conflict-resolution model; "presence / edit-locks" is the accurate and still-impressive framing.

## Implementation Plan **[REQUIRED]**

Phase 1 — `PresenceProvider` interface + `Participant` types (from `useRealTime.tsx`), with the mock/local (`BroadcastChannel`) adapter as default + unit tests.
Phase 2 — Remote-cursor + edit-lock overlays reusing SIFR-I-0003 geometry mapping; pointer publish throttling.
Phase 3 — Optional Socket.IO adapter + demo-only Node server with explicit CORS origin (correcting the allow-all prototype); smoke test.
Phase 4 — Wire presence into the SIFR-I-0004 demo behind a flag; two-tab Playwright presence scenario; presence-scoping doc note.

## Risks & Dependencies **[REQUIRED]**

**Risks:**
- Overclaiming "collaboration" in code/docs/portfolio — mitigated by the explicit labeling discipline (NFR-001) and a doc note; reviewed before PORT uses it.
- Remote cursor misalignment under scale/scroll — mitigated by reusing the tested SIFR-I-0003 `mapGeometry` rather than re-deriving the prototype's collaborator math.
- Optional-dependency leakage (Socket.IO pulled into core) — mitigated by keeping presence and its transport strictly in the demo layer as optional/peer deps.
- Prototype's allow-all CORS re-introduced — mitigated by an explicit-origin requirement and a test/lint check on the demo server config.

**Dependencies:**
- Upstream: SIFR-I-0003 (`mapGeometry`/scale for cursor positioning) and SIFR-I-0004 (the demo presence renders into); optionally the SIFR-I-0001 reserved `cms/presence` channel if presence is routed via frame-link rather than a side transport. FLINK transport for any frame-link-routed presence.
- Downstream: The PORT (Portfolio Grooming) project references this presence demo in the public narrative — accurate scoping here protects that narrative from overclaiming.

## Decomposition Plan **[REQUIRED]**

Expected tasks at `decompose` (each with a `Recommended Agent`):
1. `PresenceProvider` interface + `Participant` types + default mock/local (`BroadcastChannel`) adapter + fan-out/throttle tests — `opus + medium` (defines the abstraction; concurrency-ish logic).
2. Remote-cursor + edit-lock overlays reusing SIFR-I-0003 geometry mapping — `opus + medium` (multi-component UI, correct coordinate mapping).
3. Optional Socket.IO adapter + demo Node server with explicit CORS origin + smoke test — `opus + medium` (network transport + security correction over the prototype).
4. Demo wiring behind a flag + two-tab Playwright presence scenario + presence-scoping doc note — `sonnet + medium` (wiring + a doc note following a stated pattern).