# Package Boundary & Message Responsibilities (SIFR-T-0004)

Defines the public surface of `@stardust-cms/iframe-adapter` and the ownership of
every `cms/*` message. This is the contract SIFR-I-0002 (iframe side) and
SIFR-I-0003 (host side) build against.

## Package identity

- **npm name**: `@stardust-cms/iframe-adapter`
- **Module format**: ESM-first (`"type": "module"`), matching `frame-link`.
- **Peer dependencies**: `frame-link ^3`, `frame-link-react ^3`, `react >=18`.

## Exports map (bundle separation)

Three isolated subpaths plus the default entry:

| Subpath      | Purpose                                                        | May import                         |
| ------------ | ------------------------------------------------------------- | ---------------------------------- |
| `.` / `./iframe` | Iframe-side adapter (public/embedded site bundle)         | `./protocol` + iframe-side code    |
| `./host`     | Host-side overlay adapter (admin/builder shell bundle)        | `./protocol` + host-side code      |
| `./protocol` | Framework-agnostic types + registry marker (React-free)       | nothing (leaf)                     |

**Separation invariant.** `src/iframe.ts` must never import `./host`, and
`src/host.ts` must never import `./iframe`. Both may re-export `./protocol`.
Because the two entries share only the React-free protocol leaf and never
reference each other, a public site bundle that imports `.`/`./iframe` cannot
transitively pull in host overlay code, and the host bundle cannot pull in the
iframe provider code. The entry files
(`src/iframe.ts`, `src/host.ts`, `src/protocol.ts`) enforce this by construction;
the import graph is a shallow fan-out from each entry into `./protocol` only.

`./protocol` imports neither React nor DOM-runtime code, so SVER and other
non-React/server-side consumers can import the protocol types alone.

## Message responsibilities

Ownership rule: **the host never reads the iframe DOM directly; the iframe never
knows about overlays.** The iframe discovers targets/content and publishes
serializable geometry; the host maps that geometry into overlay space and issues
content/style intents.

| Message key                    | Sender | Receiver | Owning side (behavior)                        | Payload (request → response)        |
| ------------------------------ | ------ | -------- | --------------------------------------------- | ----------------------------------- |
| `cms/requestTargetPositions`   | host   | iframe   | iframe answers (target/content discovery)     | `void` → `ContentTarget[]`          |
| `cms/sendElements`             | host   | iframe   | iframe applies (content rendering)            | `ContentPayload` → `void`           |
| `cms/updateStyles`             | host   | iframe   | iframe applies (style rules, SIFR-I-0005)     | `StyleUpdatePayload` → `void`       |
| `cms/sendElementPositions`     | iframe | host     | host consumes (overlay geometry mapping)      | `ContentTarget[]` → `void`          |
| `cms/sendScrollPositions`      | iframe | host     | host consumes (scroll-offset projection)      | `ScrollState` → `void`              |
| `cms/presence` *(reserved)*    | —      | —        | SIFR-I-0006; declared reserved, no handler    | reserved                            |

Direction summary (matches the initiative use cases):

- **Host-sent** (host → iframe): `cms/requestTargetPositions`,
  `cms/sendElements`, `cms/updateStyles`.
- **Iframe-sent** (iframe → host): `cms/sendElementPositions`,
  `cms/sendScrollPositions`.

### Side responsibilities in detail

**Iframe side** (`.`/`./iframe`):
- Discover CMS targets/content via `data-cms*` attributes.
- Serialize geometry into `Geometry` (never `DOMRect` over the wire).
- Observe resize/scroll and re-publish positions + scroll state.
- Render content pushed via `cms/sendElements`; apply styles via
  `cms/updateStyles`.

**Host side** (`./host`):
- Request and consume target positions; map iframe geometry into overlay
  coordinates (scale + scroll offset).
- Own selection and drag-drop intent.
- Issue content updates (`cms/sendElements`) and style updates
  (`cms/updateStyles`).

## Security note (NFR-002)

No wildcard `*` `postMessage` target origin appears anywhere in this package's
metadata or docs. Consumers must configure an explicit target origin through
`frame-link`'s options. Wildcard origins may appear only in throwaway demo code
outside the published package.
