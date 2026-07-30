---
id: stardust-iframe-adapter
level: vision
title: "stardust-iframe-adapter"
short_code: "SIFR-V-0001"
created_at: 2026-07-30T01:48:19.923502+00:00
updated_at: 2026-07-30T14:02:01.926137+00:00
archived: false

tags:
  - "#vision"
  - "#phase/published"


exit_criteria_met: false
strategy_id: NULL
initiative_id: NULL
---

# Stardust Iframe Adapter Extraction Vision

## Purpose **[REQUIRED]**

Extract the CMS-specific iframe protocol buried inside the Stardust prototypes into a clean, focused public package plus a convincing demo. The package lets a host admin UI map editable elements living inside an iframe to overlay controls, inject content into the iframe, track geometry and scroll state, and support a draft/live editing workflow. This vision exists to convert scattered prototype code (`Stardust-CMS-App` and `Stardust-CMS-APP-Original-backup`) into the single public artifact that tells the strongest portfolio story, while letting the old repos stay private/experimental. It builds on Frame Link as its transport rather than carrying its own `postMessage` implementation.

## Product/Solution Overview **[CONDITIONAL: Product/Solution Vision]**

The solution is a public package (recommended name `@stardust-cms/iframe-adapter`) with two cooperating sides plus a demo:

- **Iframe-side adapter** — React components/provider that mark editable targets (`data-cms`) and content (`data-cms-content`) inside the embedded site, discover them deterministically, and report serializable geometry to the host.
- **Host-side overlay adapter** — hooks/primitives that request target positions and render accurately-mapped overlays over the iframe, accounting for scale and scroll, and emit structured drag/drop/insert operations.
- **Demo admin + demo site** — a runnable pair that makes the iframe-mapping value obvious to a recruiter in under five minutes.

Target audience: engineers evaluating the portfolio, and conceptually anyone building in-context/visual editing over an embedded site. Key benefit: a drop-in way to build an in-iframe visual editor without coupling to a specific CMS backend.

## Current State **[REQUIRED]**

- The capability exists only as prototype code split across two Stardust repos with mixed quality and CMS-specific coupling.
- The iframe protocol is partly stringly-typed and undocumented; geometry is passed as raw `DOMRect`.
- Host overlay logic is entangled with Stardust's old UI contexts and content store.
- There is no clean package boundary, no dedicated tests for target discovery/geometry, and no standalone demo.
- Transport is a bespoke `usePostMessage` hook rather than the cleaner Frame Link packages.

## Future State **[REQUIRED]**

- A clean, typed, tested package with clear host vs iframe responsibilities, built on `frame-link` / `frame-link-react`.
- A namespaced, fully-typed message registry with serializable geometry types (no raw `DOMRect` over the wire).
- Iframe-side target discovery is deterministic and tested (empty, nested, content-children, style groups).
- Host-side overlays track target and child positions accurately during resize and scroll, and emit structured operations instead of mutating a content store directly.
- A demo admin embeds a demo site with 4–6 editable targets (including a nested container) and supports select/add/move/edit/delete with visible content injection.

## Major Features **[CONDITIONAL: Product Vision]**

- **Typed iframe protocol** — namespaced request/response + event messages on top of Frame Link, with serializable geometry and content-target metadata (target id, container flag, child content id, index, style group).
- **Deterministic target discovery** — discovery against `data-cms` / `data-cms-content` with `ResizeObserver`/`MutationObserver` and throttled scroll/resize updates, plus lifecycle-safe listener cleanup.
- **Accurate host overlays** — geometry mapping with iframe scale and scroll offsets; target-area and content-item overlay primitives kept minimal and reusable.
- **Draft/live editing workflow** — content injection/update visible immediately in the iframe; integrates the Versioned Content Engine as the content store in the demo.
- **Optional style rules and presence** — a safe style-rule allowlist and an optional presence/edit-lock provider, both scoped as supporting features, not the lead package.

## Business Requirements Overview **[CONDITIONAL: Business Vision]**

- The public artifact must stand alone so the original Stardust repos can remain private/experimental.
- It must read as product judgment + engineering rigor to a recruiter, not as an unfinished SaaS.

## Success Criteria **[REQUIRED]**

- A demo admin app loads a demo site in an iframe.
- Demo site has 4–6 editable targets, including at least one nested/container target.
- Admin overlay accurately tracks target and child positions during resize and scroll.
- Admin can inject/update content and see the iframe update immediately.
- The package has typed protocol definitions and tests for target discovery and geometry.
- Current Stardust prototype repos can remain private because the extracted package is the public artifact.

## Principles **[REQUIRED]**

- **Build on Frame Link** — no reintroducing a custom `postMessage` hook; the adapter is a consumer of the transport layer.
- **Serializable protocol** — geometry and target metadata cross the boundary as explicit, typed, serializable objects, never raw DOM objects.
- **Decoupled from any content store** — the adapter emits structured operations; it does not mutate a specific store or depend on Stardust's old contexts.
- **Supporting features stay supporting** — style rules and presence are optional demo features; the lead is iframe element mapping.
- **Demo-first credibility** — the value must be visible without reading source.

## Constraints **[REQUIRED]**

- Depends on Frame Link's public API; changes needed there flow back to the FLINK project, not into a private fork.
- No standalone collaboration package and no CRDT/OT in this phase; presence is presence/edit-locks only.
- Host overlay components stay minimal/reusable — the demo app owns styling.
- Style injection must use a managed `<style>` tag; it must not delete global stylesheet rules.
- Old Stardust repos are not published as-is.