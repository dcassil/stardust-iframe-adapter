---
id: adr-package-boundary-and-frame
level: task
title: "ADR: Package Boundary And Frame-Link-Over-Old-Transport Decision"
short_code: "SIFR-T-0005"
created_at: 2026-07-30T16:01:24.445950+00:00
updated_at: 2026-07-30T16:22:33.226180+00:00
parent: SIFR-I-0001
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/active"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0001
---

# ADR: Package Boundary And Frame-Link-Over-Old-Transport Decision

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0001]]

## Objective **[REQUIRED]**

Author the load-bearing Architecture Decision Record for the `@stardust-cms/iframe-adapter` package. The ADR records two intertwined decisions: (a) the package boundary — a single `@stardust-cms/iframe-adapter` package with split iframe/host entry points over one framework-agnostic protocol module — and (b) using FLINK's `frame-link`/`frame-link-react` as the transport instead of resurrecting Stardust's bespoke `usePostMessage`/`useFrame`. This record is what SIFR-I-0002/0003 and future maintainers consult to understand why the boundary is drawn where it is. It must follow Daniel's global ADR rules: full context, decision, alternatives with reasoning, consequences (positive and negative), and follow-up actions.

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] An ADR document is created (as a Metis ADR via the metis tooling, matching this project's enabled `adr` type) titled for the package boundary + transport decision.
- [ ] **Context** section explains the prototype's ad-hoc stringly postMessage state (`cms_request_target_positions` etc.), the two disagreeing prototype generations, the raw `DOMRect` serialization problem, and the dependency on FLINK being publication-ready.
- [ ] **Decision** section states: package name `@stardust-cms/iframe-adapter`, dual `.`/`./host` (+ `./protocol`) entry split, framework-agnostic protocol module, and `frame-link`/`frame-link-react` + `react >=18` as peer deps / transport.
- [ ] **Alternatives Considered** documents, each with reasoning for rejection: (1) keep Stardust's stringly names and just document them; (2) reuse Stardust's `usePostMessage`/`useFrame` transport; (3) pass `DOMRect` directly over postMessage; (4) single package entry point; (5) design content versioning here (deferred to SVER).
- [ ] **Consequences** section lists positive outcomes (typed/tested/secure-by-default transport, framework-agnostic types reusable by SVER, bundle separation) AND negative ones (hard peer-dependency coupling to FLINK's release cadence, migration cost from the prototype's names, reserved-channel over-design risk).
- [ ] **Follow-up Actions** section references the downstream consumers (SIFR-I-0002, SIFR-I-0003, SIFR-I-0005, SIFR-I-0006, SVER) and the API-proposal review sign-off gate before implementation begins.
- [ ] The ADR references the concrete artifacts from SIFR-T-0002 (protocol module) and SIFR-T-0004 (exports/responsibilities) so it is grounded, not abstract.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Create the ADR through the Metis `create_document` ADR type under this project, then fully populate every section per the global rules. Pull specifics from the initiative's Alternatives Considered and Detailed Design sections and from the outputs of SIFR-T-0002/0004 so the record matches what was actually built. No source code; this is a decision record.

### Dependencies
Best authored after SIFR-T-0002 (protocol module) and SIFR-T-0004 (package metadata/responsibilities) so the ADR reflects final decisions rather than intent. Depends conceptually on the FLINK publication-readiness dependency noted in the initiative.

### Risk Considerations
Risk is an ADR that restates intent without grounding in the delivered types, making it useless for future maintainers. Mitigation: cite the actual exported type names, registry keys, and exports map. Also ensure the frame-link coupling consequence is honestly recorded so the release-cadence dependency is visible.

### Execution profile
Recommended Agent: opus + medium

## Status Updates **[REQUIRED]**

### Completion notes
Authored ADR **SIFR-A-0001** ("Package Boundary And Frame-Link-Over-Old-Transport") at `.metis/adrs/SIFR-A-0001.md`, fully populated per the global ADR rules:
- **Context**: stringly postMessage state, two disagreeing generations (incl. the latent scroll emitter/listener name mismatch), the raw `DOMRect` serialization hazard, and FLINK publication-readiness coupling.
- **Decision**: `@stardust-cms/iframe-adapter`, dual `.`/`./host` (+ `./protocol`) split, framework-agnostic protocol module, `frame-link`/`frame-link-react` + `react >=18` transport/peerDeps.
- **Alternatives**: 5 rejected options (keep strings; reuse bespoke transport; pass `DOMRect`; single entry; version content here) with pros/cons/risk/cost table + rationale.
- **Consequences**: positive (typed/tested/secure transport, reusable types, bundle separation) and negative (FLINK release-cadence coupling, migration cost, reserved-channel risk) + neutral.
- **Follow-up**: SIFR-I-0002/0003/0005/0006, SVER, and the API-proposal review sign-off gate.
- Grounded in concrete artifacts from SIFR-T-0001/0002/0004 (cited by path + registry keys).
Transitioned ADR draft → discussion → decided.