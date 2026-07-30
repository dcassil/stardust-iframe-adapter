---
id: package-metadata-name-exports
level: task
title: "Package Metadata: Name, Exports Iframe/Host Split, Peer Deps, And Responsibilities Table"
short_code: "SIFR-T-0004"
created_at: 2026-07-30T16:01:23.165487+00:00
updated_at: 2026-07-30T16:20:25.719873+00:00
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

# Package Metadata: Name, Exports Iframe/Host Split, Peer Deps, And Responsibilities Table

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0001]]

## Objective **[REQUIRED]**

Specify the public package identity and boundary so that SIFR-I-0002 (iframe side) and SIFR-I-0003 (host side) build against a settled surface: the package name, the dual `exports` map that splits the iframe entry from the host entry, the peer dependencies, and the host-vs-iframe responsibilities table. The goal is that a public site bundle never pulls in host overlay code and vice versa, and that the ownership of each message is unambiguous.

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] Package name specified as `@stardust-cms/iframe-adapter`, ESM-first (matching FLINK), documented in `package.json` (or a proposal snippet if package.json does not yet exist).
- [ ] `peerDependencies` declared: `frame-link`, `frame-link-react`, and `react >=18`.
- [ ] An `exports` map provides split subpaths: `.` (or `./iframe`) for the iframe-side entry and `./host` for the host-side entry, plus a `./protocol` (or equivalent) export for the framework-agnostic protocol module so SVER and non-React consumers can import types without React.
- [ ] It is demonstrated (by the exports layout / import graph) that importing the host entry does not transitively pull the iframe provider code and vice versa.
- [ ] A responsibilities table is written mapping every `cms/*` message to its sender, receiver, and side: iframe owns target/content discovery, geometry serialization, resize/scroll observation, content rendering; host owns overlay geometry mapping (scale + scroll offset), selection/drag-drop intent, and issuing content/style updates. The host never reads the iframe DOM directly; the iframe never knows about overlays.
- [ ] The table explicitly places `cms/requestTargetPositions`, `cms/sendElements`, `cms/updateStyles` as host-sent and `cms/sendElementPositions`, `cms/sendScrollPositions` as iframe-sent (matching the initiative use cases).
- [ ] No wildcard `*` origin appears in any non-demo example in the package metadata or docs (NFR-002).

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Author `package.json` metadata (name, type: module, peerDependencies, exports map with `import`/`types` conditions per subpath) and a `docs/responsibilities.md` (or a section in the API proposal) containing the responsibilities table. Reference the exported type names and registry keys from SIFR-T-0002 so the table and exports line up with the actual module. Keep runtime code out of scope — this is metadata plus a documentation table.

### Dependencies
Depends on SIFR-T-0002 (the protocol module's export path and type names anchor the `./protocol` subpath and the responsibilities table). Feeds SIFR-T-0005 (the ADR records the boundary this task specifies).

### Risk Considerations
Small, low-risk task since the design is largely settled after SIFR-T-0002. Main pitfall is an `exports` map that accidentally lets host and iframe code cross-import — mitigated by explicit subpath conditions and a note verifying the import graph separation.

### Execution profile
Recommended Agent: opus + low

## Status Updates **[REQUIRED]**

*To be added during implementation*