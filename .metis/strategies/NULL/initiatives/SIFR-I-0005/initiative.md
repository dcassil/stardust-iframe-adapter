---
id: style-rules-as-supporting-feature
level: initiative
title: "Style Rules As Supporting Feature"
short_code: "SIFR-I-0005"
created_at: 2026-07-30T15:00:06.232934+00:00
updated_at: 2026-07-30T16:07:36.266960+00:00
parent: SIFR-V-0001
blocked_by: []
archived: false

tags:
  - "#initiative"
  - "#phase/decompose"


exit_criteria_met: false
estimated_complexity: M
strategy_id: NULL
initiative_id: style-rules-as-supporting-feature
---

# Style Rules As Supporting Feature Initiative

## Context **[REQUIRED]**

Stardust's prototype includes a style-editing capability: content elements are wrapped with `data-style-*` attributes (`CmsStyled.tsx` emits `data-style-element`, `data-style-name`, `data-style-id`, `data-style-group`, `data-style-rules`), a host-side `useStyleEngine.tsx` defines a rule vocabulary (`RULES`, `RULE_TYPES`, `TYPE_RULES` mapping element types like `text`/`container` to allowed CSS rules such as `color`, `font-size`, `font-weight`, `text-align`), and an iframe-side `useStyleInjector.tsx` writes CSS into the page. This is a genuinely interesting feature, but the vision is explicit that it must remain a *supporting* feature — not the lead package.

Crucially, the prototype's injector is dangerous: `useStyleInjector.tsx` mutates the page's **first global stylesheet** directly — `while (document.styleSheets[0].cssRules.length > 0) document.styleSheets[0].deleteRule(0)` — deleting every rule in whatever stylesheet happens to be first, then inserting `!important` rules keyed by `data-style-group`. That destroys unrelated page styles and is unsafe for a public package. This initiative extracts the *idea* (a safe, allowlisted, group-scoped style override) while fixing the implementation to inject into a dedicated managed `<style>` element rather than deleting global rules.

The feature layers onto the existing pipeline: the `data-style-group` attribute is already emitted by SIFR-I-0002's content/style components, and the SIFR-I-0001 protocol reserves a `cms/updateStyles` channel for style values.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Define a safe style-rule allowlist (the set of CSS properties editable per element type), derived from `useStyleEngine.tsx`'s `RULES`/`TYPE_RULES` but validated and constrained.
- Extract style-element discovery (finding `[data-style-element]`/`data-style-group` targets) as a pure helper.
- Inject CSS into a dedicated, managed `<style>` tag owned by the adapter — never by deleting rules from a global stylesheet.
- Generate group-scoped CSS (`[data-style-group="…"] { … }`) from allowlisted rule/value pairs, with tests for the CSS generation.
- Keep the whole feature optional: the adapter and demo work with it disabled.

**Non-Goals:**
- Building the core adapter (SIFR-I-0002/0003) or making style editing the headline package — it is explicitly supporting.
- A full visual style editor UI beyond a small demo control set (the demo's style panel is minimal).
- Arbitrary/unrestricted CSS injection — only allowlisted properties are permitted.
- Theming systems, design tokens, or CSS-in-JS integration.
- Persistence/versioning of style values (that would be SVER's domain if ever needed).

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### User Requirements
- **User Characteristics**: Content editors who want to tweak a small, safe set of visual properties (color, font size/weight, alignment, basic spacing) on grouped elements; and package consumers who want style editing as an opt-in.
- **System Functionality**: An editor changes an allowlisted property for a style group and the embedded page reflects it immediately, without breaking the page's own styles.
- **User Interfaces**: A small style-rule API (allowlist + generator + injector) and a minimal demo style panel; opt-in via the adapter.

### System Requirements
- **Functional Requirements**:
  - REQ-001: A style-rule allowlist maps element types (e.g. `text`, `container`) to permitted CSS properties, grounded in `TYPE_RULES` from `useStyleEngine.tsx` but explicitly enumerated and validated.
  - REQ-002: A pure `discoverStyleElements(root)` returns the `data-style-group`/`data-style-element` targets present.
  - REQ-003: A pure `generateCss(styleValues, allowlist)` produces group-scoped rules (`[data-style-group="X"] { prop: value; … }`), dropping any property not on the allowlist.
  - REQ-004: The injector writes generated CSS into a single adapter-owned `<style>` element (created once, updated in place); it never calls `deleteRule`/`insertRule` on `document.styleSheets[0]` or any stylesheet it does not own.
  - REQ-005: Style values arrive over the SIFR-I-0001 `cms/updateStyles` channel; the feature is inert if no style values are sent.
  - REQ-006: The feature can be fully disabled with no effect on adapter behavior.
- **Non-Functional Requirements**:
  - NFR-001 (Safety): No global stylesheet is mutated; only the adapter's own `<style>` element is written — the core correction over the prototype.
  - NFR-002 (Determinism): `generateCss` is a pure function with stable output ordering, fully unit-testable.
  - NFR-003 (Least privilege): Only allowlisted properties can be emitted; unknown properties are silently dropped (and optionally logged in dev).
  - NFR-004 (Optionality): Zero footprint when disabled.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Editor changes heading color
- **Actor**: Content editor in the demo admin.
- **Scenario**: Selects a text group, picks a new color; a `cms/updateStyles` message carries `{ group, rule: 'color', value }`; the injector regenerates the adapter `<style>` element.
- **Expected Outcome**: The heading color updates live; no other page styles change.

### Use Case 2: Editor attempts a non-allowlisted property
- **Actor**: Content editor (or a malformed message).
- **Scenario**: A style value references a property not in the allowlist for that type.
- **Expected Outcome**: The property is dropped by `generateCss`; nothing unsafe is injected.

## Architecture **[CONDITIONAL: Technically Complex Initiative]**

### Overview
Three small pure/near-pure pieces plus a thin injector: an **allowlist** (data), a **discovery** helper (`[data-style-group]`), a **CSS generator** (`styleValues → scoped CSS string`), and an **injector** that owns one `<style>` node and swaps its `textContent`. Style values flow in over `cms/updateStyles`; the generator + injector run on the iframe side (where the DOM to style lives). The allowlist and generator are framework-agnostic and testable in isolation.

### Sequence Diagrams
Host style panel changes a value → `cms/updateStyles({ group, rule, value })` → iframe adapter validates against allowlist → `generateCss` builds scoped rules → injector updates the adapter-owned `<style>` node → page reflects change.

Component/class/deployment diagrams do not apply: this is a handful of pure functions plus one DOM-owning injector, fully described by the Overview.

## Detailed Design **[REQUIRED]**

1. **Allowlist** (from `useStyleEngine.tsx` `RULES`/`RULE_TYPES`/`TYPE_RULES`): an explicit map, e.g. `{ text: ['color','font-size','font-weight','text-align'], spacing: ['margin','padding'], container: ['width','height','display'] }`, with value-type validators (color string, px number, enum for `display`/`text-align`). This replaces the prototype's loosely-typed rule defs with a validated allowlist.
2. **Discovery** (`discoverStyleElements(root)`): collects elements bearing `data-style-group` (and their `data-style-rules`), returning the groups present so the panel can offer only relevant controls.
3. **Generator** (`generateCss(styleValues, allowlist)`): groups values by `data-style-group` (as the prototype's injector does), filters each to allowlisted properties, and emits `[data-style-group="G"] { prop: value; … }` blocks. Deterministic ordering; pure; unit-tested. The prototype's commented-out `data-style-id` path is intentionally not carried forward (group scoping is the supported model).
4. **Injector** (`injectStyles(css)`): lazily creates one `<style data-stardust-adapter-styles>` element appended to `<head>`, and sets its `textContent = css` on each update. It never touches `document.styleSheets[0]` — the explicit fix for `useStyleInjector.tsx`'s destructive `deleteRule` loop. `!important` may be retained for override strength but scoped only within the adapter's own element.
5. **Opt-in wiring**: the iframe adapter subscribes to `cms/updateStyles` only when the style feature is enabled; disabled means no `<style>` node and no subscription.

## Testing Strategy **[CONDITIONAL: Separate Testing Initiative]**

### Unit Testing
- **Strategy**: Pure-function tests dominate. `generateCss`: correct scoped output for a group; allowlist filtering drops unknown props; value-type validation; deterministic ordering; empty input yields empty CSS. Injector tests (jsdom): a single `<style>` node is created and reused; global stylesheets are never mutated (assert `document.styleSheets[0]` rules are untouched).
- **Coverage Target**: 100% of `generateCss` and the allowlist validators; injector create/update/idempotency paths.
- **Tools**: Jest + jsdom.

### Integration Testing
- **Strategy**: Within the SIFR-I-0004 demo, a `cms/updateStyles` message changes a group's color and the injected `<style>` reflects it while page styles remain intact (can be a Playwright assertion in the demo E2E).
- **Test Environment**: jsdom for unit; demo Playwright for integration.
- **Data Management**: Static style-value fixtures.

### Test Selection
- Prioritize CSS generation correctness (REQ-003) and the safety guarantee that no global stylesheet is mutated (REQ-004/NFR-001) — the plan's acceptance criteria name "tests for CSS generation" and "safe" editing.

### Bug Tracking
- The prototype's destructive-injection behavior is tracked as the primary defect this initiative corrects; new issues become tasks or backlog bugs.

## Alternatives Considered **[REQUIRED]**

- **Port `useStyleInjector.tsx`'s global-stylesheet mutation** — Rejected outright: deleting all rules from `document.styleSheets[0]` destroys unrelated page CSS and is unsafe in a public package; a dedicated managed `<style>` element is the correct approach.
- **Allow arbitrary CSS properties** — Rejected: unsafe and over-scoped; an allowlist keeps the feature a safe, supporting one (and avoids injection risk).
- **Make style editing a first-class/lead feature** — Rejected per the vision: it must stay optional and supporting, not overshadow the adapter.
- **Support both `data-style-id` and `data-style-group` scoping** — Rejected for now: the prototype's id path is commented out; group scoping is the single supported, tested model to keep surface small.

## Implementation Plan **[REQUIRED]**

Phase 1 — Allowlist + value-type validators (from `useStyleEngine.tsx`), unit-tested.
Phase 2 — Pure `generateCss` group-scoped generator with allowlist filtering + tests.
Phase 3 — Managed-`<style>` injector (no global stylesheet mutation) + discovery helper + idempotency tests.
Phase 4 — Opt-in wiring to `cms/updateStyles`; minimal demo style panel; demo integration assertion.

## Risks & Dependencies **[REQUIRED]**

**Risks:**
- `!important` overrides could surprise consumers — mitigated by scoping to the adapter's own element and documenting the behavior; consider making `!important` opt-in.
- Allowlist too narrow to be interesting, or too broad to be safe — mitigated by grounding it in the prototype's `TYPE_RULES` and keeping it extensible via config.
- Feature creep toward a full style editor — mitigated by the explicit supporting-only non-goals.

**Dependencies:**
- Upstream: SIFR-I-0001 (`cms/updateStyles` channel + style-value types) and SIFR-I-0002 (emits `data-style-*` attributes the generator scopes to). FLINK transport.
- Downstream: SIFR-I-0004 demo gains an optional style panel exercising this feature. No SVER dependency (style values are not versioned here).

## Decomposition Plan **[REQUIRED]**

Expected tasks at `decompose` (each with a `Recommended Agent`):
1. Style-rule allowlist + value-type validators extracted from `useStyleEngine.tsx` + tests — `opus + medium` (defines the safe surface; validation logic).
2. Pure `generateCss` group-scoped generator with allowlist filtering + tests — `opus + medium` (correctness-critical pure function).
3. Managed-`<style>` injector (replacing the destructive global-stylesheet mutation) + discovery helper + idempotency/safety tests — `opus + medium` (the core safety fix over the prototype).
4. Opt-in `cms/updateStyles` wiring + minimal demo style panel + demo assertion — `sonnet + medium` (wiring following the established subscription pattern).