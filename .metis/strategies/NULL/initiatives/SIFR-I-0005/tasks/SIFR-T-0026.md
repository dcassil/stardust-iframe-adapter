---
id: style-rule-allowlist-and-value
level: task
title: "Style-rule allowlist and value-type validators"
short_code: "SIFR-T-0026"
created_at: 2026-07-30T16:07:39.877849+00:00
updated_at: 2026-07-30T16:07:39.877849+00:00
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

# Style-rule allowlist and value-type validators

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0005]]

## Objective **[REQUIRED]**

Define the safe style-rule allowlist and its per-property value-type validators — the data layer that constrains what CSS the style feature can ever emit. This is Phase 1 of the initiative and the foundation for both `generateCss` (SIFR-T-0027) and the demo panel (SIFR-T-0029). The allowlist is derived from the prototype's `useStyleEngine.tsx` (`RULES`, `RULE_TYPES`, `TYPE_RULES`) but replaces its loosely-typed rule definitions with an explicitly enumerated, validated map. The module is framework-agnostic (no React, no DOM) and lives on the shared/protocol side so both host and iframe can import it.

## Acceptance Criteria **[REQUIRED]**

- [ ] A `StyleAllowlist` type and a concrete default allowlist are exported, mapping element types to permitted CSS properties, e.g. `{ text: ['color','font-size','font-weight','text-align'], spacing: ['margin','padding'], container: ['width','height','display'] }`, grounded in `TYPE_RULES` from `useStyleEngine.tsx` (REQ-001).
- [ ] Each allowlisted property has an associated value-type validator: `color` → CSS color string, `font-size`/`margin`/`padding`/`width`/`height` → px number (or px-suffixed string), `font-weight` → numeric/enum weight, `text-align` → enum (`left|center|right|justify`), `display` → enum (`block|flex|inline-block|none`).
- [ ] A pure `isAllowed(type, property)` predicate returns whether a property is permitted for a given element type (REQ-001).
- [ ] A pure `validateValue(property, value)` returns a normalized value or a rejection; unknown or invalid values are rejected, never coerced into unsafe CSS (NFR-003).
- [ ] The module imports no React and touches no DOM; it is importable from both the host and iframe entrypoints.
- [ ] The allowlist is extensible via a config/override parameter without editing the module source (per the initiative's "extensible via config" risk mitigation).
- [ ] Unit tests achieve 100% coverage of the validators and `isAllowed`: every allowlisted property validates a known-good value; a known-bad value for each property is rejected; a property absent from a type's allowlist returns `false` from `isAllowed`.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
- Port the vocabulary from the prototype `useStyleEngine.tsx` (`RULES`/`RULE_TYPES`/`TYPE_RULES`) but hand-enumerate it as a typed constant rather than deriving it dynamically. Do NOT carry over any loose `any`-typed rule shapes.
- Represent validators as a `Record<CssProperty, (value: unknown) => ValidatedValue | null>` so `generateCss` (SIFR-T-0027) can consume them directly.
- Keep `!important` out of this module — that is the injector's concern (SIFR-T-0028); here we only decide allowed properties and valid values.
- Place the module framework-agnostically (shared protocol package alongside the SIFR-I-0001 `cms/updateStyles` types) so it has zero React/DOM dependency.

### Dependencies
- Upstream: conceptually related to SIFR-I-0001's `cms/updateStyles` style-value types for the value shape, but does not block on them — the allowlist defines its own property/value contracts.
- Downstream: SIFR-T-0027 (`generateCss`) and SIFR-T-0029 (demo panel offering only allowlisted controls) both import this module.

### Risk Considerations
- Allowlist too narrow (uninteresting) vs too broad (unsafe): mitigate by grounding the default in the prototype's `TYPE_RULES` and exposing a config override. The default must stay conservative.

Recommended Agent: opus + medium

## Status Updates **[REQUIRED]**

*To be added during implementation*