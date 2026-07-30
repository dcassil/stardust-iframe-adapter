---
id: overlay-styling-and-edit-controls
level: task
title: "Overlay Styling And Edit Controls And Content Side Panel"
short_code: "SIFR-T-0010"
created_at: 2026-07-30T16:02:11.087828+00:00
updated_at: 2026-07-30T16:02:11.087828+00:00
parent: SIFR-I-0004
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0004
---

# Overlay Styling And Edit Controls And Content Side Panel

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0004]]

## Objective **[REQUIRED]**

Style the (intentionally unstyled) SIFR-I-0003 overlay primitives into a convincing admin editing experience and wire the full set of editing interactions: select, add, move, edit, delete. Add a content side panel with basic fields (text content, image src) for the selected content that pushes updates live. Each interaction emits a structured operation into the content store (SIFR-T-0009), which produces a new snapshot re-injected to the site via `cms/sendElements`, after which the iframe streams new geometry and overlays remap. This task delivers the initiative's headline interactive UI (REQ-003, REQ-004) and the visual polish (NFR-004).

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

*To be added during implementation*