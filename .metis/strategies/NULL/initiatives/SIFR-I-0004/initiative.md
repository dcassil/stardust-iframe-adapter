---
id: demo-admin-and-demo-site
level: initiative
title: "Demo Admin And Demo Site"
short_code: "SIFR-I-0004"
created_at: 2026-07-30T14:58:29.508159+00:00
updated_at: 2026-07-30T16:01:54.448486+00:00
parent: SIFR-V-0001
blocked_by: []
archived: false

tags:
  - "#initiative"
  - "#phase/decompose"


exit_criteria_met: false
estimated_complexity: L
strategy_id: NULL
initiative_id: demo-admin-and-demo-site
---

# Demo Admin And Demo Site Initiative

## Context **[REQUIRED]**

This initiative produces the visual portfolio artifact — the thing a recruiter runs in under five minutes to *see* the value of the iframe adapter without reading source. The Stardust prototype already has both halves in embryonic form: a demo site under `code_temp/Stardust-CMS-App/demoApp/` (using `CmsBaseProvider`, `CmsTarget`, `CmsContent`) and an admin shell under `code_temp/Stardust-CMS-App/app/` (`IFrame.tsx` embedding the site with `transform: scale(...)`, `ConnectStatus` for connection UI, and the `useFrame`/overlay machinery). But those are entangled prototypes; this initiative builds a clean demo pair on top of the extracted packages (SIFR-I-0002 iframe side, SIFR-I-0003 host side) that composes and styles the unstyled overlay primitives into a convincing admin experience.

The demo is where the extracted packages become legible: an admin app embeds a demo site in an iframe, renders overlays over 4–6 editable targets (including at least one nested/container target — grounded in the prototype's `data-cms-container-target` containers rendered by `CmsContent`'s `container` case), and lets a user select, add, move, edit, and delete content and see the iframe update immediately. Per the SIFR vision success criteria: the admin overlay must accurately track target and child positions during resize and scroll, and content injection must reflect in the iframe live.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Build a demo site (embedded page) with editable hero, text block, image/content card, list, and at least one nested container target.
- Build an admin shell that embeds the demo site in an iframe and mounts `useStardustHost` (SIFR-I-0003).
- Add overlay controls for select, add, move, edit, and delete, styling the SIFR-I-0003 overlay primitives.
- Add a content side panel with basic fields (successor to the prototype's edit sidebar).
- Show connection state and errors clearly (successor to `ConnectStatus`).
- Verify overlays track geometry accurately during resize and scroll and that content injection updates the iframe immediately.
- Provide screenshots plus short GIF/video capture instructions for the portfolio README.

**Non-Goals:**
- Building or changing the adapter packages themselves (SIFR-I-0002/0003) — the demo only consumes them.
- Implementing content versioning/draft-live persistence — the demo uses an in-memory content store here; the SVER project later swaps in the versioned engine (SVER's "Integration With Stardust Iframe Demo" initiative).
- Style-editing UI (SIFR-I-0005) and presence cursors (SIFR-I-0006) — these are layered in by their own initiatives and only lightly reserved for here.
- Production auth, multi-page routing, or a real backend.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### User Requirements
- **User Characteristics**: Two audiences — recruiters/reviewers who run the demo to understand the concept visually, and the SVER team who later plug the versioned store into this demo.
- **System Functionality**: One command starts both apps; the admin visibly maps, injects, and edits content in the embedded site with overlays that stay aligned under resize/scroll.
- **User Interfaces**: The admin shell (iframe + overlays + side panel + connection status) and the demo site page.

### System Requirements
- **Functional Requirements**:
  - REQ-001: The demo site exposes 4–6 editable targets via `EditableTarget`, including ≥1 nested container target.
  - REQ-002: The admin embeds the demo site in an iframe and renders overlays via SIFR-I-0003 primitives mapped through `mapGeometry`.
  - REQ-003: Overlay controls support select, add, move, edit, delete; each emits the structured operation and updates an in-memory content store, which re-sends content via `cms/sendElements`.
  - REQ-004: A side panel edits basic fields (text content, image src) for the selected content and pushes updates live.
  - REQ-005: Connection state (connecting/connected/error) is shown; errors are legible, not silent console logs (the prototype logs to console — this must surface in UI).
  - REQ-006: Overlays remain aligned during window resize and iframe scroll (exercising SIFR-I-0002 streaming + SIFR-I-0003 mapping end to end).
  - REQ-007: A single documented command (e.g. `npm run demo`) starts both apps; a README section with screenshots and GIF/video capture steps exists.
- **Non-Functional Requirements**:
  - NFR-001 (Time-to-understanding): A reviewer grasps the concept in under five minutes without reading source (vision success criterion).
  - NFR-002 (Security): The iframe/host connection uses an explicit origin (localhost for the demo), never `*` in committed non-demo guidance.
  - NFR-003 (Swappability): The in-memory content store sits behind a small interface so SVER can replace it without touching overlay/demo UI.
  - NFR-004 (Visual quality): The admin UI looks intentional (clean overlays, legible panel) so the portfolio artifact reads as production-minded.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Recruiter runs the demo
- **Actor**: Recruiter/reviewer.
- **Scenario**: Clones the repo, runs one command, opens the admin, sees the embedded site with overlays, clicks the hero, edits its text, watches the iframe update.
- **Expected Outcome**: The value (mapping editable iframe elements to a host admin) is obvious within five minutes.

### Use Case 2: Editor adds a block to a nested container
- **Actor**: Content editor.
- **Scenario**: Drags a text block into the nested container target; the structured `InsertOp` updates the store; content re-injects; overlays remap.
- **Expected Outcome**: The new block appears in the correct nested position with an aligned overlay.

### Use Case 3: Editor resizes the window
- **Actor**: Content editor.
- **Scenario**: Resizes the browser; iframe scale changes; overlays track.
- **Expected Outcome**: Overlays stay glued to targets and children throughout.

## Architecture **[CONDITIONAL: Technically Complex Initiative]**

### Overview
Two small apps in the package's `examples/`/`demo/` workspace: (1) the demo site, a React app wrapped in `StardustAdapterProvider` with annotated `EditableTarget`s; (2) the admin shell, a React app that renders an iframe pointing at the demo site, mounts `useStardustHost`, styles the overlay primitives, and holds an in-memory content store behind an interface. The store applies structured operations and pushes content back via `cms/sendElements`.

### Sequence Diagrams
Admin loads → iframe loads demo site → frame-link connects (explicit localhost origin) → host requests positions → overlays render → user edits via panel/overlay → structured op → store updates → `cms/sendElements` → site re-renders → iframe streams new positions → overlays remap.

Component/class/deployment diagrams are omitted: the demo is two composed React apps consuming already-designed package components, not new architecture; the relevant structure is fully covered by the Overview and the package initiatives.

## UI/UX Design **[CONDITIONAL: Frontend Initiative]**

### User Interface Mockups
Admin layout: left/right side panel for content fields + a block palette to drag from; center canvas holds the scaled iframe with absolutely-positioned overlays; a top strip shows connection status. To be captured as static mockups/screenshots in the README.

### User Flows
Select target → panel populates → edit field → live update. Drag block from palette → drop on target/area → insert. Hover content → move/delete affordances.

### Design System Integration
The demo owns its own minimal styles (the SIFR-I-0003 primitives are intentionally unstyled); a small, consistent token set (spacing, colors, overlay outline) keeps it looking intentional without pulling a heavy UI library.

## Testing Strategy **[CONDITIONAL: Separate Testing Initiative]**

### Unit Testing
- **Strategy**: The in-memory content store's operation application (insert/move/edit/delete) is unit-tested; the store interface is tested against the same operations SVER will later satisfy.
- **Coverage Target**: All store operations and the panel field-edit mapping.
- **Tools**: Jest; component tests with `@testing-library/react` for panel/overlay wiring.

### Integration Testing
- **Strategy**: This demo *is* the end-to-end integration surface for SIFR-I-0002 + SIFR-I-0003. A Playwright test loads the admin, asserts overlays appear over targets, performs an edit, and asserts the iframe content and overlay geometry update; resize/scroll assertions verify alignment.
- **Test Environment**: Playwright against the locally served demo pair (also runnable in CI headless).
- **Data Management**: Seeded in-memory content fixture.

### System Testing
- **Strategy**: The five-minute reviewer flow (Use Case 1) is scripted as the primary acceptance walkthrough.
- **User Acceptance**: Daniel reviews the running demo against the vision success criteria (4–6 targets incl. nested; accurate tracking under resize/scroll; live injection).
- **Performance Testing**: Not a focus; only that overlay updates stay smooth during scroll/resize (covered by the throttling in SIFR-I-0002/0003).

### Test Selection
- Prioritize the end-to-end overlay-alignment-under-resize/scroll flow and the live content-injection flow — these are the vision's headline success criteria.

### Bug Tracking
- Demo defects are tracked as tasks under this initiative; defects traced to a package are filed against SIFR-I-0002/0003.

## Alternatives Considered **[REQUIRED]**

- **Reuse the prototype `demoApp` + `app` directly as the demo** — Rejected: they are entangled and predate the clean packages; the demo must showcase the *extracted* packages, per the vision (the old repos stay private/experimental).
- **Wire the demo to SVER's versioned engine now** — Deferred: SVER integration is its own initiative and would block this demo on another project; an in-memory store behind an interface keeps this demo shippable and swappable.
- **Log connection errors to console (as the prototype does)** — Rejected: the vision requires connection state and errors shown clearly in the UI.
- **Skip the automated Playwright E2E and rely on manual review** — Rejected: the alignment-under-resize/scroll behavior regresses easily; an automated E2E guards the headline success criteria.

## Implementation Plan **[REQUIRED]**

Phase 1 — Demo site: React app with `StardustAdapterProvider` and 4–6 `EditableTarget`s incl. a nested container; seed content.
Phase 2 — Admin shell: iframe embed + `useStardustHost` + styled overlay primitives + connection-status UI.
Phase 3 — Editing: in-memory content store behind an interface; select/add/move/edit/delete wired to structured operations + side panel with basic fields; live `cms/sendElements` re-injection.
Phase 4 — Verification + polish: Playwright E2E for alignment + injection; single `npm run demo` command; README screenshots + GIF/video capture instructions.

## Risks & Dependencies **[REQUIRED]**

**Risks:**
- End-to-end alignment bugs (scale/scroll) may surface only here — mitigated by the Playwright resize/scroll assertions and by the pure `mapGeometry` tests upstream.
- Demo scope creep into a real CMS — mitigated by the explicit non-goals (in-memory store, no auth/backend).
- In-memory store interface may not match SVER's operation vocabulary — mitigated by aligning the store interface with SVER's operations during design (cross-referenced with SIFR-I-0003's structured ops).

**Dependencies:**
- Upstream: SIFR-I-0002 (iframe side) and SIFR-I-0003 (host side) must be usable; SIFR-I-0001 protocol; FLINK transport.
- Downstream: SVER's "Integration With Stardust Iframe Demo" initiative replaces the in-memory store with the versioned engine and adds draft/live/publish/previous-version controls; SIFR-I-0005 (style) and SIFR-I-0006 (presence) layer optional features onto this demo; the PORT project uses this demo's screenshots/GIF as the portfolio artifact.

## Decomposition Plan **[REQUIRED]**

Expected tasks at `decompose` (each with a `Recommended Agent`):
1. Demo site app with 4–6 `EditableTarget`s incl. nested container + seed content — `sonnet + medium` (composes SIFR-I-0002 components following the demoApp pattern).
2. Admin shell: iframe embed + `useStardustHost` wiring + connection-status UI — `opus + medium` (integration across both package sides).
3. In-memory content store behind a swappable interface + operation application + tests — `opus + medium` (interface must anticipate SVER; correctness-tested).
4. Overlay styling + select/add/move/edit/delete controls + side panel with basic fields — `opus + medium` (multi-component UI wiring to structured ops).
5. Playwright E2E (alignment under resize/scroll + live injection) — `opus + medium` (guards the headline success criteria).
6. `npm run demo` one-command startup + README screenshots + GIF/video capture instructions — `sonnet + medium` (scripted, follows a stated pattern).