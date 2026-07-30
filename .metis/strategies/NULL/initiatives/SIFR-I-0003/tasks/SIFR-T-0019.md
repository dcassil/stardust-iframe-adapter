---
id: targetareaoverlay-and
level: task
title: "TargetAreaOverlay And ContentItemOverlay Unstyled Primitives With Drag/Drop Wiring"
short_code: "SIFR-T-0019"
created_at: 2026-07-30T16:03:40.677588+00:00
updated_at: 2026-07-30T16:03:40.677588+00:00
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

# TargetAreaOverlay And ContentItemOverlay Unstyled Primitives With Drag/Drop Wiring

## Parent Initiative

[[SIFR-I-0003]] — Host-Side Overlay Adapter

## Objective

Implement the two stateless, unstyled React overlay primitives that render absolutely-positioned boxes from mapped geometry and forward pointer/drag events as structured callbacks: `TargetAreaOverlay` (successor to `code_temp/Stardust-CMS-APP-Original-backup/client/builder/src/cms_targets/CMSTargetAreas.tsx`) and `ContentItemOverlay` (successor to `CMSTargetItem.tsx`). These satisfy REQ-004, NFR-004 (no visual styling beyond positioning), and provide the drag/drop surface that emits the structured operations of REQ-005. They consume `MappedGeometry`/`MappedTarget` from SIFR-T-0014/SIFR-T-0018 and the operation callbacks/types from SIFR-T-0020.

## Acceptance Criteria

- [ ] `TargetAreaOverlay` renders a single absolutely-positioned box using `top/left/width/height` taken directly from a `MappedGeometry` (mirroring `CMSTargetAreas`'s positioning model); it applies no CSS classes or visual styling beyond `position: absolute` and the four geometry properties, and accepts `className`/`style` props for consumer styling (NFR-004).
- [ ] When the target has content, `TargetAreaOverlay` renders one child `ContentItemOverlay` per content item; when empty, it renders an empty drop zone — mirroring the prototype's empty-vs-populated branch in `CMSTargetAreas.tsx`.
- [ ] `TargetAreaOverlay` wires `onDragOver` (to indicate a valid drop and compute insert index) and `onDrop` (to construct and emit the operation), invoking the `onInsert`/`onMove` callbacks with the structured op built by the SIFR-T-0020 constructor from `event.dataTransfer`.
- [ ] `ContentItemOverlay` renders a per-content absolutely-positioned box and forwards select/hover/drag intent via callbacks (`onSelect(targetId, contentId)`, drag start populating `dataTransfer` for move operations).
- [ ] Neither component imports React context from Stardust nor any content store; all state comes from props and all intent leaves via callbacks (NFR-002).
- [ ] Unit tests (Jest + `@testing-library/react` + jsdom) assert: boxes render at the exact mapped coordinates; empty vs populated branch renders the correct children; a simulated drop fires `onInsert` with the expected structured op; a click fires `onSelect` with the correct ids.

## Test Cases

### Test Case 1: Renders at mapped coordinates, populated branch
- **Test ID**: TC-001
- **Preconditions**: Overlay importable; a `MappedTarget` with mapped geometry `{ top: 80, left: 40, width: 200, height: 50 }` and two content items.
- **Steps**: Render `TargetAreaOverlay` with that target.
- **Expected Results**: Root box has `top:80px;left:40px;width:200px;height:50px`; two `ContentItemOverlay` children render; no drop-zone placeholder.

### Test Case 2: Drop emits structured insert
- **Test ID**: TC-002
- **Preconditions**: Rendered overlay with an `onInsert` spy; a `dataTransfer` carrying `{ type: 'text' }`.
- **Steps**: Fire `dragOver` then `drop` at index 1.
- **Expected Results**: `onInsert(targetId, 1, { type: 'text' })` is called exactly once; no content state is mutated inside the component.

## Implementation Notes

### Technical Approach
Keep both components pure/presentational. Positioning comes straight from `MappedGeometry`; do not recompute geometry here (that is `mapGeometry`'s job in SIFR-T-0014). Insert-index computation on `onDragOver`/`onDrop` should derive from pointer position relative to existing item boxes. Use the op constructors from SIFR-T-0020 rather than assembling ops inline, so the `dataTransfer` parsing lives in one place. Carry the empty-vs-populated branch faithfully from `CMSTargetAreas.tsx` but drop its Stardust-specific classNames.

### Dependencies
- Upstream: SIFR-T-0014 (`MappedGeometry`), SIFR-T-0018 (`MappedTarget` shape), SIFR-T-0020 (op types + `dataTransfer`→op constructors, `onInsert`/`onMove`/`onSelect` signatures).
- Downstream: SIFR-I-0004 demo styles and composes these primitives; SIFR-T-0021 exports them from the host package entry.

### Risk Considerations
Keeping styling out is a hard requirement (NFR-004) — a regression that adds visual CSS reduces reuse. Insert-index math is the subtle part; cover it with tests for drops above/below/between items.

Recommended Agent: opus + medium

## Status Updates

*To be added during implementation*
