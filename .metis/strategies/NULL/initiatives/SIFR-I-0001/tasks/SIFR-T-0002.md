---
id: define-framework-agnostic-protocol
level: task
title: "Define Framework-Agnostic Protocol Module: MessageRegistry, Geometry, ScrollState, ContentTarget, ChildContent"
short_code: "SIFR-T-0002"
created_at: 2026-07-30T16:01:19.133595+00:00
updated_at: 2026-07-30T16:19:07.744658+00:00
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

# Define Framework-Agnostic Protocol Module: MessageRegistry, Geometry, ScrollState, ContentTarget, ChildContent

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0001]]

## Objective **[REQUIRED]**

Define the framework-agnostic `protocol` module that is the core substrate every downstream SIFR initiative and the SVER project consume. This module contains only types and one registry object — zero React and zero DOM runtime dependencies — so it can be imported by non-React and server-side consumers. It codifies: the `MessageRegistry` (every host↔iframe message keyed and typed), the serializable `Geometry`/`ScrollState` types (replacing raw `DOMRect`), and the `ContentTarget`/`ChildContent` metadata types. Wrong choices here compound across SIFR-I-0002, SIFR-I-0003, SIFR-I-0005, and SVER, so this is the highest-stakes task in the initiative.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] A `MessageRegistry` interface exists mapping each message key to `{ request; response }` payload types, consumable by frame-link's generic message API. Keys are namespaced under `cms/`: at minimum `cms/requestTargetPositions`, `cms/sendElements`, `cms/sendElementPositions`, `cms/sendScrollPositions`, and `cms/updateStyles`.
- [ ] `cms/presence` is present as a reserved, documented-as-out-of-scope-to-implement channel (for SIFR-I-0006) — declared in the registry types but marked reserved; no runtime handler behavior is defined here.
- [ ] A `Geometry` type (alias `SerializableRect`) is defined with exactly `{ top, right, bottom, left, width, height, x, y }` — all `number` — matching the fields `CmsTarget.utils.ts` copies out of `getBoundingClientRect()`. No exported type references `DOMRect`.
- [ ] A `ScrollState` type is defined as `{ h, y, isTop, isBottom }` matching `useFrame.tsx`'s `TFramePositions`, used as the `cms/sendScrollPositions` payload.
- [ ] `ContentTarget { targetId; isContainer; geometry; children: ChildContent[] }` and `ChildContent { contentId; index; isContainer; styleGroup; geometry }` are defined, grounded in `getElementsWithPositionData()` and `getChildContent()`; `targetId` corresponds to `data-cms`, `styleGroup` to `data-style-group`.
- [ ] Every payload type is structured-clone-safe by construction: no DOM nodes, functions, or class instances (NFR-001). Types carry no React import (NFR-004).
- [ ] Type-level assertions (tsd or `@ts-expect-error`-style) verify that each registry entry infers the correct request/response and that a wrong payload shape is a compile error. `tsc --noEmit` passes.
- [ ] The module is placed at a stable path (e.g. `src/protocol/index.ts`) that both the iframe and host entry points can import, per the split-entry design.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Consume the mapping from SIFR-T-0001. Author pure TypeScript type declarations plus one `const` registry-shape where frame-link's API requires a runtime object; otherwise types only. Namespace keys under `cms/`. Keep the module import-free of `react` and DOM lib types beyond what is structurally needed (prefer plain numeric/string fields). Co-locate type-level assertions so the design is self-verifying at compile time. The registry must line up with the message API frame-link exposes so SIFR-I-0002/0003 can key handlers directly off these types with full inference.

### Dependencies
Depends on SIFR-T-0001 (inventory) for the authoritative message/attribute/payload list. Unblocks SIFR-T-0003 (serializability tests), SIFR-T-0004 (package metadata references these exported types), and SIFR-T-0005 (ADR references the boundary these types establish).

### Risk Considerations
Under-specifying a message or a field forces a protocol change after downstream initiatives build against it. Mitigation: ground every field in SIFR-T-0001's observed source and reconcile both prototype generations. Over-designing reserved channels (`cms/presence`, `cms/updateStyles`) is a lesser risk — mitigated by marking them reserved/optional rather than fleshing out unused behavior.

### Execution profile
Recommended Agent: opus + high

## Status Updates **[REQUIRED]**

### Completion notes
Built the framework-agnostic protocol module and package skeleton.
Files: `src/protocol/index.ts` (types + `StardustMessageRegistry` + `MESSAGE_KEYS` runtime marker), `src/protocol/type-assertions.ts` (compile-time assertions incl. a `@ts-expect-error` proving a wrong payload shape is rejected), `package.json`, `tsconfig.json` (strict, NodeNext ESM, noEmit), `vitest.config.ts`.
- `Geometry`/`SerializableRect` = exactly `{top,right,bottom,left,width,height,x,y}` all number; no `DOMRect` referenced.
- `ScrollState` = `{h,y,isTop,isBottom}`.
- `ContentTarget{targetId,isContainer,geometry,children}` + `ChildContent{contentId,index,isContainer,styleGroup,geometry}`.
- Registry keys: `cms/requestTargetPositions`, `cms/sendElements`, `cms/sendElementPositions`, `cms/sendScrollPositions`, `cms/updateStyles`, and reserved `cms/presence`.
- Registry uses `MessageDefinition<request,response>` structurally compatible with frame-link's `MessageDefinition<payload,response>` (request === payload).
- No `react` import anywhere in the module (NFR-004); all payloads structured-clone-safe (NFR-001).
Verification: `npx tsc --noEmit` passes clean (TSC_CLEAN).