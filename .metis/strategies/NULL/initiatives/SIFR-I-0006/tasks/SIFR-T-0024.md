---
id: optional-socket-io-presence
level: task
title: "Optional Socket.IO Presence Adapter And Demo Node Server With Explicit CORS Origin And Smoke Test"
short_code: "SIFR-T-0024"
created_at: 2026-07-30T16:04:00.272419+00:00
updated_at: 2026-07-30T16:04:00.272419+00:00
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

# Optional Socket.IO Presence Adapter And Demo Node Server With Explicit CORS Origin And Smoke Test

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0006]]

## Objective **[REQUIRED]**

Provide the **optional** Socket.IO `PresenceProvider` implementation plus a demo-only Node presence server that reproduces the prototype's pointer/edit-context fan-out — while **correcting the prototype's allow-all CORS**. In `code_temp/Stardust-CMS-APP-Original-backup/client/builder/server/index.js` the Socket.IO CORS callback does `callback(null, true)` for any origin; the new demo server MUST use an explicit allowed origin (localhost demo origin), satisfying REQ-003 and NFR-002. The client adapter implements the same `PresenceProvider` interface from SIFR-T-0022 (so it is a drop-in alternative to the mock), reproducing `client-pointer`/`server-pointer` and `client-edit-context` fan-out keyed by an `appId`/room (per the prototype server). Socket.IO is an optional/peer dependency of the **demo only** — never pulled into the core SIFR-I-0002/0003 packages (NFR-003). A smoke test is sufficient (demo-scoped); deep integration is covered by the mock-adapter Playwright scenario in SIFR-T-0025.

## Acceptance Criteria **[REQUIRED]**

- [ ] A `SocketIoPresenceProvider` implements the exact SIFR-T-0022 `PresenceProvider` interface (`publishPointer`, `publishEditContext`, `subscribe`, `connect`/`disconnect`) so it is interchangeable with `MockPresenceProvider` with no changes to the overlay components (SIFR-T-0023).
- [ ] The client adapter emits pointer and edit-context messages equivalent to the prototype's `client-pointer` and `client-edit-context` and consumes fan-out equivalent to `server-pointer`, joining a room by `appId` so only sessions sharing the app exchange presence.
- [ ] A demo-only Node presence server (successor to `server/index.js`) fans pointer and edit-context events out to other sockets in the same `appId` room, and its Socket.IO CORS is configured with an **explicit** allowed origin (the localhost demo origin) — it MUST NOT use `callback(null, true)` or `origin: '*'`.
- [ ] Socket.IO (`socket.io` server + `socket.io-client`) appears only as an optional/peer dependency of the demo workspace; it is absent from the core SIFR-I-0002/0003 package dependency graphs, and the presence feature disabled means the server is never started and the client never connects (NFR-003).
- [ ] All symbols, logs, and any server-side comments use presence/editing terminology, not "collaboration" (NFR-001).
- [ ] A smoke test starts the demo server and connects two clients: a pointer/edit-context published by one is received by the other; a connection attempt from a disallowed origin is rejected by the explicit CORS config.
- [ ] Pointer publishing on this adapter is throttled consistent with SIFR-T-0022 (~100ms) so it matches the mock adapter's behavior and NFR-004.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: Two Socket.IO clients exchange presence in the same appId room
- **Test ID**: TC-001
- **Preconditions**: Demo presence server started on a test port with the explicit localhost origin allowed; two `SocketIoPresenceProvider` clients A and B connected with the same `appId`.
- **Steps**:
  1. Subscribe a collector on B.
  2. A calls `publishPointer({ x: 50, y: 60 })` and `publishEditContext({ id: 'c9', target: 't-card' })`.
  3. Wait for the server fan-out.
  4. Connect a third client C with a **different** `appId` and publish from A again.
- **Expected Results**: B receives A as a participant with the given pointer and editContext; C (different room) receives nothing from A. Behavior matches the prototype's per-`appId` fan-out.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

### Test Case 2: Explicit CORS rejects a disallowed origin
- **Test ID**: TC-002
- **Preconditions**: Demo presence server started with only the localhost demo origin allowed.
- **Steps**:
  1. Attempt a Socket.IO/handshake connection presenting an `Origin` header that is not the allowed origin.
  2. Attempt a connection presenting the allowed localhost origin.
- **Expected Results**: The disallowed-origin connection is rejected by the server's explicit CORS configuration; the allowed-origin connection succeeds. Confirms the prototype's `callback(null, true)` allow-all is not reintroduced (NFR-002).
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

## Implementation Notes **[CONDITIONAL: Technical Task]**

Recommended Agent: opus + medium

### Technical Approach
Client: implement `SocketIoPresenceProvider` in the demo layer using `socket.io-client`; on `connect()` open the socket to the demo server and join the `appId` room; `publishPointer` (throttled ~100ms) and `publishEditContext` emit the pointer/edit-context events; `subscribe` maintains the `Map<id, Participant>` from inbound fan-out and remote leave, calling subscribers with the remote array — identical external contract to `MockPresenceProvider`. Server: a small Node/`socket.io` server modeled on `server/index.js` that, on receiving a pointer/edit-context event from a socket, broadcasts it to the other sockets in the same `appId` room, and emits leave on disconnect. Critically, construct the Socket.IO server with `cors: { origin: <explicit localhost demo origin>, methods: [...] }` — never a permissive callback. Gate `socket.io`/`socket.io-client` as optional/peer deps of the demo workspace and lazy-import them only when presence-over-socket is enabled, so a disabled build pulls neither. Keep the server demo-grade: no auth, no persistence, ephemeral in-memory rooms.

### Dependencies
- Upstream: SIFR-T-0022 (the `PresenceProvider` interface this must satisfy exactly). SIFR-I-0004 demo workspace for where the optional dependency and server live (wiring/flag is SIFR-T-0025).
- Grounding reference: `code_temp/Stardust-CMS-APP-Original-backup/client/builder/server/index.js` (per-`appId` pointer/edit-context fan-out and the allow-all `callback(null, true)` CORS to be corrected) and `useRealTime.tsx` (`client-pointer`/`server-pointer`, `client-edit-context`).
- Optional linkage: if presence is routed via the SIFR-I-0001 reserved `cms/presence` channel over frame-link instead of a side socket, coordinate there; default here is a side Socket.IO transport as in the prototype.

### Risk Considerations
- Reintroducing allow-all CORS is the headline risk (NFR-002); mitigate with an explicit-origin config and TC-002 asserting a disallowed origin is rejected; consider a lint/test check on the server config.
- Optional-dependency leakage into core packages (NFR-003); mitigate by declaring Socket.IO only in the demo workspace, lazy-importing, and verifying the core package dependency graphs are clean.
- Interface drift from the mock adapter would break overlay interchangeability; mitigate by implementing against the same SIFR-T-0022 interface and running the overlay (SIFR-T-0023) unchanged against this provider in the smoke test.
- Flaky network timing in tests; keep to a smoke test with generous waits rather than deep timing assertions (deep scenario coverage uses the deterministic mock adapter in SIFR-T-0025).

## Status Updates **[REQUIRED]**

*To be added during implementation.*
