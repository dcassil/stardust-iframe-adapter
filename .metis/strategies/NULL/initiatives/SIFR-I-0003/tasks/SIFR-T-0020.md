---
id: structured-operation-types
level: task
title: "Structured Operation Types, dataTransfer-To-Op Construction, And Connection-State Exposure"
short_code: "SIFR-T-0020"
created_at: 2026-07-30T16:03:43.105404+00:00
updated_at: 2026-07-30T16:03:43.105404+00:00
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

# Structured Operation Types, dataTransfer-To-Op Construction, And Connection-State Exposure

## Parent Initiative

[[SIFR-I-0003]] — Host-Side Overlay Adapter

## Objective

Define the structured edit-operation vocabulary (`InsertOp`/`MoveOp`/`SelectOp`) that the host emits via callbacks instead of mutating a content store, implement the pure constructor that builds these ops from a drop's `DataTransfer`, and define the `connectionState` type the hook exposes. This replaces `useCMSTarget.tsx`'s direct `addContent`/`moveContent` calls (REQ-005, NFR-002) and provides the successor to the prototype's `ConnectStatus`. The op vocabulary must align with SVER's operation vocabulary so no adapter glue is needed downstream. This task is small and its design is settled once the overlays (SIFR-T-0019) exist.

## Acceptance Criteria

- [ ] Exported types `InsertOp`, `MoveOp`, `SelectOp` (and a `StardustHostOp` union) match the callback signatures named in the initiative: `onInsert(targetId, index, payload)`, `onMove(from, to)`, `onSelect(targetId, contentId?)` — e.g. `InsertOp = { kind: 'insert'; targetId: string; index: number; payload: { type: string; ... } }`, `MoveOp = { kind: 'move'; from: {...}; to: {...} }`, `SelectOp = { kind: 'select'; targetId: string; contentId?: string }`.
- [ ] The op field names/shape are cross-referenced against SVER's operation types and documented in the file where they intentionally match or intentionally diverge, so no adapter glue is required at the SVER boundary (initiative risk).
- [ ] A pure constructor `opFromDataTransfer(dataTransfer, context)` reads type/contentId/index/target from a drop's `DataTransfer` and returns the correct `InsertOp` (new block) or `MoveOp` (existing content being relocated), with no DOM mutation and no store access.
- [ ] A `ConnectionState` type (e.g. `'connecting' | 'connected' | 'error' | 'disconnected'`) is exported for `useStardustHost` to return, successor to the prototype `ConnectStatus`, enabling the demo's connect/error UI.
- [ ] The package never imports a content store; these types and the constructor are the only contract by which edit intent leaves the package (NFR-002).
- [ ] Unit tests (Jest) cover `opFromDataTransfer`: a text-block drop yields the expected `InsertOp`; a drag of an existing content item yields the expected `MoveOp`; malformed/empty `dataTransfer` is handled deterministically (returns null or a well-defined result rather than throwing).

## Test Cases

### Test Case 1: New block drop → InsertOp
- **Test ID**: TC-001
- **Preconditions**: `opFromDataTransfer` importable; a `DataTransfer` carrying `type=text`, no contentId.
- **Steps**: Call `opFromDataTransfer(dt, { targetId: 't1', index: 2 })`.
- **Expected Results**: `{ kind: 'insert', targetId: 't1', index: 2, payload: { type: 'text' } }`.

### Test Case 2: Existing item drag → MoveOp
- **Test ID**: TC-002
- **Preconditions**: A `DataTransfer` carrying an existing `contentId=c9` and source target/index.
- **Steps**: Call `opFromDataTransfer(dt, { targetId: 't2', index: 0 })`.
- **Expected Results**: `{ kind: 'move', from: { targetId, index, contentId: 'c9' }, to: { targetId: 't2', index: 0 } }`.

## Implementation Notes

### Technical Approach
Keep types and the constructor framework-agnostic (no React). The constructor is pure and fully unit-testable. Determine insert-vs-move by presence of an existing `contentId` in the `dataTransfer`. Place these in a shared host module (e.g. `src/host/operations.ts`) imported by both the hook (SIFR-T-0018) and overlays (SIFR-T-0019). Align field names with SVER now to avoid downstream glue.

### Dependencies
- Upstream: SIFR-I-0001 protocol conventions; SVER operation vocabulary (for alignment); benefits from SIFR-T-0019 to confirm the exact `dataTransfer` fields the overlays set.
- Downstream: SIFR-T-0018 returns `ConnectionState`; SIFR-T-0019 calls `opFromDataTransfer` and the `onInsert`/`onMove`/`onSelect` callbacks; SIFR-I-0004/SVER consume the emitted ops.

### Risk Considerations
SVER-vocabulary mismatch forces adapter glue — mitigate by cross-referencing SVER's types during this task and documenting the mapping.

Recommended Agent: opus + low

## Status Updates

*To be added during implementation*
