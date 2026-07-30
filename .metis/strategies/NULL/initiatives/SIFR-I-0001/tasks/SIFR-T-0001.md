---
id: protocol-inventory-map-prototype
level: task
title: "Protocol Inventory: Map Prototype Messages, Attributes, And Payloads To Namespaced Keys"
short_code: "SIFR-T-0001"
created_at: 2026-07-30T16:01:17.211392+00:00
updated_at: 2026-07-30T16:16:38.399866+00:00
parent: SIFR-I-0001
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0001
---

# Protocol Inventory: Map Prototype Messages, Attributes, And Payloads To Namespaced Keys

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0001]]

## Objective **[REQUIRED]**

Produce an exhaustive inventory of every postMessage message name, payload shape, and DOM data-attribute used across both generations of the Stardust CMS prototype, and map each observed string to a proposed namespaced protocol key. This inventory is the factual foundation for SIFR-T-0002 (the protocol module): the type design must be grounded in what the prototype actually sends/receives, not guessed. The deliverable is a written mapping document (a markdown artifact placed in the package's design docs, e.g. `docs/protocol-inventory.md`) that reconciles the two prototype generations and flags any message the newer generation dropped or renamed.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] Every message name in the current iframe side is captured: `cms_request_target_positions`, `cms_send_elements`, `cms_adapter_send_element_positions`, `cms_adapter_send_scroll_positions` (from `demoApp/src/lib/context/CmsBase.context.tsx`) with sender, receiver, direction, and payload shape recorded for each.
- [ ] Every message name in the older backup generation is captured: `get_cms_positions`, `cms_positions` (from `useCMSTarget.tsx`) plus any others found in `useFrame.tsx` and `IFrame.tsx`, with the same fields.
- [ ] Each DOM data-attribute the prototype emits/reads is inventoried: `data-cms`, `data-cms-content`, `data-cms-container-target`, `data-style-group`, with the utility function that produces/consumes it noted (e.g. `getElementsWithPositionData()`, `getChildContent()` in `CmsTarget.utils.ts`).
- [ ] The raw `DOMRect` usage from `getBoundingClientRect()` in `CmsTarget.utils.ts` is documented, listing exactly which fields (`top/right/bottom/left/width/height/x/y`) are copied out — this feeds the `Geometry` type.
- [ ] The scroll payload shape from `useFrame.tsx` (`TFramePositions`: `{ h, y, isTop, isBottom }`) is recorded as the basis for `ScrollState`.
- [ ] A mapping table is produced: old string → proposed namespaced key (`cms_request_target_positions` → `cms/requestTargetPositions`, `cms_send_elements` → `cms/sendElements`, `cms_adapter_send_element_positions` → `cms/sendElementPositions`, `cms_adapter_send_scroll_positions` → `cms/sendScrollPositions`), including the reserved `cms/updateStyles` and `cms/presence` channels noted as not-in-prototype.
- [ ] Any discrepancy between the two generations (a message present in one but not the other, or a field that changed) is explicitly called out with a recommendation on which to adopt.
- [ ] Any message the prototype needs but that has no clean namespaced mapping is logged as an open question for SIFR-T-0002.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Read-and-catalog task. Grep both prototype trees (`code_temp/Stardust-CMS-App` and `code_temp/Stardust-CMS-APP-Original-backup`) for `postMessage`, `addEventListener("message"`, the `frame-link`/`FrameLinkContext` usage, and each `data-cms*` / `data-style-group` attribute. Trace each message from emit site to handler to record the actual payload object. Cross-reference `CmsBase.context.tsx`, `CmsTarget.utils.ts`, `useCMSTarget.tsx`, `useFrame.tsx`, and `IFrame.tsx`. Produce the mapping as a markdown table. No production code is written in this task.

### Dependencies
None upstream within the initiative; this is the first task and unblocks SIFR-T-0002. Depends only on read access to the two prototype directories.

### Risk Considerations
The two generations disagree (e.g. `get_cms_positions` vs `cms_request_target_positions`); picking the wrong superset could miss a needed field. Mitigation: inventory BOTH generations exhaustively and reconcile explicitly rather than trusting the newer one alone. Missing a message here forces a protocol change after downstream initiatives build against it, so completeness is the acceptance bar.

### Execution profile
Recommended Agent: opus + medium

## Status Updates **[REQUIRED]**

### Completion notes
Delivered `docs/protocol-inventory.md`: full catalog of both prototype generations.
- Current gen (`CmsBase.context.tsx`, `CmsTarget.utils.ts`, `useFrame.tsx`, `IFrame.tsx`) and backup gen (`useCMSTarget.tsx`, `useFrame.tsx`) messages captured with sender/receiver/direction/payload.
- Data-attributes `data-cms`, `data-cms-content`, `data-cms-container-target`, `data-style-group` mapped to protocol fields with producing/consuming utilities.
- Raw `DOMRect` usage documented (fields top/right/bottom/left/width/height/x/y) → basis for `Geometry`.
- `TFramePositions` `{ h, y, isTop, isBottom }` → basis for `ScrollState`.
- Full old-string → namespaced-key mapping table incl. reserved `cms/updateStyles`, `cms/presence`.
- 5 cross-generation discrepancies reconciled (incl. a latent emitter/listener name mismatch in the current gen).
- 5 open questions (OQ-1..5) logged for SIFR-T-0002.

Committed as `feat(protocol): SIFR-T-0001 ...`.