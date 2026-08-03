/**
 * `@stardust-cms/iframe-adapter` — framework-agnostic protocol module.
 *
 * This module contains ONLY types plus one runtime marker object. It has zero
 * `react` and zero DOM-runtime dependencies so it can be imported by non-React
 * and server-side consumers (e.g. the SVER project).
 *
 * Every type here is structured-clone-safe by construction (NFR-001): plain
 * numbers, strings, booleans, arrays and object literals — no DOM nodes, no
 * functions, no class instances. This guarantees each payload survives the
 * `postMessage` structured-clone transport that frame-link uses.
 *
 * Grounded in SIFR-T-0001 (`docs/protocol-inventory.md`), which traced every
 * message and field out of both Stardust prototype generations.
 */

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Serializable replacement for the browser `DOMRect` that the prototype copied
 * out of `getBoundingClientRect()` in `CmsTarget.utils.ts`.
 *
 * Contains exactly the eight numeric fields the prototype read. No exported
 * type in this module references `DOMRect` — a `DOMRect` is a class instance and
 * does not reliably structured-clone into a plain object.
 */
export interface Geometry {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
  x: number;
  y: number;
}

/** Alias matching the naming used in the initiative design docs. */
export type SerializableRect = Geometry;

/* -------------------------------------------------------------------------- */
/* Scroll state                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Scroll payload sent iframe → host. Mirrors the prototype's `TFramePositions`
 * (`app/src/hooks/useFrame.tsx`) and the emitter `getWindowPositions()`.
 *
 * Note: `h` carries the horizontal scroll offset (`window.scrollX`) despite the
 * short name; the name is kept for wire-compatibility with the prototype shape.
 */
export interface ScrollState {
  /** Horizontal scroll offset (`window.scrollX`). */
  h: number;
  /** Vertical scroll offset (`window.scrollY`). */
  y: number;
  /** `true` when scrolled to the top. */
  isTop: boolean;
  /** `true` when scrolled to the bottom. */
  isBottom: boolean;
}

/* -------------------------------------------------------------------------- */
/* Pointer state                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Pointer position streamed iframe → host over `cms/pointer` (SIFR-I-0007).
 *
 * The parent document cannot observe `pointermove` events that occur over an
 * embedded iframe — they are delivered to the iframe's own document. To let a
 * host place a collaboration cursor over the iframe, the iframe captures its own
 * pointer and streams it up as this payload.
 *
 * COORDINATE CONTRACT (both sides MUST agree):
 * - `x` / `y` are NORMALIZED to the range `0..1` of the iframe's design/viewport
 *   space (x = clientX / viewport width, y = clientY / viewport height). They are
 *   transform-neutral: they do NOT bake in the host's render scale, scroll, or
 *   stage box. The host/dashboard forwards these SAME normalized values; the
 *   final consumer (e.g. the demo) multiplies them by its own stage/canvas box to
 *   place the cursor. Values may momentarily fall slightly outside `0..1` during
 *   fast moves near an edge; consumers should clamp if they require strict bounds.
 * - `inside` is `true` while the pointer is over the iframe. A leave (pointer
 *   left the iframe, or the iframe blurred) is signalled with
 *   `{ inside: false, x: 0, y: 0 }`; consumers treat `inside: false` as "no
 *   pointer" and should ignore the coordinate fields in that case.
 *
 * Structured-clone-safe by construction (plain numbers + boolean), consistent
 * with the {@link Geometry}/{@link ScrollState} serializable-geometry convention.
 */
export interface PointerState {
  /** Normalized horizontal position in `0..1` of the iframe viewport width. */
  x: number;
  /** Normalized vertical position in `0..1` of the iframe viewport height. */
  y: number;
  /** `true` while the pointer is over the iframe; `false` signals pointer-left. */
  inside: boolean;
}

/* -------------------------------------------------------------------------- */
/* Content targets                                                            */
/* -------------------------------------------------------------------------- */

/**
 * One CMS content item nested inside a target. Grounded in `getChildContent()`
 * (`CmsTarget.utils.ts`).
 *
 * - `contentId`  — the element `id` of the content item.
 * - `index`      — position of the item within its target (normalized to a
 *                  number; the backup generation used a string).
 * - `isContainer`— whether this item itself contains further content.
 * - `styleGroup` — value of the `data-style-group` attribute (style-rule scope).
 * - `geometry`   — serializable rect of the item.
 */
export interface ChildContent {
  contentId: string;
  index: number;
  isContainer: boolean;
  styleGroup: string;
  geometry: Geometry;
}

/**
 * A CMS target discovered in the iframe DOM. Grounded in
 * `getElementsWithPositionData()` (`CmsTarget.utils.ts`).
 *
 * - `targetId`   — value of the `data-cms` attribute.
 * - `isContainer`— presence of `data-cms-container-target` inside the target.
 * - `geometry`   — serializable rect of the target (replaces the raw `DOMRect`
 *                  the prototype put on the wire).
 * - `children`   — the content items inside the target.
 */
export interface ContentTarget {
  targetId: string;
  isContainer: boolean;
  geometry: Geometry;
  children: ChildContent[];
}

/* -------------------------------------------------------------------------- */
/* Content injection (host -> iframe)                                         */
/* -------------------------------------------------------------------------- */

/**
 * The kind of a CMS content item. Grounded in the prototype `CmsContent.tsx`
 * switch (`text` | `number` | `image` | `container`), promoted here to a
 * protocol-level, app-agnostic discriminant so the iframe content renderer
 * (SIFR-T-0016) dispatches on the protocol type rather than any Stardust-app
 * model. Reserved/unknown kinds render as inert fallbacks.
 */
export type ContentKind = "text" | "number" | "image" | "container";

/**
 * A single, serializable CMS content item pushed host → iframe. Firmed up here
 * (SIFR-I-0002) from the previously-minimal shape (OQ-1 in the inventory).
 *
 * `type` is the render discriminant; `value` is the primitive payload the
 * renderer displays (text/number string, or image `src` URL). `styleGroup`
 * scopes style rules (mirrors `data-style-group`). `container` items carry no
 * `value` — they render nested targets instead. `data` remains an open,
 * structured-clone-safe bag for forward-compatible extension.
 */
export interface CmsContent {
  /** Stable id of the content item (becomes the element `id`). */
  id: string;
  /** Render discriminant. */
  type: ContentKind;
  /** Primitive display value (text/number text, or image `src`). */
  value?: string;
  /** Style-rule scope (`data-style-group`). */
  styleGroup?: string;
  /** For `container` items: lay children out as a column rather than a row. */
  column?: boolean;
  /** Open, serializable extension bag. Must stay structured-clone-safe. */
  data?: SerializableValue;
}

/**
 * Serializable payload for host → iframe content injection (`cms/sendElements`).
 * Places one {@link CmsContent} item at a `(targetId, index)` slot.
 */
export interface ContentPayload {
  targetId: string;
  contentId: string;
  index: number;
  /** The content item to render at this slot. */
  content: CmsContent;
  /** Optional pre-rendered HTML string (bypasses type dispatch when present). */
  html?: string;
  /** Optional structured, serializable data describing the content. */
  data?: SerializableValue;
}

/* -------------------------------------------------------------------------- */
/* Reserved channel payloads                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Payload for `cms/updateStyles` (host → iframe). Owned by SIFR-I-0005.
 *
 * A single style value: set one CSS `property` on a `styleGroup`, scoped by the
 * group's element `type` (which selects the allowlist bucket on the iframe
 * side). The iframe adapter accumulates these and re-runs `generateCss` →
 * `injectStyles` per message. Kept flat + serializable (NFR-001).
 *
 * `declarations` is retained as an optional batch form (property → value) for
 * forward-compatibility; when present it is applied under the same `styleGroup`
 * and `type`. At least one of `property`/`declarations` should be provided.
 */
export interface StyleUpdatePayload {
  /** The `data-style-group` this update targets. */
  styleGroup: string;
  /** Element type selecting the allowlist bucket (e.g. `text`, `container`). */
  type: string;
  /** The single CSS property to set (e.g. `color`). */
  property?: string;
  /** The candidate value for `property`; validated iframe-side before emission. */
  value?: string;
  /** Optional batch form: property → value, applied under `styleGroup`/`type`. */
  declarations?: Record<string, string>;
}

/**
 * Reserved payload for the `cms/presence` channel. Owned by SIFR-I-0006.
 * Declared reserved with no defined runtime behavior in this module.
 */
export type PresencePayload = ReservedChannelPayload;

/** Marker for reserved channels with no defined payload in this initiative. */
export interface ReservedChannelPayload {
  readonly __reserved: true;
}

/* -------------------------------------------------------------------------- */
/* Serializable-value helper                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A value that is guaranteed to survive the structured-clone algorithm. Used to
 * keep open-ended payload fields honest at the type level.
 */
export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | SerializableValue[]
  | { [key: string]: SerializableValue };

/* -------------------------------------------------------------------------- */
/* Message definitions & registry                                             */
/* -------------------------------------------------------------------------- */

/**
 * A single message: its `request` payload and its `response` payload.
 *
 * This mirrors frame-link's `MessageDefinition<TPayload, TResponse>` — its
 * `payload` field corresponds to our `request` — so a `StardustMessageRegistry`
 * can drive frame-link's generic message API. We name the field `request` to
 * read clearly at call sites (host *requests*, iframe *responds*).
 */
export interface MessageDefinition<Request = void, Response = void> {
  request: Request;
  response: Response;
}

/**
 * The complete host ↔ iframe message registry. Every key is namespaced under
 * `cms/`. Directionality (who sends / who receives) is documented per key and
 * enumerated in `docs/responsibilities.md` (SIFR-T-0004); it is not encoded in
 * the payload types.
 */
export interface StardustMessageRegistry {
  /** host → iframe. Host asks the iframe for its current target positions. */
  "cms/requestTargetPositions": MessageDefinition<void, ContentTarget[]>;

  /** host → iframe. Host pushes content to render into targets. */
  "cms/sendElements": MessageDefinition<ContentPayload>;

  /** iframe → host. Iframe publishes current target/content geometry. */
  "cms/sendElementPositions": MessageDefinition<ContentTarget[]>;

  /** iframe → host. Iframe publishes current scroll state. */
  "cms/sendScrollPositions": MessageDefinition<ScrollState>;

  /**
   * iframe → host. Iframe streams the local user's pointer position over the
   * iframe as normalized `0..1` coordinates (SIFR-I-0007). See {@link
   * PointerState} for the full coordinate contract; a leave is signalled with
   * `inside: false`. This unblocks host-side full-page collaboration cursors,
   * which otherwise cannot see pointer events that land over the iframe.
   */
  "cms/pointer": MessageDefinition<PointerState>;

  /** host → iframe. Reserved for SIFR-I-0005 (style rules). */
  "cms/updateStyles": MessageDefinition<StyleUpdatePayload>;

  /**
   * RESERVED — owned by SIFR-I-0006 (presence). Declared for registry
   * stability; this module defines no runtime handler behavior for it.
   */
  "cms/presence": MessageDefinition<PresencePayload>;
}

/** Every valid message key. */
export type StardustMessageKey = keyof StardustMessageRegistry;

/** Extract the request payload type for a message key. */
export type RequestOf<K extends StardustMessageKey> =
  StardustMessageRegistry[K]["request"];

/** Extract the response payload type for a message key. */
export type ResponseOf<K extends StardustMessageKey> =
  StardustMessageRegistry[K]["response"];

/**
 * The Stardust protocol expressed in frame-link's registry shape. Each message
 * key carries the published protocol request as frame-link's `payload`, with
 * the response preserved unchanged.
 */
export type StardustFrameLinkRegistry = {
  [K in StardustMessageKey]: {
    payload: RequestOf<K>;
    response: ResponseOf<K>;
  };
};

/**
 * Runtime marker listing every protocol message key and whether it is reserved.
 * This is the module's ONLY runtime value. It exists so consumers (and tests)
 * can enumerate keys without a DOM/React dependency, and so frame-link handler
 * wiring can iterate the known channels. It carries no behavior.
 */
export const MESSAGE_KEYS = {
  "cms/requestTargetPositions": { reserved: false },
  "cms/sendElements": { reserved: false },
  "cms/sendElementPositions": { reserved: false },
  "cms/sendScrollPositions": { reserved: false },
  "cms/pointer": { reserved: false },
  "cms/updateStyles": { reserved: true },
  "cms/presence": { reserved: true },
} as const satisfies Record<StardustMessageKey, { reserved: boolean }>;
