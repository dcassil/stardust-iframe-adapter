---
id: in-memory-content-store-behind
level: task
title: "In-Memory Content Store Behind Swappable Interface With Operation Application"
short_code: "SIFR-T-0009"
created_at: 2026-07-30T16:02:06.885799+00:00
updated_at: 2026-07-30T16:02:06.885799+00:00
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

# In-Memory Content Store Behind Swappable Interface With Operation Application

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0004]]

## Objective **[REQUIRED]**

Build the in-memory content store that backs the admin's editing, sitting behind a small, well-defined interface so the SVER project can later swap in its versioned engine without touching overlay/demo UI (initiative NFR-003). The store holds the demo content tree, applies structured operations (insert/move/edit/delete) matching SIFR-I-0003's structured-op vocabulary, and produces the payload re-sent to the site via `cms/sendElements`. Correctness of operation application is unit-tested against the same operation set SVER will later satisfy.

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

*To be added during implementation*