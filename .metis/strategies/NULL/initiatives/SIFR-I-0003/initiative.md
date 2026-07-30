---
id: host-side-overlay-adapter
level: initiative
title: "Host-Side Overlay Adapter"
short_code: "SIFR-I-0003"
created_at: 2026-07-30T14:56:57.652397+00:00
updated_at: 2026-07-30T16:02:50.834733+00:00
parent: SIFR-V-0001
blocked_by: []
archived: false

tags:
  - "#initiative"
  - "#phase/decompose"


exit_criteria_met: false
estimated_complexity: L
strategy_id: NULL
initiative_id: host-side-overlay-adapter
---

# Host-Side Overlay Adapter Initiative

## Context **[REQUIRED]**

The host (admin) side is the code that embeds the site in an iframe and renders overlay controls positioned over each editable target. Stardust's prototype spreads this across `code_temp/Stardust-CMS-APP-Original-backup/client/builder/src/cms_targets/` — `CMSTargets.tsx` (maps target positions to areas), `CMSTargetAreas.tsx` (renders a positioned area per target, absolutely placed from `target.positions.top/left/width/height`, with drag-over/drop handlers), and `CMSTargetItem.tsx` (individual content item overlay) — plus the `useCMSTarget.tsx` hook (holds `targetPositions`, listens for `cms_positions`, requests `get_cms_positions`, and implements `handleDrop`/drag-over intent that currently calls `moveContent`/`addContent` directly on a `ContentContext`) and, in the newer `code_temp/Stardust-CMS-App/app/`, `useFrame.tsx` (scale + scroll-offset math: `containerSize.scale = containerSize.width / documentSize.width`) and `IFrame.tsx` (applies `transform: scale(...)` to the iframe and holds the frame ref).

This initiative extracts that behavior into the host-side entry of `@stardust-cms/iframe-adapter`, implemented against the SIFR-I-0001 protocol and SIFR-I-0002's `ContentTarget`/`Geometry` output. The key correctness concern is geometry mapping: overlays must be positioned by transforming the iframe-reported `Geometry` through the iframe's scale and scroll offset (the prototype's scale math in `useFrame.tsx` is entangled with app UI state and has fragile expressions). The other design imperative from the plan: drag/drop must emit **structured operations** via callbacks, not directly mutate a content store — decoupling the overlay from `useCMSTarget`'s direct `moveContent`/`addContent` calls so SVER (or any store) can own content state.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Implement a `useIframeTargets` / `useStardustHost` hook that establishes the frame-link host connection, requests target positions (`cms/requestTargetPositions`), and subscribes to streamed `cms/sendElementPositions` / `cms/sendScrollPositions`.
- Implement overlay geometry mapping that transforms iframe `Geometry` by iframe scale and scroll offset into host-viewport coordinates.
- Implement minimal, reusable target-area and content-item overlay primitives (successors to `CMSTargetAreas`/`CMSTargetItem`) with no built-in styling opinions.
- Support drag/drop insertion via structured operation callbacks (e.g. `onInsert`, `onMove`, `onSelect`) instead of mutating a content store directly.
- Keep the host package free of Stardust's old UI/Content/Pages contexts.
- Provide unit tests for the geometry transform and scale behavior.

**Non-Goals:**
- Iframe-side discovery/provider (SIFR-I-0002).
- The demo's concrete admin styling, side panel, and content fields (SIFR-I-0004) — this initiative ships unstyled primitives the demo composes.
- Content storage/versioning (SVER) — the host emits operations; a store consumes them.
- Style editing UI (SIFR-I-0005) and presence cursors (SIFR-I-0006).

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### User Requirements
- **User Characteristics**: React/TypeScript engineers building an admin UI; they want a hook that yields mapped target rectangles and overlay primitives they can style and wire to their own content store.
- **System Functionality**: Given an iframe ref, the host receives accurately mapped target geometry that stays correct under iframe scale and scroll, and emits structured edit intents on drag/drop.
- **User Interfaces**: The `useStardustHost` hook plus `TargetAreaOverlay` / `ContentItemOverlay` primitive components — the host-side entry of the package.

### System Requirements
- **Functional Requirements**:
  - REQ-001: `useStardustHost(iframeRef, options)` connects via frame-link to the iframe's registered target and returns mapped `targetPositions` in host coordinates.
  - REQ-002: On mount and on `cms/sendElementPositions` / `cms/sendScrollPositions`, host state updates with fresh geometry (replacing the prototype's `get_cms_positions`/`cms_positions` round-trip).
  - REQ-003: A pure `mapGeometry(geometry, { scale, scrollOffset })` transform converts iframe `Geometry` to host-viewport coordinates; overlays are positioned from its output.
  - REQ-004: Overlay primitives render absolutely-positioned boxes from mapped geometry (top/left/width/height), matching the `CMSTargetAreas` positioning model, with drag-over/drop hooks.
  - REQ-005: Drag/drop emits structured operations through callbacks (`onInsert(targetId, index, payload)`, `onMove(from, to)`, `onSelect(targetId, contentId?)`); the package never imports a content store.
  - REQ-006: The scale factor is computed as container-width / document-width (from `useFrame.tsx`) and exposed so the demo can also scale the iframe element.
- **Non-Functional Requirements**:
  - NFR-001 (Accuracy): Mapped overlay geometry matches actual on-screen target position within 1px under scale ∈ {1, <1} and non-zero scroll — verified by transform unit tests.
  - NFR-002 (Decoupling): Host package has zero dependency on Stardust's `UIContext`/`ContentContext`/`PagesContext`; all edit intent leaves via callbacks.
  - NFR-003 (Performance): Position-stream handling is coalesced so rapid updates during scroll/resize do not thrash React state.
  - NFR-004 (Reusability): Overlay primitives carry no visual styling beyond positioning, so the demo styles them independently.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Admin selects a target
- **Actor**: Content editor in the admin app.
- **Scenario**: Clicks an overlay box; `onSelect(targetId)` fires; the demo opens its side panel.
- **Expected Outcome**: The correct target is selected; the overlay aligns with the on-screen element.

### Use Case 2: Admin drags a new block into a target
- **Actor**: Content editor.
- **Scenario**: Drops a "text" block onto a target area at index 1; `onInsert(targetId, 1, { type: 'text' })` fires.
- **Expected Outcome**: A structured insert operation is emitted for the store to apply; no content state is mutated inside the package.

### Use Case 3: Editor scrolls the iframe
- **Actor**: End user.
- **Scenario**: Iframe scrolls; `cms/sendScrollPositions` arrives; `mapGeometry` re-applies the new scroll offset.
- **Expected Outcome**: Overlays stay glued to their targets.

## Architecture **[CONDITIONAL: Technically Complex Initiative]**

### Overview
A host hook owns the frame-link connection and the latest `ContentTarget[]` + `ScrollState` + `scale`. A pure `mapGeometry` function projects each iframe rect into host coordinates. Stateless overlay primitives render from mapped geometry and forward pointer/drag events as structured callbacks. The iframe scale is derived once (container/document width) and applied both to the iframe element (in the demo) and inside `mapGeometry`.

### Sequence Diagrams
Host mounts iframe → `useStardustHost` connects (frame-link) with explicit origin → sends `cms/requestTargetPositions` → receives `ContentTarget[]` → maps geometry → renders overlays → iframe streams `cms/sendElementPositions`/`cms/sendScrollPositions` → host re-maps → user drags/drops → overlay fires `onInsert`/`onMove`/`onSelect` → consumer (demo/SVER) applies the operation and re-requests positions.

Class and deployment diagrams do not apply: the deliverable is a hook + stateless primitives + a pure transform, not an OOP hierarchy or deployed infrastructure.

## Detailed Design **[REQUIRED]**

1. **`useStardustHost(iframeRef, { origin, onInsert, onMove, onSelect })`** (from `useCMSTarget.tsx` + `useFrame.tsx`): establishes the frame-link host connection to `iframeRef.current.contentWindow`, requests positions, subscribes to streamed updates, tracks `scale` (via `ResizeObserver` on iframe + container as in `useFrame.tsx`) and `ScrollState`. Returns `{ targets: MappedTarget[], scale, connectionState }`.
2. **`mapGeometry(geometry, { scale, scrollOffset })`** (pure, extracted from the scattered math in `useFrame.tsx`/`CMSTargetAreas.tsx`): `x' = (geometry.left - scrollOffset.x) * scale`, `y' = (geometry.top - scrollOffset.y) * scale`, `w' = geometry.width * scale`, `h' = geometry.height * scale`. Fully unit-tested; the prototype's fragile inline scale expressions are replaced by this single tested function.
3. **`TargetAreaOverlay`** (from `CMSTargetAreas.tsx`): absolutely positioned box from mapped geometry; `onDragOver`/`onDrop` translate to `onInsert`/`onMove`; renders child `ContentItemOverlay`s when the target has content, or an empty drop zone when it does not (mirroring the prototype's empty-vs-populated branch). No CSS classes beyond positioning; consumers style via `className`/`style` props.
4. **`ContentItemOverlay`** (from `CMSTargetItem.tsx`): per-content overlay with select/hover/drag intent forwarded as callbacks.
5. **Structured operations**: define `InsertOp`/`MoveOp`/`SelectOp` types (aligned with SVER's operation vocabulary) that the drop handler constructs from `dataTransfer` (type/contentId/index/target) — replacing `useCMSTarget`'s direct `addContent`/`moveContent` calls.
6. **Connection state**: expose `connectionState` so the demo can show connect/error UI (successor to the prototype's `ConnectStatus`).

## Testing Strategy **[CONDITIONAL: Separate Testing Initiative]**

### Unit Testing
- **Strategy**: Exhaustive tests on the pure `mapGeometry` transform: identity at scale 1 / zero scroll; correct scaling at scale < 1; correct translation under non-zero scroll; combined scale+scroll. Tests on overlay primitives asserting they render at mapped coordinates and fire the correct structured callback on drop/select.
- **Coverage Target**: 100% of `mapGeometry` branches; overlay callback paths (insert/move/select, empty vs populated area) covered.
- **Tools**: Jest + `@testing-library/react` + jsdom.

### Integration Testing
- **Strategy**: Host hook against a mock frame-link peer emitting a known `ContentTarget[]` + `ScrollState`; assert mapped targets and that a simulated drop emits the expected `InsertOp`. Full two-frame behavior is validated in SIFR-I-0004.
- **Test Environment**: jsdom under Jest.
- **Data Management**: Static target fixtures.

### Test Selection
- Prioritize the geometry transform and scale behavior (REQ-003/006, NFR-001) — the plan's acceptance criteria name "geometry transform and scale behavior" explicitly — and the decoupled-operation callbacks (REQ-005/NFR-002).

### Bug Tracking
- The prototype's entangled scale math and store-mutating drop handler are tracked as explicit refactor tasks; new defects become tasks or backlog bugs.

## Alternatives Considered **[REQUIRED]**

- **Port `useCMSTarget.tsx` with its direct `addContent`/`moveContent`** — Rejected: couples the overlay to a specific content store; the plan requires structured operations emitted via callbacks.
- **Keep scale/scroll math inline in the hook (as in `useFrame.tsx`)** — Rejected: it is fragile and untestable; a pure `mapGeometry` is unit-testable and reusable.
- **Ship styled overlay components** — Rejected: overlays must be minimal/reusable so the demo styles them; styling opinions would reduce reuse.
- **Have the host read the iframe DOM directly** — Rejected: cross-origin-unsafe and violates the SIFR-I-0001 boundary; the host only consumes messaged geometry.

## Implementation Plan **[REQUIRED]**

Phase 1 — Pure `mapGeometry` transform (scale + scroll) extracted from `useFrame.tsx`, with exhaustive transform tests.
Phase 2 — `useStardustHost` hook: frame-link host connection, position request + stream subscription, scale/scroll tracking, mapped-target output.
Phase 3 — `TargetAreaOverlay` + `ContentItemOverlay` unstyled primitives with drag/drop → structured callbacks (empty vs populated branch from `CMSTargetAreas.tsx`).
Phase 4 — Structured operation types + drop-handler construction; connection-state exposure; host-side package entry export + integration test against a mock peer.

## Risks & Dependencies **[REQUIRED]**

**Risks:**
- Scale/scroll transform edge cases (fractional scale, mid-scroll resize) could misalign overlays — mitigated by exhaustive `mapGeometry` tests and coalesced stream handling.
- Structured-operation vocabulary must align with SVER; a mismatch forces adapter glue — mitigated by cross-referencing SVER's operation types during SIFR-I-0001/this design.
- The prototype's `-40` header offsets and container insets (`useFrame.tsx`, `CmsTarget.utils.ts`) are app-specific; carrying them blindly would misplace overlays — mitigated by making offsets explicit, documented options.

**Dependencies:**
- Upstream: SIFR-I-0001 (protocol + geometry types) and SIFR-I-0002 (emits the `ContentTarget`/`Geometry` this maps). FLINK `frame-link-react` host connection API.
- Downstream: SIFR-I-0004 (demo) composes and styles these primitives and wires the structured operations to a content store; the SVER project consumes the emitted operations.

## Decomposition Plan **[REQUIRED]**

Expected tasks at `decompose` (each with a `Recommended Agent`):
1. Pure `mapGeometry(scale, scrollOffset)` transform + exhaustive unit tests — `opus + high` (correctness substrate every overlay and the demo depend on).
2. `useStardustHost` hook: frame-link host connection + position request/stream + scale/scroll tracking — `opus + medium` (multi-concern integration replacing `useCMSTarget`/`useFrame`).
3. `TargetAreaOverlay` + `ContentItemOverlay` unstyled primitives (empty/populated branch, drag/drop wiring) — `opus + medium` (multi-file, forwards structured intent).
4. Structured operation types + `dataTransfer`→op construction + connection-state exposure — `opus + low` (small, design clear after task 3).
5. Host-side package entry export + integration test against a mock frame-link peer — `sonnet + medium` (mechanical wiring following the SIFR-I-0002 test pattern).