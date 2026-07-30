---
id: demo-site-app-with-editable
level: task
title: "Demo Site App With Editable Targets And Nested Container"
short_code: "SIFR-T-0007"
created_at: 2026-07-30T16:01:59.088275+00:00
updated_at: 2026-07-30T17:08:04.574970+00:00
parent: SIFR-I-0004
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/active"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0004
---

# Demo Site App With Editable Targets And Nested Container

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0004]]

## Objective **[REQUIRED]**

Build the demo site — the embedded page that the admin shell edits through the iframe. It is a small React app wrapped in `StardustAdapterProvider` (from the SIFR-I-0002 iframe-side package) that annotates 4–6 editable regions with `EditableTarget`, including at least one nested container target. This is the "site" half of the demo pair and the source of the geometry the host overlays track. It replaces the entangled prototype `code_temp/Stardust-CMS-App/demoApp/` (built on `CmsBaseProvider`/`CmsTarget`/`CmsContent`) with a clean consumer of the extracted package.

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] A React app exists in the package `examples/`/`demo/` workspace (demo-site) that mounts `StardustAdapterProvider` from the SIFR-I-0002 package with an explicit `localhost` origin (never `*`).
- [ ] The page renders 4–6 distinct `EditableTarget`s: a hero, a text block, an image/content card, a list, and at least one nested container target that can hold child blocks (grounding: the prototype's `data-cms-container-target` containers rendered by `CmsContent`'s `container` case).
- [ ] Each target is keyed by a stable target id that the host can reference; child blocks inside the container target each carry their own id so child geometry is streamable.
- [ ] Seed content is provided so the page renders meaningfully on first load with no host connected.
- [ ] The site renders content passed in via the adapter (so `cms/sendElements` from the host re-renders it) rather than hardcoding text inline.
- [ ] The site builds and runs standalone (`npm run dev` in the demo-site workspace) and shows all targets.
- [ ] No dependency on the admin/host package — the site only consumes the SIFR-I-0002 iframe-side package.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: All targets render with seed content
- **Test ID**: TC-001
- **Preconditions**: Demo-site workspace installed; run standalone dev server.
- **Steps**:
  1. Start the demo-site dev server.
  2. Open the served page in a browser.
  3. Inspect the DOM for the target-annotated elements.
- **Expected Results**: Hero, text block, image/content card, list, and nested container (with ≥1 child) are present, each with a stable target id attribute; seed content is visible.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

### Test Case 2: Content is adapter-driven, not hardcoded
- **Test ID**: TC-002
- **Preconditions**: Demo-site running.
- **Steps**:
  1. Feed alternate content through the adapter's content input (simulate a `cms/sendElements` payload).
  2. Observe the rendered page.
- **Expected Results**: The rendered text/image updates to the injected content; the container target reflects the injected child list.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

## Implementation Notes **[CONDITIONAL: Technical Task]**

Recommended Agent: sonnet + medium

### Technical Approach
Scaffold a Vite + React app in the demo workspace. Wrap the root in `StardustAdapterProvider` configured with the explicit localhost origin. Model page content as a small data structure (blocks with ids and types: hero/text/image/list/container-with-children) so it can be replaced wholesale by injected content; render it via `EditableTarget` wrappers. Mirror the prototype's `CmsContent` `container` case for the nested target so child blocks each render inside the container with individual ids. Provide a seed content constant. Keep styling minimal here (visual polish of overlays lives in SIFR-T-0010); the site just needs to look like a plausible marketing/content page.

### Dependencies
- Upstream package SIFR-I-0002 (`StardustAdapterProvider`, `EditableTarget`) must be importable from the workspace.
- Content-shape alignment with the store (SIFR-T-0009) — coordinate the block/child id vocabulary so store operations map cleanly; this task defines the on-page rendering, SIFR-T-0009 owns the authoritative store shape.

### Risk Considerations
- Nested container geometry is the trickiest for downstream overlay tracking; ensure each child is individually identifiable so SIFR-I-0002 can stream child positions. Mitigate by giving every child block a stable id from the start.
- Avoid coupling to the old prototype providers (`CmsBaseProvider`); import only from the extracted package.

## Status Updates **[REQUIRED]**

### Completion notes

Built the demo site under `demo/site` (Vite + React 18) consuming ONLY the iframe-side package via alias `@stardust-cms/iframe-adapter` (repo `src/iframe.ts`). No host/admin dependency.

- **Targets (7 total, 5 authored + nested container expanding to 2 children):** `hero`, `intro` (text), `showcase` (image card + caption), `features` (list of 3), and `split` — a `container` content item whose `ContentRenderer` expands into nested container targets `split-col.1` / `split-col.2`, each with their own child blocks carrying stable ids. Verified in-browser: `data-cms-container-target` present on `split`, `split-col.1`, `split-col.2`.
- **Adapter-driven, not hardcoded:** the page renders zero inline copy — every string comes through the provider content map. `SeedContent` seeds the map on mount via `applyContent` (the same reducer `cms/sendElements` uses), so host re-injection replaces seed items at the same `(targetId, index)` slots. TC-002 confirmed content is content-map-driven.
- **Standalone:** runs on fixed port 5174 (`strictPort`) so the admin embeds it at a known explicit origin. Renders fully with no host connected; the only console noise is frame-link's harmless "Not connected to target window" retry against `window.parent === self`.
- **Explicit origin (NFR-002):** `FrameLinkProvider` `targetOrigin` = `ADMIN_ORIGIN` (default `http://localhost:5173`), never `*`.
- **Shared vocabulary:** `demo/shared/src/content-model.ts` is the single source of truth for target ids + seed tree, imported by both the site and (T-0009) the store.

Verification: `demo/site` typechecks clean (`tsc -p demo/site/tsconfig.json`); Playwright snapshot shows all targets + seed content; library `tsc --noEmit` and `vitest run` (79 tests) remain green.

### TC-001: Pass — all targets render with seed content (snapshot verified).
### TC-002: Pass — content is adapter-driven; container reflects injected child list.