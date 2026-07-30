---
id: protocol-and-package-design
level: initiative
title: "Protocol And Package Design"
short_code: "SIFR-I-0001"
created_at: 2026-07-30T14:53:41.296930+00:00
updated_at: 2026-07-30T16:01:12.268582+00:00
parent: SIFR-V-0001
blocked_by: []
archived: false

tags:
  - "#initiative"
  - "#phase/decompose"


exit_criteria_met: false
estimated_complexity: M
strategy_id: NULL
initiative_id: protocol-and-package-design
---

# Protocol And Package Design Initiative

## Context **[REQUIRED]**

The Stardust CMS prototype proves a valuable idea: a host admin UI can map editable elements living *inside* an iframe to overlay controls, inject content into the iframe, and track geometry as the user resizes and scrolls. But the working prototype (`code_temp/Stardust-CMS-App` and `code_temp/Stardust-CMS-APP-Original-backup`) tangles this idea across ad-hoc, stringly-typed postMessage calls and app-specific React contexts. The current iframe side (`demoApp/src/lib/context/CmsBase.context.tsx`) already consumes `frame-link-react` via `FrameLinkContext` and message names like `"cms_request_target_positions"`, `"cms_send_elements"`, `"cms_adapter_send_element_positions"`, and `"cms_adapter_send_scroll_positions"` — but those names are undocumented, inconsistent (the older backup uses `"get_cms_positions"` / `"cms_positions"` in `useCMSTarget.tsx`), and pass raw `DOMRect` objects from `getBoundingClientRect()` (see `CmsTarget.utils.ts`) that do not serialize cleanly across `postMessage`.

Before any code is extracted into a public package, the protocol and the package boundary must be designed. This initiative is the load-bearing groundwork for the entire SIFR project: SIFR-I-0002 (Iframe-Side Adapter) and SIFR-I-0003 (Host-Side Overlay Adapter) both implement against the message registry and geometry types decided here, and the SVER (Versioned Content Engine) project's content operations must map onto the content-target metadata defined here. Getting the boundary wrong forces compounding rework across every downstream initiative, so this is treated as an architecture-first, design-only initiative that produces a documented public API proposal and an ADR — not shipping code.

This initiative depends on the FLINK project (frame-link / frame-link-react transport) being publication-ready: the protocol is defined *on top of* `frame-link`'s typed request/response and subscribe primitives, and explicitly does not reintroduce Stardust's old bespoke `usePostMessage`/`useFrame` transport.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Name and scope the public package (recommended `@stardust-cms/iframe-adapter`) and decide its export surface, peer dependencies (`frame-link`, `frame-link-react`, `react`), and module boundaries (iframe-side entry vs host-side entry).
- Define a fully typed, namespaced message registry layered on `frame-link` request/response + subscribe, replacing every stringly message currently observed in the prototype.
- Define plain, serializable geometry types (a `Geometry`/`Rect` shape with `top/right/bottom/left/width/height/x/y`) to replace raw `DOMRect` passed over `postMessage`.
- Define content-target metadata: `targetId`, container flag, child `contentId`, `index`, and `styleGroup` — grounded in the `data-cms` / `data-cms-content` / `data-cms-container-target` / `data-style-group` attributes the prototype already emits.
- Draw a clear line between iframe (site) responsibilities and host (admin) responsibilities.
- Write an ADR recording the package boundary decision and why `frame-link` is used instead of Stardust's old transport.

**Non-Goals:**
- Implementing the iframe-side provider/components (owned by SIFR-I-0002).
- Implementing host-side hooks/overlays (owned by SIFR-I-0003).
- Building the demo (SIFR-I-0004), style rules (SIFR-I-0005), or presence (SIFR-I-0006).
- Designing the content versioning algorithm — that is the SVER project. This initiative only defines the *shape* of content-operation messages, not their storage or history semantics.
- Any postMessage transport implementation — that lives in FLINK's `frame-link`.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### User Requirements
- **User Characteristics**: The direct "users" are the SIFR-I-0002/0003 implementers and future package consumers — React/TypeScript engineers integrating an iframe CMS. They expect typed message names with IDE autocomplete and no undocumented strings.
- **System Functionality**: Consumers can import a single typed message registry, register host and iframe handlers against it, and exchange geometry/content/scroll/style events with full type inference.
- **User Interfaces**: The public TypeScript API surface (exported types, the message registry, and the entry points) plus the ADR and API-proposal document.

### System Requirements
- **Functional Requirements**:
  - REQ-001: A single message registry type enumerates every host↔iframe message, each namespaced (e.g. `cms/requestTargetPositions`, `cms/sendElementPositions`, `cms/sendScrollPositions`, `cms/sendElements`, `cms/updateStyles`) with typed request and response payloads.
  - REQ-002: A serializable `Geometry` type is defined with explicit numeric fields; no API surface exposes a raw `DOMRect`.
  - REQ-003: `ContentTarget` and `ChildContent` metadata types are defined with `targetId`, `isContainer`, `contentId`, `index`, and `styleGroup`, matching the discovery attributes (`data-cms`, `data-cms-content`, `data-cms-container-target`, `data-style-group`).
  - REQ-004: Host vs iframe responsibilities are documented as a table mapping each message to its sender/receiver and side.
  - REQ-005: An ADR exists recording the package boundary and the frame-link-over-old-transport decision, in the format required by Daniel's global rules (context, decision, alternatives with reasoning, consequences, follow-ups).
  - REQ-006: The package name, `exports` map (dual iframe/host entry), and peer dependencies are specified.
- **Non-Functional Requirements**:
  - NFR-001 (Serializability): Every payload type is structured-clone-safe (no DOM nodes, no functions, no class instances) so it survives `postMessage`.
  - NFR-002 (Security): The protocol design mandates explicit target origins at connection time; no wildcard `*` origin appears in any non-demo example, consistent with FLINK's security posture.
  - NFR-003 (Maintainability): Message names are centralized in one registry; no stringly protocol is left undocumented — the acceptance bar from the plan.
  - NFR-004 (Framework independence of types): Protocol/geometry/metadata types carry no React dependency so SVER and non-React consumers can reference them.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Downstream engineer registers a typed handler
- **Actor**: SIFR-I-0002 implementer (iframe side).
- **Scenario**: Imports the registry, calls the frame-link `useSubscribe`/handler API keyed by `cms/requestTargetPositions`, and returns a `Geometry[]`-bearing payload; TypeScript infers the exact return shape from the registry.
- **Expected Outcome**: The handler compiles with no casts; a wrong payload shape is a compile error.

### Use Case 2: Host engineer discovers the message contract
- **Actor**: SIFR-I-0003 implementer (host side).
- **Scenario**: Reads the responsibilities table and registry to learn which messages the host sends (`cms/requestTargetPositions`, `cms/sendElements`, `cms/updateStyles`) versus receives (`cms/sendElementPositions`, `cms/sendScrollPositions`).
- **Expected Outcome**: The host adapter is built against a documented contract without reading iframe-side source.

## Architecture **[CONDITIONAL: Technically Complex Initiative]**

### Overview
Two package entry points sharing one protocol module: an iframe-side entry (provider + editable-target components) and a host-side entry (hooks + overlay primitives), both importing a shared, framework-agnostic `protocol` module (message registry + geometry + content-target types). The `protocol` module has zero React/DOM runtime dependencies — only types and the registry object — so it can be referenced by SVER and tested in isolation.

### Sequence Diagrams
Representative flow (to be captured in the API proposal): host mounts iframe → frame-link connection established with explicit origin → host sends `cms/requestTargetPositions` → iframe runs target discovery, serializes each target to `Geometry` + `ChildContent[]`, responds → host renders overlays → on iframe resize/scroll, iframe pushes `cms/sendElementPositions` and `cms/sendScrollPositions` → host re-maps overlay geometry with scale/scroll offset.

Class and deployment diagrams are omitted: the deliverable is a type-level protocol and package boundary, not an OOP class hierarchy or an infrastructure deployment, so those diagram types do not apply.

## Detailed Design **[REQUIRED]**

1. **Package identity**: `@stardust-cms/iframe-adapter`, ESM-first (matching FLINK), `peerDependencies` on `frame-link`, `frame-link-react`, and `react >=18`. `exports` provides `.` (or `./iframe`) and `./host` subpaths so a site bundle does not pull host overlay code and vice versa.
2. **Protocol module** (framework-agnostic): a `MessageRegistry` interface mapping each message key to `{ request; response }` payload types, consumed by frame-link's generic message API. Message keys are namespaced under a `cms/` prefix. The registry replaces the current ad-hoc names: `"cms_request_target_positions"` → `cms/requestTargetPositions`, `"cms_send_elements"` → `cms/sendElements`, `"cms_adapter_send_element_positions"` → `cms/sendElementPositions`, `"cms_adapter_send_scroll_positions"` → `cms/sendScrollPositions`, plus a style channel `cms/updateStyles` (feeding SIFR-I-0005) and, reserved for SIFR-I-0006, an optional `cms/presence` channel documented as out-of-scope-to-implement here.
3. **Geometry types**: a `Geometry` (a.k.a. `SerializableRect`) with `{ top, right, bottom, left, width, height, x, y }` — exactly the fields `CmsTarget.utils.ts` already copies out of `getBoundingClientRect()` — plus a `ScrollState` type for `cms/sendScrollPositions` (`{ h, y, isTop, isBottom }`, matching `useFrame.tsx`'s `TFramePositions`). No `DOMRect` crosses the boundary.
4. **Content-target metadata**: `ContentTarget { targetId; isContainer; geometry; children: ChildContent[] }` and `ChildContent { contentId; index; isContainer; styleGroup; geometry }`, grounded in `getElementsWithPositionData()` and `getChildContent()`. `targetId` maps to the `data-cms` attribute; `styleGroup` maps to `data-style-group`.
5. **Responsibilities table**: iframe side owns target/content discovery, geometry serialization, resize/scroll observation, and content rendering; host side owns overlay geometry mapping (scale + scroll offset), selection/drag-drop intent, and issuing content/style updates. The host never reads the iframe DOM directly; the iframe never knows about overlays.
6. **ADR**: records (a) the `@stardust-cms/iframe-adapter` boundary and dual entry points, and (b) why `frame-link` replaces Stardust's `usePostMessage`/`useFrame` (typed, tested, secure-by-default, already extracted) — with alternatives and consequences per global rules.

## Testing Strategy **[CONDITIONAL: Separate Testing Initiative]**

### Unit Testing
- **Strategy**: This is a design/types initiative; "tests" are compile-time type assertions. Provide type-level fixtures (`tsd` or `expect-error` style) asserting that each registry entry infers the correct request/response and that a wrong payload is a compile error. Add a runtime structured-clone round-trip test over sample geometry/content payloads to prove serializability (NFR-001).
- **Coverage Target**: Every message key in the registry has at least one type-level assertion and every payload type has one structured-clone round-trip case.
- **Tools**: TypeScript compiler (`tsc --noEmit`), `tsd` or equivalent type-test, and a small Jest structured-clone test.

Integration and system testing are deferred to SIFR-I-0002/0003/0004 where runnable adapters exist; there is nothing to integration-test in a pure protocol definition, so those subsections are intentionally omitted here.

### Test Selection
- Prioritize the registry type-inference assertions and the serializability round-trip — these are the acceptance-critical guarantees other initiatives rely on.

### Bug Tracking
- Any design gap surfaced (e.g. a message the prototype needs that the registry omits) is logged as a task under this initiative during decompose, or fed forward as a note on the consuming initiative.

## Alternatives Considered **[REQUIRED]**

- **Keep Stardust's stringly postMessage names and just document them** — Rejected: undocumented, inconsistent across the two prototype generations, and unsafe to evolve; a typed registry is the entire point of the extraction.
- **Reuse Stardust's `usePostMessage`/`useFrame` transport** — Rejected per the vision and the plan: FLINK's `frame-link` is already cleaner, tested, and secure-by-default; the adapter must not carry its own postMessage implementation.
- **Pass `DOMRect` directly over postMessage** — Rejected: `DOMRect` does not structured-clone reliably and couples the protocol to the DOM; explicit `Geometry` is serializable and framework-agnostic.
- **Single package entry point** — Rejected in favor of split iframe/host entries so a public site bundle never ships admin overlay code.
- **Design content versioning here** — Rejected: that is SVER's scope; this initiative only defines the message shape content operations travel over.

## Implementation Plan **[REQUIRED]**

Phase 1 — Inventory: enumerate every message name, payload, and DOM attribute used across `CmsBase.context.tsx`, `CmsTarget.utils.ts`, `useCMSTarget.tsx`, `useFrame.tsx`, and `IFrame.tsx`; produce a mapping from old strings to proposed namespaced keys.
Phase 2 — Type design: define the `MessageRegistry`, `Geometry`/`ScrollState`, and `ContentTarget`/`ChildContent` types in the framework-agnostic protocol module; add type-level and structured-clone assertions.
Phase 3 — Boundary + package metadata: specify package name, `exports` (iframe/host split), peer deps; write the responsibilities table.
Phase 4 — ADR: author the package-boundary + frame-link-transport ADR with full alternatives/consequences.
Phase 5 — Review sign-off: publish the API proposal for review before SIFR-I-0002/0003 begin implementation.

## Risks & Dependencies **[REQUIRED]**

**Risks:**
- Under-specifying a message now forces a protocol change after SIFR-I-0002/0003 build against it — mitigated by the Phase 1 exhaustive inventory of the prototype's actual usage.
- The prototype's two generations disagree (e.g. `get_cms_positions` vs `cms_request_target_positions`); picking the wrong superset could miss a needed field — mitigated by grounding every type in the observed source and reconciling both generations explicitly.
- Reserving `cms/presence` and `cms/updateStyles` channels risks over-designing for features scoped later — mitigated by documenting them as reserved/optional, not implementing them here.

**Dependencies:**
- Upstream: FLINK project must expose a stable, typed `frame-link` message API (its "Stardust Transport Readiness" initiative validates geometry/content/scroll/presence message support). SIFR-V-0001 vision (published).
- Downstream: SIFR-I-0002 (Iframe-Side Adapter) and SIFR-I-0003 (Host-Side Overlay Adapter) implement against this registry; SIFR-I-0005 (Style Rules) consumes the `cms/updateStyles` channel; SIFR-I-0006 (Presence Demo) may use the reserved `cms/presence` channel. The SVER project references the content-target metadata types.

## Decomposition Plan **[REQUIRED]**

Expected tasks when this initiative reaches `decompose` (each carries a `Recommended Agent` per the global rubric):
1. Protocol inventory: map every prototype message/attribute/payload to proposed namespaced keys — `opus + medium` (cross-file reasoning across both prototype generations).
2. Define framework-agnostic `protocol` module: `MessageRegistry`, `Geometry`, `ScrollState`, `ContentTarget`, `ChildContent` with type-level assertions — `opus + high` (core substrate every downstream initiative consumes; wrong choices compound).
3. Structured-clone serializability round-trip tests over sample payloads — `sonnet + medium` (single focused test file following a stated pattern).
4. Package metadata + `exports` iframe/host split + peer deps + responsibilities table — `opus + low` (small, design largely settled after task 2).
5. ADR: package boundary + frame-link-over-old-transport, full alternatives/consequences — `opus + medium` (load-bearing decision record).