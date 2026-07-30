---
id: extract-pure-discovertargets
level: task
title: "Extract pure discoverTargets module with Geometry serialization and unit tests"
short_code: "SIFR-T-0006"
created_at: 2026-07-30T16:01:32.564616+00:00
updated_at: 2026-07-30T16:01:32.564616+00:00
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

# Extract pure discoverTargets module with Geometry serialization and unit tests

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0002]]

## Objective **[REQUIRED]**

Extract a pure, framework-agnostic discovery module — `discoverTargets(root: Document | HTMLElement): ContentTarget[]` — from the prototype `code_temp/Stardust-CMS-App/demoApp/src/lib/CmsTarget.utils.ts` (`getElementsWithPositionData()`). The module walks `[data-cms]` and `[data-cms-content]` elements, converts each element's `getBoundingClientRect()` into the serializable `Geometry` type from SIFR-I-0001 (never a raw `DOMRect`), and returns a deterministic, document-ordered `ContentTarget[]`. This is the correctness substrate that host-side overlay mapping (SIFR-I-0003) consumes, so its determinism and serialization guarantees are load-bearing.

## Acceptance Criteria **[REQUIRED]**

- [ ] `discoverTargets(root)` is exported as a pure function with no React, no `frame-link`, and no window-event dependencies (imports only the SIFR-I-0001 protocol types).
- [ ] Returns exactly one `ContentTarget` per `[data-cms]` element found under `root`, in stable document order (NFR-004).
- [ ] Each target's `isContainer` is derived from the presence of `[data-cms-container-target]`; `children` are collected from descendant `[data-cms-content]` elements, each child carrying `contentId` (element id), `index`, `isContainer`, `styleGroup` (from `data-style-group`), and serialized `Geometry` (REQ-002).
- [ ] All geometry crossing the boundary is a plain `Geometry` object with the eight numeric fields copied field-by-field from `getBoundingClientRect()`; asserting `instanceof DOMRect` is false (REQ-003).
- [ ] The prototype's container inset adjustment (`top - 10`, `height - 10`) is preserved behind a named, documented, overridable constant (e.g. `CONTAINER_INSET`) rather than a magic number.
- [ ] Unit tests cover: empty target (no content children), nested container targets, multiple content children with correct indices, style-group attribution, and geometry serialization (plain object, eight numeric fields). 100% branch coverage of the discovery module (container vs non-container, empty vs populated, nested).
- [ ] `npm test` (Jest + jsdom) passes for the new discovery test file.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: Empty target discovery
- **Test ID**: TC-001
- **Preconditions**: jsdom document with a single `[data-cms]` element containing no `[data-cms-content]`.
- **Steps**:
  1. Render fixture.
  2. Call `discoverTargets(document)`.
- **Expected Results**: One `ContentTarget` with empty `children`, `isContainer` false, valid `Geometry`.
- **Status**: Pass/Fail/Blocked

### Test Case 2: Geometry serialization
- **Test ID**: TC-002
- **Preconditions**: Fixture with mocked `getBoundingClientRect` returning known values.
- **Steps**:
  1. Call `discoverTargets`.
  2. Inspect the returned geometry object.
- **Expected Results**: Plain object with eight numeric fields matching the mock; not a `DOMRect` instance.
- **Status**: Pass/Fail/Blocked

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Port `getElementsWithPositionData()` from `CmsTarget.utils.ts` into a new pure module (e.g. `src/iframe/discovery.ts`). Replace ad-hoc rect passing with an explicit `toGeometry(rect: DOMRect): Geometry` helper copying `x, y, width, height, top, right, bottom, left`. Query order must follow `querySelectorAll` document order. Derive `contentId` from the element `id`, `index` from child position, `styleGroup` from `getAttribute('data-style-group')`. Keep the module free of any rendering or transport concern.

### Dependencies
Depends on SIFR-I-0001 finalized `Geometry` and `ContentTarget` types. No other SIFR-I-0002 tasks block this; it is Phase 1 and unblocks tasks SIFR-T-0007/0008/0010.

### Risk Considerations
The `-10` container inset may be layout-specific; isolate it as a documented constant and test container geometry explicitly so downstream overlay mapping can reason about it.

**Recommended Agent: opus + medium**

## Status Updates **[REQUIRED]**

*To be added during implementation*