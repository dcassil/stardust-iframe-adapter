---
id: implement-stardustadapterprovider
level: task
title: "Implement StardustAdapterProvider with one-time registration and frame-link subscriptions"
short_code: "SIFR-T-0013"
created_at: 2026-07-30T16:02:18.544542+00:00
updated_at: 2026-07-30T16:40:37.462015+00:00
parent: SIFR-I-0002
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0002
---

# Implement StardustAdapterProvider with one-time registration and frame-link subscriptions

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0002]]

## Objective **[REQUIRED]**

Implement `StardustAdapterProvider`, the cleaned successor to the prototype `code_temp/Stardust-CMS-App/demoApp/src/lib/CmsBase.context.tsx`. The provider consumes `frame-link-react`'s `FrameLinkContext` (register/subscribe/post), registers the frame-link target **exactly once** when transport is `ready && !connected` (fixing the prototype's effect that re-registers on `connected` changes), subscribes to `cms/requestTargetPositions` (responding via `discoverTargets` from SIFR-T-0006) and to `cms/sendElements` (updating rendered content), and provides content down to `EditableTarget`. This task owns the effect/registration/subscription logic; the observer bundle and throttling live in SIFR-T-0008.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `StardustAdapterProvider` registers the frame-link target once when transport is `ready && !connected`, and does not re-register when `connected` later changes (REQ-001).
- [ ] Subscribes to `cms/requestTargetPositions` and responds with the current `discoverTargets()` output (REQ-006).
- [ ] Subscribes to `cms/sendElements` and updates the rendered content state consumed by `EditableTarget` (REQ-006).
- [ ] Provider depends only on `react`, `frame-link-react`, and the SIFR-I-0001 protocol module — no host UI contexts (NFR-003).
- [ ] All effect subscriptions are torn down on unmount (unsubscribe handlers returned by `frame-link-react` are called); no double-subscription across re-renders.
- [ ] Unit tests against a mock frame-link peer assert: single registration across a `ready → connected` transition, correct response to `cms/requestTargetPositions`, and content update on `cms/sendElements`.
- [ ] `npm test` passes.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: One-time registration
- **Test ID**: TC-001
- **Preconditions**: Mock frame-link peer starting `ready`, then transitioning to `connected`.
- **Steps**:
  1. Mount provider.
  2. Drive `ready → connected` transition.
- **Expected Results**: `register` called exactly once; no re-registration on `connected`.
- **Status**: Pass/Fail/Blocked

### Test Case 2: Request/response wiring
- **Test ID**: TC-002
- **Preconditions**: Provider mounted with fixture content and a `[data-cms]` DOM.
- **Steps**:
  1. Peer sends `cms/requestTargetPositions`.
- **Expected Results**: Provider posts `ContentTarget[]` from `discoverTargets`.
- **Status**: Pass/Fail/Blocked

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Rewrite `CmsBase.context.tsx` as `src/iframe/StardustAdapterProvider.tsx`. Use `useEffect` keyed on `ready`/`connected` with a guard so registration runs once; store unsubscribe callbacks and call them in cleanup. Wire `cms/requestTargetPositions` → `discoverTargets(document)` (from SIFR-T-0006) → `post`. Wire `cms/sendElements` → `setContent`. Expose content via context to `EditableTarget`. Use the SIFR-I-0001 message name constants, not string literals.

### Dependencies
Depends on SIFR-T-0006 (`discoverTargets`) and SIFR-I-0001 (protocol registry, message names). FLINK `frame-link-react` must expose the register/subscribe/post API. The observer/throttle bundle (SIFR-T-0008) integrates into this provider afterward.

### Risk Considerations
Fixing the re-registration effect changes connection timing; cover `ready`/`connected` transitions with the mock-peer test to prevent regressions.

**Recommended Agent: opus + medium**

## Status Updates **[REQUIRED]**

## Completion notes

Implemented `src/iframe/StardustAdapterProvider.tsx`. The real `frame-link-react`
API has no `registerTarget`/`ready`; registration = calling
`useConnection().connect(target)`. A `useRef` guard fires that exactly once when
`!connected && !connecting`, so later `connected` transitions never re-register
(REQ-001). Handlers use registry-bound wrappers (`useStardustHandler`, keys via
`CHANNELS`, never raw literals): `cms/requestTargetPositions` responds with
`discoverTargets(root)`, `cms/sendElements` folds each payload via `mergeContent`
into a per-target content map exposed through `StardustContentContext` for
`EditableTarget`. Depends only on react + frame-link-react + protocol (NFR-003);
`useHandler` auto-unsubscribes on unmount. Added `src/iframe/testing/mock-peer.tsx`
(in-memory peer injected through the real `FrameLinkContext`) and 4 tests
(one-time registration across ready→connected, request/response, sendElements,
teardown). Aligned the react toolchain to v18 to match the peer packages' own
@types/react and avoid a dual-React-types conflict; added tsconfig `paths` for
the peer sources and vitest `dedupe`/alias.