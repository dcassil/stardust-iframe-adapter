---
id: 001-package-boundary-and-frame-link
level: adr
title: "Package Boundary And Frame-Link-Over-Old-Transport"
number: 1
short_code: "SIFR-A-0001"
created_at: 2026-07-30T16:22:34.598025+00:00
updated_at: 2026-07-30T16:24:53.586403+00:00
decision_date: 
decision_maker: Daniel Cassil
parent: 
archived: false

tags:
  - "#adr"
  - "#phase/decided"


exit_criteria_met: true
strategy_id: NULL
initiative_id: NULL
---

# ADR-1: Package Boundary And Frame-Link-Over-Old-Transport

Records two intertwined, load-bearing decisions for the
`@stardust-cms/iframe-adapter` package: (a) how the package boundary is drawn,
and (b) that FLINK's `frame-link` / `frame-link-react` are the transport rather
than a resurrection of Stardust's bespoke `usePostMessage` / `useFrame`.
Grounded in the concrete artifacts delivered by SIFR-T-0002 (protocol module)
and SIFR-T-0004 (exports + responsibilities), and the inventory from
SIFR-T-0001 (`docs/protocol-inventory.md`).

## Context **[REQUIRED]**

The Stardust CMS prototype implements an in-iframe visual editor: a host
admin/builder shell embeds a public site in an iframe, draws selection/overlay
chrome in the host window, and edits content that lives inside the iframe. The
two windows communicate only over `postMessage`. Extracting this into a
reusable, public, recruiter-facing package surfaced several problems in the
prototype that a clean boundary must resolve:

1. **Ad-hoc, stringly-typed messaging.** Messages are bare strings scattered
   across files with no shared registry or payload types:
   `cms_request_target_positions`, `cms_send_elements`,
   `cms_adapter_send_element_positions`, `cms_adapter_send_scroll_positions`
   (current gen, `CmsBase.context.tsx`) and `get_cms_positions`, `cms_positions`
   (backup gen, `useCMSTarget.tsx`). Nothing prevents a sender/receiver name or
   payload mismatch.

2. **Two disagreeing prototype generations.** The current generation
   (`code_temp/Stardust-CMS-App`, on `frame-link-react`) and the older backup
   (`code_temp/Stardust-CMS-APP-Original-backup`, on a bespoke callback
   `MessageContext`) use different message names and payload types for the same
   data. Worse, even within the current generation the iframe emits
   `cms_adapter_send_scroll_positions` while the host `useFrame.tsx` listens for
   `cms_scroll_positions` — a latent, silent name mismatch (see
   `docs/protocol-inventory.md` §7).

3. **Non-serializable geometry on the wire.** `CmsTarget.utils.ts` puts a raw
   `DOMRect` from `getBoundingClientRect()` directly onto the target payload
   (`:8,:14`). `DOMRect` is a class instance; it does not reliably
   structured-clone into a plain object with own enumerable fields, so it is a
   correctness hazard across the `postMessage` boundary (which uses the
   structured-clone algorithm).

4. **No bundle separation.** In the prototype, host and iframe concerns are
   interleaved. A public site bundle could pull in host overlay code and vice
   versa, bloating the embedded site and leaking editor internals.

5. **Transport publication readiness.** FLINK's `frame-link@3` and
   `frame-link-react@3` are now published-ready ESM packages with a typed,
   promise-based message API (`MessageRegistry`, `MessageDefinition<payload,
   response>`, `PayloadOf`/`ResponseOf`, and the `useHandler`/`useSend` React
   hooks). Adopting them makes this package depend on FLINK's release cadence — a
   deliberate coupling that must be recorded.

This ADR is the record SIFR-I-0002 (iframe side) and SIFR-I-0003 (host side)
consult to understand why the boundary is where it is.

## Decision **[REQUIRED]**

1. **One package, split entries.** Ship a single npm package named
   **`@stardust-cms/iframe-adapter`** (ESM-first, `"type": "module"`) exposing a
   dual `exports` map:
   - `.` and `./iframe` → the iframe-side adapter entry (embedded site bundle);
   - `./host` → the host-side overlay adapter entry (admin shell bundle);
   - `./protocol` → the framework-agnostic protocol module.

2. **A framework-agnostic protocol module** at `src/protocol/` (published as
   `./protocol`) containing only types plus one runtime marker
   (`MESSAGE_KEYS`) — zero `react`, zero DOM-runtime imports — so non-React and
   server-side consumers (notably the SVER project) can import the types alone.
   It defines: the `StardustMessageRegistry` (keys `cms/requestTargetPositions`,
   `cms/sendElements`, `cms/sendElementPositions`, `cms/sendScrollPositions`,
   `cms/updateStyles`, and reserved `cms/presence`); the serializable
   `Geometry`/`SerializableRect` (`{top,right,bottom,left,width,height,x,y}`,
   replacing `DOMRect`); `ScrollState` (`{h,y,isTop,isBottom}`); and
   `ContentTarget` / `ChildContent`.

3. **FLINK as the transport.** Use `frame-link` / `frame-link-react` for the
   `postMessage` transport. Peer dependencies are declared as
   `frame-link ^3`, `frame-link-react ^3`, and `react >=18`. Our
   `MessageDefinition<request, response>` is structurally aligned with
   frame-link's `MessageDefinition<payload, response>` (our `request` === its
   `payload`) so the registry drives frame-link's generic message API directly.

4. **Bundle-separation invariant.** The iframe entry never imports `./host` and
   the host entry never imports `./iframe`; both share only the React-free
   `./protocol` leaf. This is enforced by construction and verified against the
   built output (both `dist/iframe.js` and `dist/host.js` import only
   `./protocol/index.js`).

5. **Explicit origins only.** No wildcard `*` `postMessage` target origin appears
   in package metadata or docs (NFR-002); origins are configured through
   frame-link options.

## Alternatives Analysis **[CONDITIONAL: Complex Decision]**

| Option | Pros | Cons | Risk Level | Implementation Cost |
|--------|------|------|------------|-------------------|
| **(1) Keep Stardust's stringly names, just document them** | No renaming churn; least immediate work | No type safety; the latent emitter/listener mismatch persists; two generations still disagree; nothing prevents future drift | High | Low |
| **(2) Reuse Stardust's `usePostMessage`/`useFrame` transport** | Familiar to the prototype; no new dependency | Untyped callback transport; no request/response promises; must maintain bespoke messaging code; re-inherits the prototype's bugs | High | Medium |
| **(3) Pass `DOMRect` directly over postMessage** | No mapping code | `DOMRect` is a class instance — unreliable/incorrect under structured clone; couples payload to a DOM type; breaks non-DOM consumers | High | Low |
| **(4) Single package entry point (no host/iframe split)** | Simplest exports map | Public site bundle pulls in host overlay code and vice versa; leaks editor internals; larger embedded bundle | Medium | Low |
| **(5) Design content versioning here** | Would centralize CMS concerns | Out of scope; couples this package to unresolved SVER concerns; over-designs before requirements exist | Medium | High |
| **CHOSEN: single package, split `.`/`./host`/`./protocol` entries, FLINK transport, serializable `Geometry`** | Typed/tested/secure transport; framework-agnostic reusable types; bundle separation; fixes the prototype's latent bugs | Hard peer-dep coupling to FLINK's release cadence; migration cost from prototype names | Low | Medium |

## Rationale **[REQUIRED]**

- **Over (1) and (2):** the prototype's stringly transport already produced a
  real, silent bug (scroll emitter/listener name mismatch). A typed registry
  keyed off frame-link's `MessageRegistry` makes that class of bug a compile
  error and gives request/response promises for the ask-and-answer pattern
  (`cms/requestTargetPositions`). Reusing the bespoke transport would mean owning
  and hardening messaging code that FLINK already provides, tests, and secures.
- **Over (3):** `Geometry` as a plain 8-number object is provably
  structured-clone-safe (SIFR-T-0003 round-trips it; a negative test shows a
  class instance loses its prototype). This also decouples the protocol from the
  DOM so SVER/server code can use it.
- **Over (4):** splitting `./host` from `./iframe` over a shared React-free
  `./protocol` leaf guarantees a public site never ships overlay code — verified
  in the built import graph (SIFR-T-0004).
- **Over (5):** content versioning is deferred to SVER to keep this package's
  boundary tight and shippable.

## Consequences **[REQUIRED]**

### Positive
- Transport is typed, tested, and secure-by-default (explicit origins), reusing
  FLINK instead of bespoke messaging.
- The protocol types are framework-agnostic and reusable by SVER and any
  non-React/server-side consumer via `./protocol`.
- Bundle separation: host overlay code never reaches the embedded site bundle
  and vice versa (proven against built `dist/`).
- The prototype's latent scroll name mismatch and two-generation disagreements
  are reconciled once, in one authoritative registry.
- `DOMRect` serialization hazard is eliminated by `Geometry`.

### Negative
- **Hard peer-dependency coupling to FLINK's release cadence.** This package
  cannot ship a feature that requires a `frame-link`/`frame-link-react` capability
  until FLINK releases it; a breaking FLINK major forces a coordinated bump here.
- **Migration cost from the prototype's names.** Every prototype string
  (`cms_request_target_positions`, `get_cms_positions`, …) must be re-pointed to
  the new `cms/*` keys when the prototype is retired.
- **Reserved-channel over-design risk.** `cms/presence` and `cms/updateStyles`
  are declared before their consumers (SIFR-I-0006, SIFR-I-0005) exist; if those
  designs diverge, the reserved payloads may need revision. Mitigated by marking
  them reserved/minimal rather than fleshing out behavior now.

### Neutral
- The package is ESM-only, matching FLINK; CommonJS consumers are unsupported by
  design.
- `react >=18` is required transitively via `frame-link-react`, even though the
  `./protocol` subpath itself uses no React.

## Follow-up Actions

- **SIFR-I-0002 (iframe side)** builds the iframe provider/components against the
  `.`/`./iframe` entry and keys handlers off `StardustMessageRegistry`; it must
  reproduce the resize/scroll re-publish loop and the container `top/height -10`
  nudge noted in `docs/protocol-inventory.md` §4.
- **SIFR-I-0003 (host side)** builds the host hook/overlay against `./host`,
  consuming `cms/sendElementPositions` / `cms/sendScrollPositions` and mapping
  geometry into overlay space.
- **SIFR-I-0005 (style rules)** finalizes the reserved `cms/updateStyles`
  payload (`StyleUpdatePayload`).
- **SIFR-I-0006 (presence)** owns the reserved `cms/presence` channel.
- **SVER** consumes `./protocol` for content versioning; content versioning is
  explicitly out of scope here.
- **API-proposal review sign-off gate:** the exports map, registry keys, and
  responsibilities table (SIFR-T-0004, `docs/responsibilities.md`) must be
  reviewed and signed off before downstream implementation begins.

## Grounding artifacts

- `docs/protocol-inventory.md` (SIFR-T-0001) — message/attribute/payload inventory.
- `src/protocol/index.ts` (SIFR-T-0002) — `StardustMessageRegistry`, `Geometry`,
  `ScrollState`, `ContentTarget`, `ChildContent`, `MESSAGE_KEYS`.
- `src/protocol/__tests__/serializability.test.ts` (SIFR-T-0003) — NFR-001 proof.
- `package.json` exports map + `docs/responsibilities.md` (SIFR-T-0004) — boundary
  and message ownership.