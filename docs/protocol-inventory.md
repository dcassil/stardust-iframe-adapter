# Protocol Inventory (SIFR-T-0001)

Factual catalog of every postMessage message name, payload shape, and DOM
data-attribute used across the two Stardust CMS prototype generations, mapped to
proposed namespaced protocol keys. This is the authoritative input for
SIFR-T-0002 (the protocol module). Nothing here is invented: every row cites the
source file it was traced from.

Sources:

- **Current generation** — `code_temp/Stardust-CMS-App`
  - `demoApp/src/lib/context/CmsBase.context.tsx` (iframe side wiring)
  - `demoApp/src/lib/utils/CmsTarget.utils.ts` (element/geometry/child extraction)
  - `demoApp/src/lib/utils/CmsWindow.utils.ts` (`getWindowPositions`)
  - `app/src/hooks/useFrame.tsx` (host side scroll consumption, `TFramePositions`)
  - `app/src/components/iframe/IFrame.tsx` (host side listener registration)
- **Older backup generation** — `code_temp/Stardust-CMS-APP-Original-backup`
  - `client/builder/src/hooks/useCMSTarget.tsx`
  - `client/builder/src/hooks/useFrame.tsx`

Terminology: "iframe side" = the embedded public site running the CMS adapter;
"host side" = the admin/builder shell that embeds the iframe and draws overlays.

---

## 1. Current-generation messages

Traced from `CmsBase.context.tsx` (iframe side) and `useFrame.tsx` /
`IFrame.tsx` (host side).

| Message name (string)                     | Sender | Receiver | Direction     | Payload shape (as observed)                                             | Source |
| ----------------------------------------- | ------ | -------- | ------------- | ------------------------------------------------------------------------ | ------ |
| `cms_request_target_positions`            | host   | iframe   | host → iframe | request: `undefined`; response: `Cms.Element.ElementPosition[]`          | `CmsBase.context.tsx:29-32` (`useSubscribe<undefined, ElementPosition[]>`, handler `getElementsWithPositionData`) |
| `cms_send_elements`                       | host   | iframe   | host → iframe | request: `Cms.Content.Contents`; response: none (`updateElements`)      | `CmsBase.context.tsx:33` (`useSubscribe<Contents>("cms_send_elements", updateElements)`) |
| `cms_adapter_send_element_positions`      | iframe | host     | iframe → host | request: `Cms.Element.ElementPosition[]`; response: none                 | emit `CmsBase.context.tsx:22-24,38-48`; listen `IFrame.tsx:29` |
| `cms_adapter_send_scroll_positions`       | iframe | host     | iframe → host | request: `getWindowPositions()` = `{ h, y, isTop, isBottom }`; no resp   | emit `CmsBase.context.tsx:25-27,49`; consumed as scroll state on host |

Notes on the current generation:

- `cms_request_target_positions` is **request/response**: the host asks, the
  iframe replies with the target-position array in the same round-trip. All
  three other messages are **fire-and-forget** one-way sends.
- The `resize` and `scroll` window listeners in `CmsBase.context.tsx:35-61` both
  re-send `cms_adapter_send_element_positions`; `scroll` additionally sends
  `cms_adapter_send_scroll_positions`. That is the reactive re-publish loop the
  iframe adapter (SIFR-I-0002) must reproduce.
- `IFrame.tsx` also emits placeholder `postMessage("test1", …)` /
  commented-out `test2` calls (`IFrame.tsx:40-45`). These are dev scaffolding,
  **not protocol** — excluded from the mapping.

### Host-side scroll/mouse channels (current `app/src/hooks/useFrame.tsx`)

The current host `useFrame.tsx` listens on differently-named strings than the
iframe emits — a **naming discrepancy between the two halves of the same
generation** (see §4):

| Message name (string)   | Sender | Receiver | Direction     | Payload shape                              | Source |
| ----------------------- | ------ | -------- | ------------- | ------------------------------------------ | ------ |
| `cms_scroll_positions`  | iframe | host     | iframe → host | `TFramePositions` = `{ h, y, isTop, isBottom }` | `app/src/hooks/useFrame.tsx:44` (`addListener("cms_scroll_positions", setFrameScrollPositions)`) |
| `cms_mouse_positions`   | iframe | host     | iframe → host | `{ left: number, top: number }`            | `app/src/hooks/useFrame.tsx:45-49` |

`TFramePositions` is defined as `{ h, y, isTop, isBottom }` and initialized
`{ h: 0, y: 0, isTop: true, isBottom: false }` (`useFrame.tsx:30-36`). This is
the authoritative shape for `ScrollState`.

---

## 2. Older backup-generation messages

Traced from `useCMSTarget.tsx` and `useFrame.tsx` in the backup tree.

| Message name (string)   | Sender | Receiver | Direction     | Payload shape                               | Source |
| ----------------------- | ------ | -------- | ------------- | ------------------------------------------- | ------ |
| `get_cms_positions`     | host   | iframe   | host → iframe | request: `undefined`; response: `TCMSTarget[]` (via callback `(pos) => setTargetPositions(pos)`) | `useCMSTarget.tsx:82-85,106-108` |
| `cms_positions`         | iframe | host     | iframe → host | `TCMSTarget[]`                              | `useCMSTarget.tsx:75-78` (`addListener("cms_positions", (targets) => …)`) |
| `cms_scroll_positions`  | iframe | host     | iframe → host | `TFramePositions` = `{ h, y, isTop, isBottom }` | backup `useFrame.tsx:44` |
| `cms_mouse_positions`   | iframe | host     | iframe → host | `{ left: number, top: number }`             | backup `useFrame.tsx:45-49` |

Backup payload types (`useCMSTarget.tsx:8-22`):

```ts
type TCMSTarget     = { id: string; positions: DOMRect; content: TCMSTargetItem[]; isContainer?: boolean };
type TCMSTargetItem = { contentId: string; positions: DOMRect; index: string; group: string; styles: any; isContainer?: boolean };
```

The backup used a **callback-style** `postMessage(name, payload, cb)` /
`addListener(name, cb)` transport (its own `MessageContext`), whereas the
current generation uses `frame-link-react`'s `useSubscribe` / `usePostMessage`.

---

## 3. DOM data-attributes inventoried

Confirmed present across `Stardust-CMS-App/demoApp/src` (grep: `data-cms`,
`data-cms-content`, `data-cms-container-target`, `data-style-group`).

| Attribute                    | Meaning                                                    | Produced / consumed by                                                                 | Maps to protocol field |
| ---------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------- |
| `data-cms`                   | Marks a CMS **target** element; value is the target id     | `getCmsTargets()` selects `[data-cms]`; id read at `CmsTarget.utils.ts:13` (`getAttribute("data-cms")`) | `ContentTarget.targetId` |
| `data-cms-content`           | Marks a content item inside a target                       | `getTargetContents()` selects `[data-cms-content]` (`CmsTarget.utils.ts:28-31`); nested check `:41` | drives `ChildContent[]` extraction |
| `data-cms-container-target`  | Presence marks the target as a **container**               | `getIsTargetContainer()` (`CmsTarget.utils.ts:33-34`, `querySelector` !== null)         | `ContentTarget.isContainer` |
| `data-style-group`           | Style-group id for a content item (style-rule scoping)     | read at `CmsTarget.utils.ts:64` (`getAttribute("data-style-group")`)                    | `ChildContent.styleGroup` |

Utility functions of record:

- `getElementsWithPositionData()` (`CmsTarget.utils.ts:3-19`) → produces the
  `ElementPosition[]` (basis for `ContentTarget[]`).
- `getChildContent()` (`CmsTarget.utils.ts:36-67`) → produces the child array
  (basis for `ChildContent[]`).
- `getWindowPositions()` (`CmsWindow.utils.ts`) → produces the scroll payload.

---

## 4. Geometry: raw `DOMRect` usage

`getBoundingClientRect()` is called in two spots in `CmsTarget.utils.ts`:

- **Target**: `CmsTarget.utils.ts:8` stores the raw `DOMRect` directly as
  `positions: pos` on `ElementPosition` — i.e. the *whole* `DOMRect` is put on
  the wire (`:14`). This is the serialization hazard: `DOMRect` is a class
  instance and does not structured-clone to a plain object with own enumerable
  fields reliably; it must be replaced by a plain object.
- **Child**: `CmsTarget.utils.ts:42-52` already copies out explicit fields into
  a plain object literal:

  ```ts
  const position = {
    top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left,
    width: rect.width, height: rect.height, x: rect.x, y: rect.y,
  };
  ```

**Fields copied (authoritative for `Geometry` / `SerializableRect`):**
`top, right, bottom, left, width, height, x, y` — all `number`.

Behavioral note (must be preserved by the iframe adapter, not the protocol
type): for a container child, the prototype adjusts `position.top -= 10` and
`position.height -= 10` (`CmsTarget.utils.ts:54-57`). This is a rendering nudge,
not a protocol concern; recorded here so SIFR-I-0002 does not lose it.

---

## 5. Scroll payload shape

Authoritative shape for `ScrollState`, from both `TFramePositions`
(`app/src/hooks/useFrame.tsx:30-36`) and the emitter `getWindowPositions()`:

```ts
ScrollState = { h: number; y: number; isTop: boolean; isBottom: boolean }
```

- `h` = `window.scrollX` (horizontal scroll; note the field is named `h` but
  carries the X offset in `getWindowPositions`).
- `y` = `window.scrollY`.
- `isTop` = `scrollY === 0`.
- `isBottom` = `scrollY + innerHeight > body.scrollHeight`.

---

## 6. Old-string → proposed namespaced-key mapping

| Old string(s)                                                   | Proposed key                   | Direction     | Request payload         | Response payload          |
| --------------------------------------------------------------- | ------------------------------ | ------------- | ----------------------- | ------------------------- |
| `cms_request_target_positions` / `get_cms_positions`            | `cms/requestTargetPositions`   | host → iframe | `void`                  | `ContentTarget[]`         |
| `cms_positions` (backup push of same data)                      | `cms/sendElementPositions`     | iframe → host | `ContentTarget[]`       | `void`                    |
| `cms_send_elements`                                             | `cms/sendElements`             | host → iframe | `ContentPayload`        | `void`                    |
| `cms_adapter_send_element_positions`                            | `cms/sendElementPositions`     | iframe → host | `ContentTarget[]`       | `void`                    |
| `cms_adapter_send_scroll_positions` / `cms_scroll_positions`    | `cms/sendScrollPositions`      | iframe → host | `ScrollState`           | `void`                    |
| *(not in prototype — reserved)*                                 | `cms/updateStyles`             | host → iframe | `StyleUpdatePayload`    | `void`                    |
| *(not in prototype — reserved, SIFR-I-0006)*                    | `cms/presence`                 | reserved      | reserved                | reserved                  |

Reserved channels (declared, not implemented in this initiative):

- **`cms/updateStyles`** — host-sent style-rule updates. Consumed by
  SIFR-I-0005 (style rules). Payload finalized later; declared now so the
  registry is stable.
- **`cms/presence`** — multi-user presence. Owned by SIFR-I-0006. Declared as a
  reserved key with `never`/reserved payloads; **no** runtime handler defined in
  the protocol module.

---

## 7. Discrepancies between the two generations (reconciled)

1. **Request-target message name**: current `cms_request_target_positions`
   vs. backup `get_cms_positions`. → **Adopt** `cms/requestTargetPositions`.
   Current name is more descriptive and is the generation using frame-link.

2. **Iframe→host positions push**: current
   `cms_adapter_send_element_positions` vs. backup `cms_positions`. → **Adopt**
   one key `cms/sendElementPositions`. Same data (`ContentTarget[]`), one
   direction; the two strings are the same channel renamed.

3. **Intra-generation naming split (current)**: the current iframe emits
   `cms_adapter_send_scroll_positions` but the current host `useFrame.tsx`
   listens for `cms_scroll_positions`. This is a **latent bug** in the prototype
   (emitter and listener strings do not match). → Reconcile to the single key
   `cms/sendScrollPositions`; the new adapter fixes the mismatch by construction.

4. **Geometry representation**: backup carried raw `DOMRect` on
   `positions`; current copies plain fields for children but *still* passes the
   raw `DOMRect` for the target (`CmsTarget.utils.ts:8,14`). → **Adopt** the
   plain-field `Geometry` everywhere (children already prove the shape). The
   target must be converted to `Geometry` too.

5. **Child field names**: backup `TCMSTargetItem` uses `positions`, `index:
   string`, `group`, plus `styles: any`; current `getChildContent` uses
   `position`, `index: number`, `group`, `contentId`, `isContainer`. → **Adopt**
   the current generation's fields, normalized: `geometry` (was
   `position`/`positions`), `index: number`, `styleGroup` (was `group`),
   `contentId`, `isContainer`. Drop backup's untyped `styles: any` (style data
   moves to the reserved `cms/updateStyles` channel).

---

## 8. Open questions for SIFR-T-0002

- **OQ-1 — `cms/sendElements` (host→iframe content) payload.** The prototype's
  `Cms.Content.Contents` type was not fully resolved in this pass (it is consumed
  by `updateElements`). SIFR-T-0002 must define a minimal serializable
  `ContentPayload` for content injection; the exact per-content shape can start
  minimal (`{ targetId; contentId; index; html?/data? }`) and firm up in
  SIFR-I-0002. Recorded as an intentional under-spec, not an omission.

- **OQ-2 — `cms/updateStyles` payload.** Deferred to SIFR-I-0005; declare the
  key reserved with a placeholder serializable payload type rather than a final
  schema.

- **OQ-3 — `cms/presence` shape.** Deferred to SIFR-I-0006; declare reserved.

- **OQ-4 — `cms_mouse_positions`.** Present in both host `useFrame`
  generations (`{ left, top }`) but never emitted by the current iframe
  adapter. Treat as **out of scope** for the core registry (host-cursor concerns
  belong to presence, SIFR-I-0006). Logged here so it is a deliberate exclusion.

- **OQ-5 — `h` field semantics.** `ScrollState.h` carries `window.scrollX`
  despite the `h` (height?) name. Keep the field name `h` for wire-compat with
  the prototype shape but document that it is the horizontal scroll offset.
