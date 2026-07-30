---
id: structured-clone-serializability
level: task
title: "Structured-Clone Serializability Round-Trip Tests Over Sample Payloads"
short_code: "SIFR-T-0003"
created_at: 2026-07-30T16:01:21.123510+00:00
updated_at: 2026-07-30T16:20:21.359723+00:00
parent: SIFR-I-0001
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0001
---

# Structured-Clone Serializability Round-Trip Tests Over Sample Payloads

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0001]]

## Objective **[REQUIRED]**

Prove NFR-001 (serializability) for the protocol module by adding a focused test file that runs each sample payload type through a structured-clone round-trip and asserts deep equality. This guarantees every geometry, scroll, content-target, and message payload survives `postMessage` transport (which uses the structured clone algorithm) with no DOM nodes, functions, or class instances leaking in. It is the runtime companion to SIFR-T-0002's compile-time type assertions.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] A single test file (e.g. `src/protocol/__tests__/serializability.test.ts`) exists using the project's Jest setup.
- [ ] Sample fixtures are constructed for every payload type in the `MessageRegistry`: `Geometry`, `ScrollState`, `ContentTarget` (including nested `ChildContent[]`), and each `cms/*` message request/response payload.
- [ ] Each fixture is round-tripped through `structuredClone(...)` and asserted deep-equal to the original.
- [ ] A negative guard demonstrates the intent: a payload containing a non-cloneable value (e.g. a function or a DOM node) is shown to throw under `structuredClone`, documenting why the plain types are required.
- [ ] `npm test` (or the project's test command) passes with these tests green, and `tsc --noEmit` still passes.
- [ ] Coverage bar met: every registry message key has at least one round-trip case and every payload type has one round-trip case (per the initiative Testing Strategy).

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: Geometry round-trips losslessly
- **Test ID**: TC-001
- **Preconditions**: SIFR-T-0002 protocol module exports `Geometry`.
- **Steps**:
  1. Build a `Geometry` fixture `{ top, right, bottom, left, width, height, x, y }` with distinct numbers.
  2. `const clone = structuredClone(fixture)`.
  3. Assert `clone` deep-equals `fixture`.
- **Expected Results**: Deep equality holds; no error thrown.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

### Test Case 2: ContentTarget with nested ChildContent round-trips
- **Test ID**: TC-002
- **Preconditions**: `ContentTarget` and `ChildContent` exported.
- **Steps**:
  1. Build a `ContentTarget` with a populated `children: ChildContent[]` array, each with `contentId`, `index`, `isContainer`, `styleGroup`, `geometry`.
  2. `structuredClone` it.
  3. Assert deep equality including nested children.
- **Expected Results**: Nested structure clones intact.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

### Test Case 3: Non-cloneable payload throws (negative guard)
- **Test ID**: TC-003
- **Preconditions**: none.
- **Steps**:
  1. Build an object containing a function or DOM node.
  2. Call `structuredClone` inside `expect(() => ...).toThrow()`.
- **Expected Results**: Throws, documenting why plain types are mandated.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Single focused test file following the initiative's stated Jest structured-clone pattern. Use Node's global `structuredClone` (Node 17+). Import fixtures from or alongside the protocol module. Keep it mechanical — no new abstractions.

### Completion notes
Files: `src/protocol/fixtures.ts` (typed fixtures for every payload, `satisfies` the real protocol types so they can't drift) and `src/protocol/__tests__/serializability.test.ts`.
Uses **vitest** (Jest-compatible API) per the package's configured test runner rather than Jest; Node global `structuredClone`.
Covers: Geometry (TC-001), ScrollState, ChildContent, ContentTarget w/ nested ChildContent[] (TC-002), ContentPayload, StyleUpdatePayload; every request/response registry key; a coverage assertion over `MESSAGE_KEYS`; negative guards for a function payload (TC-003, throws) and a class instance (loses prototype/method).
Verification: `npx tsc --noEmit` clean; `npx vitest run` → Test Files 1 passed (1), Tests 14 passed (14).

### Dependencies
Depends on SIFR-T-0002 (protocol types must exist to build fixtures). Independent of SIFR-T-0004 and SIFR-T-0005.

### Risk Considerations
Low risk. The only pitfall is fixtures drifting from the real types — mitigated by importing the actual protocol types so fixtures are type-checked against them.

### Execution profile
Recommended Agent: sonnet + medium

## Status Updates **[REQUIRED]**

*To be added during implementation*