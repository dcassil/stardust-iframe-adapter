---
id: iframe-side-adapter
level: initiative
title: "Iframe-Side Adapter"
short_code: "SIFR-I-0002"
created_at: 2026-07-30T14:55:27.293272+00:00
updated_at: 2026-07-30T16:01:27.449558+00:00
parent: SIFR-V-0001
blocked_by: []
archived: false

tags:
  - "#initiative"
  - "#phase/decompose"


exit_criteria_met: false
estimated_complexity: L
strategy_id: NULL
initiative_id: iframe-side-adapter
---

# Iframe-Side Adapter Initiative

## Context **[REQUIRED]**

The iframe (site) side is the code that runs *inside* the embedded page and makes its editable elements discoverable and injectable by a host. Stardust already has a working version of this in `code_temp/Stardust-CMS-App/demoApp/src/lib/`: `CmsBase.context.tsx` (provider that registers the frame-link target, subscribes to `cms_request_target_positions` and `cms_send_elements`, and pushes positions on resize/scroll), `CmsTarget.tsx` (marks an editable region with `data-cms` and renders its content), `CmsContent.tsx` (renders content by type: text/number/image/container, emitting `data-cms-content` / `data-cms-container`), `CmsStyled.tsx` (wraps content with `data-style-*` attributes for the style engine), and `CmsTarget.utils.ts` (`getElementsWithPositionData()` discovery over `[data-cms]` and `[data-cms-content]`, serializing geometry).

This initiative extracts that prototype into the clean iframe-side entry of `@stardust-cms/iframe-adapter`, implemented strictly against the typed protocol from SIFR-I-0001 and the `frame-link`/`frame-link-react` transport from FLINK. It must fix the real defects visible in the prototype: `CmsBase.context.tsx` adds `resize`/`scroll` listeners with **fresh arrow functions** so the matching `removeEventListener` calls never actually remove anything (a listener leak), the effect has an empty dependency array while closing over `sendElementPositions`, and updates are unthrottled. Discovery must become deterministic and observed via `ResizeObserver`/`MutationObserver` rather than only firing on window events.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Implement `StardustAdapterProvider` (the cleaned successor to `CmsBaseProvider`) that registers the frame-link target, subscribes to host requests, and streams position/scroll updates using the SIFR-I-0001 registry.
- Implement `EditableTarget` (successor to `CmsTarget`) and content rendering (successor to `CmsContent`) marking regions with `data-cms` and content with `data-cms-content` / `data-cms-container-target`.
- Implement deterministic target discovery over `[data-cms]` and content discovery over `[data-cms-content]`, converting `getBoundingClientRect()` into the serializable `Geometry` type (no raw `DOMRect`).
- Add `ResizeObserver`, `MutationObserver`, and throttled scroll/resize position updates.
- Add lifecycle-safe listener/observer cleanup (fixing the prototype's leaking add/remove mismatch).
- Provide unit tests for empty targets, nested targets, content children, style groups, and geometry serialization.

**Non-Goals:**
- Host-side overlay rendering and geometry mapping (SIFR-I-0003).
- The style-rule allowlist and CSS injection engine (SIFR-I-0005) — this initiative only preserves the `data-style-*` attribute emission that a later style feature consumes.
- Presence/collaboration (SIFR-I-0006).
- Defining the protocol itself (SIFR-I-0001) or the content versioning store (SVER) — content is supplied to the provider as data.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### User Requirements
- **User Characteristics**: React/TypeScript engineers building the *site* that will be embedded; they want to wrap their app in a provider and annotate editable regions with a component, nothing more.
- **System Functionality**: Mounting the provider makes the page's `[data-cms]` regions discoverable to a host, keeps geometry current during resize/scroll/DOM mutation, and renders host-injected content.
- **User Interfaces**: The `StardustAdapterProvider` component, the `EditableTarget` component, and the content renderer — the iframe-side entry of the package.

### System Requirements
- **Functional Requirements**:
  - REQ-001: `StardustAdapterProvider` registers the frame-link target once when transport is `ready` and not already `connected` (correcting the prototype's effect that re-registers on `connected` changes).
  - REQ-002: Discovery returns one `ContentTarget` per `[data-cms]` element with `isContainer` derived from `[data-cms-container-target]`, `children` from `[data-cms-content]`, each child carrying `contentId`, `index`, `isContainer`, `styleGroup` (`data-style-group`), and serialized `Geometry`.
  - REQ-003: All geometry crossing the boundary is the serializable `Geometry` type; no `DOMRect` is posted.
  - REQ-004: Position updates fire on `ResizeObserver`, `MutationObserver`, and throttled `scroll`/`resize`, sending `cms/sendElementPositions` and `cms/sendScrollPositions`.
  - REQ-005: Every listener and observer added is removed on unmount; no leaked listeners (add/remove use stable references).
  - REQ-006: The provider responds to `cms/requestTargetPositions` with current discovery output and to `cms/sendElements` by updating rendered content.
- **Non-Functional Requirements**:
  - NFR-001 (Performance): Scroll/resize handlers are throttled so position streaming does not saturate the message channel.
  - NFR-002 (Memory safety): No listener/observer leaks across mount/unmount cycles — verified by test.
  - NFR-003 (Framework fit): iframe-side entry depends only on `react`, `frame-link-react`, and the SIFR-I-0001 protocol module; no host UI contexts.
  - NFR-004 (Determinism): Target discovery order is stable (document order) so overlays map consistently.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Site author marks an editable hero
- **Actor**: Site engineer embedding their page.
- **Scenario**: Wraps the app in `StardustAdapterProvider`, wraps the hero in `<EditableTarget targetId="hero">`; the host requests positions and receives the hero's geometry and children.
- **Expected Outcome**: The hero is selectable/editable from the host with accurate geometry.

### Use Case 2: User resizes the host window
- **Actor**: End user in the admin app.
- **Scenario**: Resizing triggers the iframe's `ResizeObserver`; the provider recomputes discovery and pushes `cms/sendElementPositions`.
- **Expected Outcome**: Host overlays track the new geometry without a leaked or duplicated listener.

## Architecture **[CONDITIONAL: Technically Complex Initiative]**

### Overview
A single React provider owns the frame-link connection and an observer set (`ResizeObserver` on the document/root, `MutationObserver` on the subtree, throttled `scroll`/`resize` window handlers). A pure discovery module (extracted from `CmsTarget.utils.ts`) walks `[data-cms]`/`[data-cms-content]` and returns `ContentTarget[]`. Components (`EditableTarget`, content renderer, style wrapper) only emit the `data-*` attributes discovery reads — keeping discovery decoupled from rendering.

### Sequence Diagrams
Mount → provider registers target when `ready && !connected` → host sends `cms/requestTargetPositions` → discovery runs → provider responds with `ContentTarget[]` → observers fire on resize/mutation/scroll → provider pushes `cms/sendElementPositions` + `cms/sendScrollPositions` (throttled) → unmount → all observers/listeners disconnected.

Class and deployment diagrams do not apply: this is a small React component set with a pure helper, not an OOP hierarchy or deployed infrastructure.

## Detailed Design **[REQUIRED]**

1. **Discovery module** (pure, from `CmsTarget.utils.ts`): `discoverTargets(root: Document | HTMLElement): ContentTarget[]`. Reads `[data-cms]`, computes `isContainer` from `[data-cms-container-target]`, collects `[data-cms-content]` children with `contentId` (element id), `index`, `isContainer`, `styleGroup` (`data-style-group`), and `Geometry` copied field-by-field from `getBoundingClientRect()`. Preserve the prototype's container inset adjustment (`top -10`, `height -10`) behind a documented constant rather than a magic number.
2. **Provider** (`StardustAdapterProvider`, from `CmsBase.context.tsx`): consumes `frame-link-react`; registers target once on `ready && !connected`; subscribes `cms/requestTargetPositions` → `discoverTargets`; subscribes `cms/sendElements` → content update. Sets up an observer bundle with **stable handler references** and tears it all down in the effect cleanup.
3. **Throttling**: wrap scroll/resize push in a throttle (e.g. `requestAnimationFrame` or a small throttle util) so streaming is bounded (NFR-001).
4. **Components**: `EditableTarget` (from `CmsTarget.tsx`) emits `data-cms`, `data-cms-container-target`; content renderer (from `CmsContent.tsx`) emits `data-cms-content`/`data-cms-container` and renders by type; a style wrapper (from `CmsStyled.tsx`) emits `data-style-element`/`data-style-name`/`data-style-id`/`data-style-group`/`data-style-rules` so SIFR-I-0005 can later target it. Content types come from the protocol, not hardcoded app types.
5. **Cleanup correctness**: replace the prototype's `add/removeEventListener(() => …)` anti-pattern with named handlers stored in refs, ensuring symmetric add/remove and observer `disconnect()`.

## Testing Strategy **[CONDITIONAL: Separate Testing Initiative]**

### Unit Testing
- **Strategy**: jsdom-based tests over the pure discovery module and the provider. Fixtures cover: a target with no content (empty), nested container targets (`data-cms-container-target`), multiple content children with indices, style-group attribution, and geometry serialization (assert output is a plain object with the eight numeric fields, not a `DOMRect`).
- **Coverage Target**: 100% of the discovery module branches (container vs non-container, empty vs populated, nested); provider registration and cleanup paths covered.
- **Tools**: Jest + `@testing-library/react` + jsdom; `ResizeObserver`/`MutationObserver` mocked.

### Integration Testing
- **Strategy**: A minimal React app mounts the provider with fake content and a mock frame-link peer; assert that `cms/requestTargetPositions` yields the expected `ContentTarget[]` and that resize/mutation trigger a throttled push exactly once per frame.
- **Test Environment**: jsdom under Jest; the full two-frame integration is exercised in the SIFR-I-0004 demo.
- **Data Management**: Static content fixtures; no persistence.

### Test Selection
- Prioritize discovery determinism/serialization (REQ-002/003) and listener/observer cleanup (REQ-005/NFR-002) — the acceptance criteria explicitly call out deterministic discovery and correct cleanup.

### Bug Tracking
- The known prototype listener-leak and re-registration bugs are tracked as explicit fix tasks under this initiative; new defects become tasks or backlog bugs.

## Alternatives Considered **[REQUIRED]**

- **Port `CmsBase.context.tsx` as-is** — Rejected: it leaks listeners (add/remove reference mismatch), re-registers on `connected` change, and streams unthrottled; the extraction must fix these, not preserve them.
- **Only use window `resize`/`scroll` events (no observers)** — Rejected: DOM mutations and element-level size changes would be missed; `ResizeObserver`/`MutationObserver` make discovery correct, per the plan's suggested tasks.
- **Ship raw `DOMRect`** — Rejected (same rationale as SIFR-I-0001): not serializable, DOM-coupled.
- **Couple content rendering to Stardust's app content types** — Rejected: content types belong to the protocol; the renderer switches on protocol-defined types so the package is app-agnostic.

## Implementation Plan **[REQUIRED]**

Phase 1 — Pure discovery module extracted from `CmsTarget.utils.ts` with geometry serialization + tests (empty/nested/children/style-group/serialization).
Phase 2 — `StardustAdapterProvider` with correct one-time registration, frame-link subscriptions, and observer bundle (Resize/Mutation + throttled scroll/resize) with symmetric cleanup.
Phase 3 — Components: `EditableTarget`, content renderer, style wrapper emitting the `data-*` attributes discovery + SIFR-I-0005 rely on.
Phase 4 — Integration test in a minimal app against a mock frame-link peer; wire package iframe-side entry export.

## Risks & Dependencies **[REQUIRED]**

**Risks:**
- `ResizeObserver`/`MutationObserver` firing storms could still overwhelm the channel — mitigated by throttling and coalescing updates per animation frame.
- The container inset heuristic (`-10`) from the prototype may be layout-specific — mitigated by making it a documented, overridable constant and testing container geometry explicitly.
- Fixing the re-registration effect could change connection timing — mitigated by integration tests against a mock peer covering `ready`/`connected` transitions.

**Dependencies:**
- Upstream: SIFR-I-0001 (protocol registry + `Geometry`/`ContentTarget` types) must be finalized; FLINK's `frame-link-react` must provide the `FrameLinkContext` register/subscribe/post API this consumes.
- Downstream: SIFR-I-0003 (host overlays) consumes the `ContentTarget`/geometry this emits; SIFR-I-0004 (demo) mounts this provider; SIFR-I-0005 (style rules) targets the `data-style-*` attributes emitted here.

## Decomposition Plan **[REQUIRED]**

Expected tasks at `decompose` (each with a `Recommended Agent`):
1. Extract pure `discoverTargets` module from `CmsTarget.utils.ts` with `Geometry` serialization + full discovery unit tests — `opus + medium` (correctness-critical, feeds host mapping).
2. Implement `StardustAdapterProvider` with correct one-time registration + frame-link subscriptions — `opus + medium` (multi-concern effect logic, fixes real bugs).
3. Observer bundle (Resize/Mutation + throttled scroll/resize) with symmetric, leak-free cleanup + cleanup tests — `opus + medium` (the prototype's known defect area).
4. `EditableTarget` + content renderer + style wrapper components emitting `data-*` attributes — `sonnet + medium` (follows the established attribute pattern from `CmsTarget.tsx`/`CmsContent.tsx`/`CmsStyled.tsx`).
5. Integration test against a mock frame-link peer + wire iframe-side package entry export — `opus + low` (small, design clear once 1–3 land).