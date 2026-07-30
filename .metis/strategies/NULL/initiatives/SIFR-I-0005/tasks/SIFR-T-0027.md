---
id: pure-generatecss-group-scoped
level: task
title: "Pure generateCss group-scoped generator with allowlist filtering"
short_code: "SIFR-T-0027"
created_at: 2026-07-30T16:07:43.143212+00:00
updated_at: 2026-07-30T16:07:43.143212+00:00
parent: SIFR-I-0005
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0005
---

# Pure generateCss group-scoped generator with allowlist filtering

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0005]]

## Objective **[REQUIRED]**

Implement the pure, deterministic `generateCss(styleValues, allowlist)` function that turns style values into group-scoped CSS text. This is Phase 2 and the correctness-critical core of the feature. It groups values by `data-style-group` (as the prototype's injector did), filters each group's properties through the allowlist from SIFR-T-0026 (dropping anything not permitted), and emits `[data-style-group="G"] { prop: value; … }` blocks with stable ordering. The function is pure — no DOM, no side effects — so it is fully unit-testable and produces byte-stable output for a given input. It carries forward group scoping only; the prototype's commented-out `data-style-id` path is intentionally not supported.

## Acceptance Criteria **[REQUIRED]**

- [ ] A pure `generateCss(styleValues, allowlist)` is exported; given no `styleValues` it returns an empty string (REQ-003, REQ-005 inert behavior).
- [ ] Values are grouped by `data-style-group` and emitted as `[data-style-group="G"] { prop: value; … }` blocks, one selector per group (REQ-003).
- [ ] Each property is filtered through the SIFR-T-0026 allowlist and validated via `validateValue`; any property not on the allowlist, or with an invalid value, is silently dropped and never appears in the output (REQ-003, NFR-003).
- [ ] Output ordering is deterministic and stable: groups sorted by a defined order (e.g. lexicographic) and properties within a group sorted by a defined order, so identical input always yields byte-identical output (NFR-002).
- [ ] The function is pure: no DOM access, no reads of `document`, no mutation of inputs; calling it twice with the same input returns equal strings.
- [ ] `!important` handling is decided here per the initiative (may be appended for override strength) but is applied uniformly and testably; if made opt-in, it is controlled by an explicit parameter, defaulting off.
- [ ] Unit tests achieve 100% coverage (Jest): correct scoped output for a single group; multiple groups ordered deterministically; unknown property dropped; invalid value dropped; empty/absent input → empty CSS; value-type validation delegated to SIFR-T-0026 validators.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
- Mirror the grouping logic the prototype `useStyleInjector.tsx` used (group by `data-style-group`) but produce a string rather than mutating a stylesheet — this function does not touch the DOM at all.
- Consume the allowlist and `validateValue` from SIFR-T-0026; do not re-implement validation here.
- Do NOT carry forward the prototype's commented-out `data-style-id` scoping — group scoping is the single supported model.
- Enforce deterministic ordering explicitly (sort group keys and property keys) so snapshot tests are stable across runs and environments.

### Dependencies
- Upstream (hard): SIFR-T-0026 — imports the allowlist type, `isAllowed`, and `validateValue`.
- Downstream: SIFR-T-0028 (injector) calls `generateCss` to produce the text it writes into the managed `<style>` node; SIFR-T-0029 exercises it end-to-end via the demo.

### Risk Considerations
- Non-deterministic key iteration order would break snapshot tests: mitigate with explicit sorting.
- Over-eager `!important` could surprise consumers (initiative risk): keep it uniform and consider gating behind an opt-in flag defaulting off.

Recommended Agent: opus + medium

## Status Updates **[REQUIRED]**

*To be added during implementation*