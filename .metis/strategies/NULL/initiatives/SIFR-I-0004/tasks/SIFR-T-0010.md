---
id: overlay-styling-and-edit-controls
level: task
title: "Overlay Styling And Edit Controls And Content Side Panel"
short_code: "SIFR-T-0010"
created_at: 2026-07-30T16:02:11.087828+00:00
updated_at: 2026-07-30T17:31:35.294473+00:00
parent: SIFR-I-0004
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/active"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0004
---

# Overlay Styling And Edit Controls And Content Side Panel

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0004]]

## Objective **[REQUIRED]**

Style the (intentionally unstyled) SIFR-I-0003 overlay primitives into a convincing admin editing experience and wire the full set of editing interactions: select, add, move, edit, delete. Add a content side panel with basic fields (text content, image src) for the selected content that pushes updates live. Each interaction emits a structured operation into the content store (SIFR-T-0009), which produces a new snapshot re-injected to the site via `cms/sendElements`, after which the iframe streams new geometry and overlays remap. This task delivers the initiative's headline interactive UI (REQ-003, REQ-004) and the visual polish (NFR-004).

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] The SIFR-I-0003 overlay primitives are styled (clean outline, hover/selected states) using the demo's small token set (spacing/colors/overlay outline) so the admin looks intentional (NFR-004).
- [ ] Overlays render over every target and over container children, positioned via the mapped geometry exposed by the admin shell (SIFR-T-0008).
- [ ] Select: clicking an overlay selects its content and populates the side panel.
- [ ] Add: a block palette lets the user add/drag a block onto a target/area, emitting an insert op (into the nested container when dropped there).
- [ ] Move: an affordance reorders/moves a block, emitting a move op.
- [ ] Delete: an affordance removes a block, emitting a delete op.
- [ ] Edit: the side panel edits basic fields (text content, image src) for the selected content and emits edit ops that push live.
- [ ] Every operation flows store → `cms/sendElements` → site re-render → overlay remap, visible immediately in the iframe.
- [ ] Component tests (@testing-library/react) cover panel field-edit → op emission and overlay select wiring.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: Edit a field live
- **Test ID**: TC-001
- **Preconditions**: Both apps running, connected.
- **Steps**:
  1. Click the hero overlay to select it.
  2. Edit the text field in the side panel.
- **Expected Results**: Panel populates on select; typing pushes an edit op; the iframe hero text updates immediately and its overlay stays aligned.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

### Test Case 2: Add a block into the nested container
- **Test ID**: TC-002
- **Preconditions**: Connected; nested container target present.
- **Steps**:
  1. Drag a text block from the palette into the nested container.
  2. Observe the iframe and overlays.
- **Expected Results**: An insert op targets the container; the new block renders in the correct child position; a new overlay appears aligned over it.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

## Implementation Notes **[CONDITIONAL: Technical Task]**

Recommended Agent: opus + medium

### Technical Approach
Create styled wrapper components around the SIFR-I-0003 overlay primitives (outline box, hover/selected variants) driven by a small token module. Position overlays absolutely over the scaled canvas using the mapped geometry from SIFR-T-0008. Build a block palette and drag-to-drop interactions that emit insert ops; add per-overlay move/delete affordances. Build the side panel: on select, read the selected content from the store and render fields (text, image src); on change, emit edit ops. Wrap SIFR-T-0009's `ContentStore` in a React hook/context; every emitted op calls `store.apply(op)`, and a subscription pushes the new snapshot through `cms/sendElements`. Add @testing-library/react tests for the panel and select wiring.

### Dependencies
- SIFR-T-0008 (admin shell: mapped geometry, scale, connection).
- SIFR-T-0009 (content store: structured ops, snapshots) — this task depends only on the store interface.
- SIFR-I-0003 overlay primitives and structured-op types.
- Reserves light hooks for SIFR-I-0005 (style-editing UI) and SIFR-I-0006 (presence) without implementing them.

### Risk Considerations
- Overlay alignment during move/insert and after re-injection is where geometry bugs surface; verify remap after each op and rely on the SIFR-T-0011 E2E to guard regressions.
- Keep UI coupled to the store interface, not the concrete implementation, so SVER's swap holds (NFR-003).

## Status Updates **[REQUIRED]**

### Completion notes

Built the full interactive editing layer under `demo/admin/src/editing/`, replacing the SIFR-T-0008 seam stub.

- **Styled overlays (`Overlays.tsx`):** wraps the unstyled SIFR-I-0003 `TargetAreaOverlay` (dashed drop area; solid pink border for container targets; accent fill on hover/drag-over) and `ContentItemOverlay` (selectable box; inset ring on hover; pink ring + tint when selected). A per-item circular delete affordance appears on group hover. All geometry comes from `useHost()` (already `mapGeometry`-mapped); nothing is recomputed. Overlays render over every target and every container child.
- **Select / Add / Move / Delete / Edit:** `onSelect` (overlay click) populates the panel; palette drag sets `DATA_TRANSFER_KEYS.type` so a drop on a target resolves via the library's `opFromDataTransfer` into an `InsertOp` (with a type-defaulted value); item drag + drop resolves into a `MoveOp`; the delete button emits a `delete` op; the side panel emits `edit` ops per keystroke.
- **Side panel (`SidePanel.tsx`):** on select shows id/type/target + a text field (text/number) or image-src field (image); typing pushes edit ops live.
- **Store wiring (`useContentStore.ts` + `StoreBridge.tsx`):** the admin wraps the SIFR-T-0009 `ContentStore` (via `createDemoContentStore()`, interface-typed — NFR-003) in a hook that, on every applied op, pushes the full snapshot through a host-side `cms/sendElements` sender (`useSendElements.ts`, a local frame-link registry binding). Because the provider's per-slot merge never deletes, the hook additionally blanks orphaned trailing slots after deletes/moves. On (re)connect it re-injects the full snapshot. `StoreBridge` mounts the hook inside `HostContext`/`FrameLinkProvider` scope and lifts `apply`+`snapshot` to the editing layer.
- **Live flow verified end to end (Playwright, real browser):** selected the hero title overlay → its selection ring appeared and the panel populated (id=hero-title, type=text) → typed in the panel → the iframe hero text updated to the new value AND the hero overlay stayed aligned to the re-rendered (shorter) text. Screenshot captured. This is store → `cms/sendElements` → site re-render → overlay remap, visible immediately.
- **Component tests (5, all pass; `demo/admin/src/editing/editing.test.tsx`, @testing-library/react):** overlay select → `onSelect(targetId, contentId)`; drop of a palette block on the `split-col.1` container target → `insert` op at the computed index; side-panel text edit → `edit` ops with the typed value; image selection shows the src field; delete affordance → `onDeleteItem`.
- **Reserved seams for downstream initiatives:** the sidebar (`admin-sidebar`) and `EditingContext` are the natural mount points for SIFR-I-0005's style panel; the `Editing` render-prop and `HostContext` are where a SIFR-I-0006 presence toggle/overlay would hook in. Neither is implemented here.

Verification: all three tsconfigs typecheck clean; demo vitest 19 passed (14 store + 5 component); library `tsc --noEmit` + `vitest run` (79) untouched and green.

### TC-001: Pass — select → panel edit → iframe hero text updates live, overlay stays aligned (verified in-browser + component test).
### TC-002: Pass — drop of a palette block on the nested container target emits an insert op at the correct child index (component test; a real drag is additionally exercised by SIFR-T-0011).