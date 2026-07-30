---
id: implement-editabletarget-content
level: task
title: "Implement EditableTarget, content renderer, and style wrapper components"
short_code: "SIFR-T-0016"
created_at: 2026-07-30T16:03:06.500976+00:00
updated_at: 2026-07-30T16:48:46.098498+00:00
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

# Implement EditableTarget, content renderer, and style wrapper components

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0002]]

## Objective **[REQUIRED]**

Implement the iframe-side components that emit the `data-*` attributes discovery (SIFR-T-0006) and the style engine (SIFR-I-0005) rely on: `EditableTarget` (successor to `CmsTarget.tsx`) emitting `data-cms` / `data-cms-container-target`; a content renderer (successor to `CmsContent.tsx`) emitting `data-cms-content` / `data-cms-container` and rendering by protocol-defined content type (text/number/image/container); and a style wrapper (successor to `CmsStyled.tsx`) emitting `data-style-element` / `data-style-name` / `data-style-id` / `data-style-group` / `data-style-rules`. Content types must come from the SIFR-I-0001 protocol, not hardcoded Stardust app types, keeping the package app-agnostic.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `EditableTarget` renders a wrapper emitting `data-cms` (target id) and `data-cms-container-target` when it is a container, and renders its children.
- [ ] The content renderer emits `data-cms-content` (and `data-cms-container` for container content) and renders by protocol content type — text, number, image, container — dispatching on the SIFR-I-0001 type discriminant, with no Stardust-app-specific type references.
- [ ] The style wrapper emits `data-style-element`, `data-style-name`, `data-style-id`, `data-style-group`, and `data-style-rules` so SIFR-I-0005 can later target it; it renders its child unchanged otherwise.
- [ ] The emitted attributes are exactly those `discoverTargets` (SIFR-T-0006) reads, verified by mounting a component tree and running discovery over it end-to-end in jsdom.
- [ ] Components depend only on `react` and the SIFR-I-0001 protocol types (NFR-003).
- [ ] Unit tests render each component and assert the presence/values of the emitted `data-*` attributes for content children, style groups, and container vs non-container targets; `npm test` passes.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: EditableTarget attribute emission
- **Test ID**: TC-001
- **Preconditions**: Render `<EditableTarget targetId="hero">` (container and non-container variants).
- **Steps**:
  1. Render.
  2. Query the rendered DOM.
- **Expected Results**: `data-cms="hero"` present; `data-cms-container-target` present only for container variant.
- **Status**: Pass/Fail/Blocked

### Test Case 2: Content renderer by type
- **Test ID**: TC-002
- **Preconditions**: Content fixtures for text/number/image/container types.
- **Steps**:
  1. Render each through the content renderer.
- **Expected Results**: `data-cms-content` emitted; each type rendered correctly; container emits `data-cms-container`.
- **Status**: Pass/Fail/Blocked

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Port `CmsTarget.tsx`, `CmsContent.tsx`, and `CmsStyled.tsx` into `src/iframe/` components (`EditableTarget`, content renderer, style wrapper). Keep them presentational — they only emit the `data-*` attributes and render children/content by protocol type. Dispatch content rendering on the SIFR-I-0001 content-type discriminant via a switch. Do not import Stardust app content models. Consume provider content context from SIFR-T-0013 where the renderer needs host-injected content.

### Dependencies
Follows the established attribute pattern from the prototype `CmsTarget.tsx`/`CmsContent.tsx`/`CmsStyled.tsx`. Consumes SIFR-I-0001 content types; integrates with SIFR-T-0013 provider context. Attributes must stay in sync with SIFR-T-0006 discovery selectors.

### Risk Considerations
Attribute name drift between components and discovery would silently break mapping — mitigate with the end-to-end mount+discover test and by centralizing attribute-name constants shared with SIFR-T-0006.

**Recommended Agent: sonnet + medium**

## Status Updates **[REQUIRED]**

## Completion notes

Added `EditableTarget`, `ContentRenderer`, `StyleElement` (successors to
CmsTarget/CmsContent/CmsStyled), all react-only + protocol-typed (NFR-003).
`EditableTarget` emits `data-cms` and (only when `isContainer`)
`data-cms-container-target`, and renders host-injected content pulled from
`StardustContentContext`, each item wrapped in `StyleElement`. `ContentRenderer`
emits `data-cms-content` (+ `data-cms-container` for containers) and dispatches
on the protocol `ContentKind` discriminant (text/number/image/container) with an
exhaustiveness `never` guard and no Stardust-app types; container content
renders two nested `EditableTarget`s. `StyleElement` emits all five
`data-style-*` attributes and passes the child through. Centralized every
attribute name in `src/iframe/attributes.ts`, now the single source shared with
discovery (SIFR-T-0006 refactored to import it) — eliminating name drift.
Protocol change: firmed up `ContentPayload` (was minimal `{html?,data?}`) with a
required, serializable `content: CmsContent` carrying `{id,type,value?,styleGroup?,
column?,data?}` and a new `ContentKind` union — grounded in the prototype
CmsContent switch, kept app-agnostic and structured-clone-safe; updated the
protocol fixture accordingly. Tests (`components.test.tsx`): per-component
`data-*` emission for text/number/image/container + style groups + container vs
non-container, plus an end-to-end mount-then-`discoverTargets` test proving the
emitted attributes are exactly what discovery reads. 42 tests green.