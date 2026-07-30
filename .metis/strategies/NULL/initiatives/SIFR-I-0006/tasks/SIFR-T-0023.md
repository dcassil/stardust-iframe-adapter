---
id: remote-cursor-and-edit-lock
level: task
title: "Remote-Cursor And Edit-Lock Overlays Reusing SIFR-I-0003 Geometry Mapping"
short_code: "SIFR-T-0023"
created_at: 2026-07-30T16:03:56.277815+00:00
updated_at: 2026-07-30T16:03:56.277815+00:00
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

# Remote-Cursor And Edit-Lock Overlays Reusing SIFR-I-0003 Geometry Mapping

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0006]]

## Objective **[REQUIRED]**

Render the visible presence layer in the admin: labeled remote cursors and per-target "editing" lock indicators, driven by the `PresenceProvider.subscribe` stream from SIFR-T-0022. Remote cursor and lock positions MUST be mapped through SIFR-I-0003's centralized `mapGeometry`/scale transform so they land correctly under iframe scale and scroll — reusing the tested overlay coordinate system instead of re-deriving the prototype's collaborator scale math from `useRealTime.tsx`. This satisfies REQ-004 (cursors align under scale/scroll) and REQ-005 (edit-lock indicator shows who is editing which target), and it is the UI successor to `useRealTime.tsx`'s cursor rendering plus `CMSTargetItem.tsx`'s who-is-editing reflection.

## Acceptance Criteria **[REQUIRED]**

- [ ] A `RemoteCursors` overlay component subscribes to a `PresenceProvider` (injected, defaulting to the SIFR-T-0022 `MockPresenceProvider`) and renders one labeled cursor per remote participant that has a `pointer`, showing the participant's `name` and `color`.
- [ ] Each remote cursor's on-screen position is computed by passing the participant's pointer through the SIFR-I-0003 `mapGeometry`/scale transform (the same transform the host overlay uses for target boxes) so cursors track correctly when the iframe is scaled and scrolled.
- [ ] An `EditLockIndicator` renders on/near the target identified by a participant's `editContext.target`, labeled "{name} is editing" — matching the who-is-editing reflection from `CMSTargetItem.tsx`; when no participant is editing a target, no indicator shows.
- [ ] When two participants edit different targets, each target shows its own editor's indicator; the indicator is presented as an edit-lock/presence signal only and copy never claims a merge/conflict-resolution guarantee (NFR-001).
- [ ] Cursors and locks update reactively as the subscribed `participants` list changes, and a participant leaving removes its cursor and any lock indicator promptly.
- [ ] The overlays consume only the presence stream and the SIFR-I-0003 geometry mapping; they do not modify the core SIFR-I-0002/0003 packages.
- [ ] Unit tests assert correct mapped positions (reusing/adjacent to the SIFR-I-0003 geometry tests) and that an editContext produces a lock indicator on the correct target.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: Remote cursor is positioned through the scale/scroll transform
- **Test ID**: TC-001
- **Preconditions**: `RemoteCursors` mounted with a stub provider emitting one remote participant with `pointer = { x, y }`; a known SIFR-I-0003 scale factor and scroll offset applied.
- **Steps**:
  1. Emit a participant with a specific pointer via the stub provider.
  2. Read the rendered cursor's computed style/position.
  3. Change the scale factor and scroll offset and re-emit the same pointer.
- **Expected Results**: The cursor's screen position equals `mapGeometry(pointer, scale, scroll)` in both cases (i.e. it moves consistently with target boxes), not the raw unscaled pointer coordinates.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

### Test Case 2: EditContext renders an edit-lock indicator on the correct target
- **Test ID**: TC-002
- **Preconditions**: `EditLockIndicator` layer mounted with targets `t-hero` and `t-list` present; stub provider ready.
- **Steps**:
  1. Emit participant "Ada" with `editContext = { id: 'c1', target: 't-hero' }`.
  2. Assert an indicator labeled with "Ada" and "editing" appears attached to `t-hero` and none on `t-list`.
  3. Emit a second participant "Grace" editing `t-list`; then emit Ada with `editContext = null`.
- **Expected Results**: After step 2, only `t-hero` shows Ada's editing indicator; after step 3, `t-list` shows Grace's indicator and `t-hero` shows none (Ada released). No copy states or implies collaborative/merged editing.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

## Implementation Notes **[CONDITIONAL: Technical Task]**

Recommended Agent: opus + medium

### Technical Approach
Build two overlay React components in the admin/demo layer: `RemoteCursors` (absolute-positioned cursor markers with a name label chip colored by `participant.color`) and `EditLockIndicator` (a badge/outline anchored to the target element identified by `editContext.target`). Both take a `PresenceProvider` prop and subscribe in an effect, storing the latest `participants` array in state and unsubscribing on unmount. Import the SIFR-I-0003 geometry utility (`mapGeometry`/scale) — the same one the host overlay already uses for target boxes — and apply it to `participant.pointer` for cursor placement and to the target's geometry for lock placement, so presence and the existing overlay share one coordinate system. Look up the target element/geometry by `editContext.target` using the same target registry the overlay already maintains (SIFR-I-0003). Keep visual styling light but legible (colored cursor + label, subtle "editing" badge); heavier visual polish is not required here. Mirror `CMSTargetItem.tsx`'s "who is editing" semantics for the label wording ("{name} is editing").

### Dependencies
- Upstream: SIFR-T-0022 (`PresenceProvider`/`Participant` stream) — this task consumes it. SIFR-I-0003 (`mapGeometry`/scale and the target geometry registry) — reused, not reimplemented. Target ids from SIFR-I-0004 (SIFR-T-0007) so `editContext.target` resolves to a real element.
- Grounding reference: `useRealTime.tsx` (cursor rendering + collaborator scale math being centralized here) and `CMSTargetItem.tsx` (who-is-editing indicator).

### Risk Considerations
- Cursor misalignment under scale/scroll is the primary technical risk; mitigate strictly by reusing the tested SIFR-I-0003 `mapGeometry` rather than re-deriving the prototype's math — assert exact mapped positions in tests.
- Target resolution: if `editContext.target` does not match a known target (e.g. race on load), the indicator should no-op gracefully rather than throw.
- Overclaiming in UI copy: keep all labels to "editing"/presence; add no "collaborating"/"co-editing" language (NFR-001).
- Leftover markers on participant leave: ensure cursors and locks clear when the participant drops from the list.

## Status Updates **[REQUIRED]**

*To be added during implementation.*
