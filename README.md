# @stardust-cms/iframe-adapter

A drop-in toolkit for building **in-iframe visual editors**. Embed any site in an
iframe and map its editable elements to overlay controls in your host
application — selection handles, drag-and-drop, live content and style updates —
without the host ever touching the embedded document's DOM. Built on
[`frame-link`](https://www.npmjs.com/package/frame-link) for a typed,
promise-based `postMessage` transport, with a serializable protocol that is safe
to send across the frame boundary and reusable from non-React and server-side
code.

## Why it exists

Visual editors that live outside the page they edit have to solve one hard
problem cleanly: the editing chrome (overlays, handles, side panels) lives in the
**host** window, while the content it edits lives inside a sandboxed **iframe**.
The two can only talk over `postMessage`, everything on the wire must be
serializable, and geometry has to stay aligned as the inner page scrolls and
resizes. This package draws that boundary once, correctly, and hands you both
sides.

## What you get

- **A typed message protocol.** Every host↔iframe message is a namespaced
  `cms/*` key with a request/response payload type, keyed off `frame-link`'s
  generic message API so handlers infer their payloads automatically.
- **Serializable geometry.** Raw `DOMRect` never crosses the boundary. A plain
  `Geometry` value (`top/right/bottom/left/width/height/x/y`) is guaranteed to
  survive the structured-clone algorithm `postMessage` uses — proven by
  round-trip tests, enforced by compile-time assertions.
- **A clean host/iframe split.** Separate `./host` and `.` (iframe) entry points
  mean a public site bundle never ships host overlay code, and the host bundle
  never ships the iframe provider. A React-free `./protocol` subpath lets other
  services import just the types.

## Package layout

| Import                                | Use in            | Contents                                             |
| ------------------------------------- | ----------------- | ---------------------------------------------------- |
| `@stardust-cms/iframe-adapter`        | embedded site     | iframe-side adapter (alias of `./iframe`)            |
| `@stardust-cms/iframe-adapter/host`   | host/admin shell  | host-side overlay adapter                            |
| `@stardust-cms/iframe-adapter/protocol` | anywhere        | framework-agnostic types + message registry (React-free) |

## Protocol at a glance

```ts
import type {
  Geometry,        // serializable rect: { top,right,bottom,left,width,height,x,y }
  ScrollState,     // { h, y, isTop, isBottom }
  ContentTarget,   // { targetId, isContainer, geometry, children }
  ChildContent,    // { contentId, index, isContainer, styleGroup, geometry }
  StardustMessageRegistry,
} from "@stardust-cms/iframe-adapter/protocol";
```

| Message key                    | Direction     | Request → Response          |
| ------------------------------ | ------------- | --------------------------- |
| `cms/requestTargetPositions`   | host → iframe | `void` → `ContentTarget[]`  |
| `cms/sendElements`             | host → iframe | `ContentPayload` → `void`   |
| `cms/updateStyles`             | host → iframe | `StyleUpdatePayload` → `void` |
| `cms/sendElementPositions`     | iframe → host | `ContentTarget[]` → `void`  |
| `cms/sendScrollPositions`      | iframe → host | `ScrollState` → `void`      |

The iframe discovers targets/content from `data-cms*` attributes and publishes
geometry; the host maps that geometry into overlay space and issues content and
style intents. The host never reads the iframe DOM directly, and the iframe
never knows overlays exist. See [`docs/responsibilities.md`](docs/responsibilities.md)
for the full ownership table.

## Installation

```sh
npm install @stardust-cms/iframe-adapter frame-link frame-link-react
```

`frame-link`, `frame-link-react`, and `react >=18` are peer dependencies.

## Security

Transport target origins are always explicit — no wildcard `*` `postMessage`
origins appear anywhere in this package. Configure the target origin through
`frame-link`'s options.

## Status

The framework-agnostic protocol layer (types, message registry,
serializability guarantees) is complete. The iframe-side and host-side React
adapters build on this protocol and are delivered by the accompanying
initiatives.

## License

MIT © Daniel Cassil
