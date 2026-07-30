---
id: integration-test-against-mock
level: task
title: "Integration test against mock frame-link peer and wire iframe-side package entry export"
short_code: "SIFR-T-0017"
created_at: 2026-07-30T16:03:08.156167+00:00
updated_at: 2026-07-30T16:03:08.156167+00:00
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

# Integration test against mock frame-link peer and wire iframe-side package entry export

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0002]]

## Objective **[REQUIRED]**

Add an integration test that mounts `StardustAdapterProvider` with fake content and a mock `frame-link` peer in jsdom, exercising the full request/response and observer/push flow together, and wire the public iframe-side entry export of `@stardust-cms/iframe-adapter` (`StardustAdapterProvider`, `EditableTarget`, content renderer, style wrapper, and `discoverTargets` if public). This is the closing Phase 4 task that proves tasks SIFR-T-0006/0013/0015/0016 compose correctly and makes the package consumable by SIFR-I-0003 (host overlays) and SIFR-I-0004 (demo).

## Acceptance Criteria **[REQUIRED]**

- [ ] A minimal React app (in the test) mounts `StardustAdapterProvider` with fake content and a mock frame-link peer; sending `cms/requestTargetPositions` yields the expected `ContentTarget[]` matching the mounted `EditableTarget` tree.
- [ ] Triggering a mocked resize/mutation causes exactly one throttled `cms/sendElementPositions` push per frame (integrates SIFR-T-0015 behavior).
- [ ] The public iframe-side entry (e.g. `src/iframe/index.ts` re-exported from the package root) exports `StardustAdapterProvider`, `EditableTarget`, the content renderer, and the style wrapper; a consumer can import them from `@stardust-cms/iframe-adapter`.
- [ ] The package builds (type-check + build script) with the iframe entry exported and no leaked internal-only imports.
- [ ] `npm test` and the build pass; the integration test file is included in the test suite.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: End-to-end request/response
- **Test ID**: TC-001
- **Preconditions**: Provider mounted with an `EditableTarget` tree and mock frame-link peer.
- **Steps**:
  1. Peer sends `cms/requestTargetPositions`.
- **Expected Results**: Peer receives `ContentTarget[]` matching the mounted tree (ids, children, geometry).
- **Status**: Pass/Fail/Blocked

### Test Case 2: Export surface
- **Test ID**: TC-002
- **Preconditions**: Package built.
- **Steps**:
  1. Import each public symbol from the package entry.
- **Expected Results**: All exports resolve; types are available; build succeeds.
- **Status**: Pass/Fail/Blocked

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Write a jsdom Jest integration test wiring a mock frame-link peer (register/subscribe/post doubles) to a mounted provider + component tree. Assert request/response and one throttled push per frame. Create/confirm `src/iframe/index.ts` exporting the public symbols and re-export from the package root entry per the package's export map. Keep the full two-frame integration for SIFR-I-0004's demo; this stays single-process with a mock peer.

### Dependencies
Depends on all prior tasks landing: SIFR-T-0006 (discovery), SIFR-T-0013 (provider), SIFR-T-0015 (observers/throttle), SIFR-T-0016 (components). Consumes SIFR-I-0001 message names/types. Downstream: SIFR-I-0003 and SIFR-I-0004 import this entry.

### Risk Considerations
Small and design-clear once 1–4 land, but export-map/build wiring can surface packaging issues (module format, types path) — verify the built artifact imports cleanly, not just the source.

**Recommended Agent: opus + low**

## Status Updates **[REQUIRED]**

*To be added during implementation*