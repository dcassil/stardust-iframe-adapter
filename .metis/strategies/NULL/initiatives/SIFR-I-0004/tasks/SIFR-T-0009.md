---
id: in-memory-content-store-behind
level: task
title: "In-Memory Content Store Behind Swappable Interface With Operation Application"
short_code: "SIFR-T-0009"
created_at: 2026-07-30T16:02:06.885799+00:00
updated_at: 2026-07-30T17:31:22.022342+00:00
parent: SIFR-I-0004
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0004
---

# In-Memory Content Store Behind Swappable Interface With Operation Application

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0004]]

## Objective **[REQUIRED]**

Build the in-memory content store that backs the admin's editing, sitting behind a small, well-defined interface so the SVER project can later swap in its versioned engine without touching overlay/demo UI (initiative NFR-003). The store holds the demo content tree, applies structured operations (insert/move/edit/delete) matching SIFR-I-0003's structured-op vocabulary, and produces the payload re-sent to the site via `cms/sendElements`. Correctness of operation application is unit-tested against the same operation set SVER will later satisfy.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] A `ContentStore` interface is defined with methods to read current content, apply a structured operation, and subscribe to changes — deliberately shaped to be implementable by SVER's versioned engine.
- [ ] An in-memory implementation holds the demo content tree (blocks + nested container children, ids aligned with SIFR-T-0007) and applies the four structured operations: insert, move, edit, delete.
- [ ] Operation shapes align with SIFR-I-0003's structured ops (e.g. `InsertOp`) so overlay/panel code emits ops the store consumes directly.
- [ ] Applying an operation produces an updated content snapshot suitable for `cms/sendElements` re-injection to the demo site.
- [ ] Insert into a nested container places the new block at the correct child position; move reorders within/across targets; edit updates a field; delete removes a block/child.
- [ ] Unit tests cover every operation including nested-container insert/move and edge cases (insert at boundary, move to same position, delete last child).
- [ ] The store exposes no dependency on React or the transport — it is a pure module consumable by both the demo and (later) SVER.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: Structured operations apply correctly
- **Test ID**: TC-001
- **Preconditions**: Store seeded with the demo content fixture.
- **Steps**:
  1. Apply insert, move, edit, delete operations in sequence, including into the nested container.
  2. Read the resulting snapshot after each.
- **Expected Results**: Each snapshot reflects exactly the applied operation; nested-container child order and ids are correct; snapshot matches the shape expected by `cms/sendElements`.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

### Test Case 2: Interface parity for SVER swap
- **Test ID**: TC-002
- **Preconditions**: The `ContentStore` interface and in-memory implementation.
- **Steps**:
  1. Exercise the interface through a test double / second implementation stub against the same operation set.
  2. Confirm the demo UI code depends only on the interface, not the concrete class.
- **Expected Results**: Nothing in the overlay/panel code references the concrete in-memory store; swapping the implementation requires no UI changes.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

## Implementation Notes **[CONDITIONAL: Technical Task]**

Recommended Agent: opus + medium

### Technical Approach
Define `ContentStore` as a TypeScript interface (`getContent()`, `apply(op)`, `subscribe(listener)`). Implement `InMemoryContentStore` holding an immutable-ish content tree keyed by block id, with a reducer per operation type. Reuse SIFR-I-0003's structured-op types directly (import `InsertOp` etc.) so there is a single vocabulary. Produce snapshots in the shape the demo site expects for `cms/sendElements`. Keep it framework-free; the admin will wrap it in a React hook/context in SIFR-T-0010. Write thorough Jest tests for each operation and nested cases.

### Dependencies
- SIFR-I-0003 structured-op types (`InsertOp` and siblings).
- Content shape coordinated with SIFR-T-0007 (block/child ids and types).
- Consumed by SIFR-T-0010 (overlay/panel edit controls emit ops here) and re-injection path.
- Interface anticipates SVER's "Integration With Stardust Iframe Demo" replacement (NFR-003).

### Risk Considerations
- The interface may not match SVER's operation vocabulary — mitigate by aligning op shapes with SIFR-I-0003's structured ops during implementation (initiative risk).
- Snapshot shape must exactly match what the site renders and what `cms/sendElements` transports; validate against SIFR-T-0007's content model early.

## Status Updates **[REQUIRED]**

### Completion notes

Built the content store under `demo/shared/src/store/` — a pure, React/transport-free module.

- **Swappable interface (`ContentStore`):** `getSnapshot()`, `apply(op)`, `subscribe(listener)`. Snapshot type is `readonly ContentPayload[]` — exactly the `cms/sendElements` element shape — so a subscriber feeds each item straight to the sender. Deliberately minimal for SVER to reimplement (NFR-003).
- **Op vocabulary:** `insert` and `move` reuse SIFR-I-0003's `InsertOp`/`MoveOp` from `@stardust-cms/iframe-adapter/host` directly (no adapter glue). `edit` and `delete` are store-level ops (host overlay vocabulary is insert/move/select only), defined with the same `kind` discriminant. `select` is excluded — it mutates nothing.
- **`InMemoryContentStore`:** holds `Map<targetId, CmsContent[]>`; flat targets and the nested container's child targets (`col.1`/`col.2` style) are all just map entries. Each op is a reducer over the tree; snapshots are cloned so they never alias internal state. Insert clamps out-of-range indices (append at boundary); move removes-then-inserts (handles within/cross-target and same-position); edit preserves id+type; delete removes by id.
- **`createDemoContentStore()`** seeds from the shared `SEED_CONTENT`, returning the interface type (not the concrete class).
- **Tests (14, all pass) — `demo/vitest.config.ts`:** insert (incl. nested container, boundary/append, unknown-type→text fallback), move (within, cross-target-into-container, same-position no-op), edit, delete (incl. last child of a container → empty), subscribe/unsubscribe, snapshot non-aliasing, and TC-002 interface parity (a second `ContentStore` impl satisfies the same op set; UI depends only on the interface).

Verification: `npx vitest run -c demo/vitest.config.ts` → 14 passed; admin tsconfig (which includes `../shared`) typechecks clean; library `tsc` + `vitest` (79) untouched and green.

### TC-001: Pass — structured operations apply correctly incl. nested-container insert/move; snapshot matches cms/sendElements shape.
### TC-002: Pass — interface parity verified via a second implementation; no UI coupling to the concrete class.