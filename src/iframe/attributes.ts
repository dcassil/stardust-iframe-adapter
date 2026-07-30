/**
 * The single source of truth for the `data-*` attribute contract that ties the
 * iframe-side components (SIFR-T-0016) to the discovery walker (SIFR-T-0006) and
 * the style engine (SIFR-I-0005).
 *
 * Discovery reads these attributes; the components emit them. Centralizing the
 * names here prevents silent drift — a rename in one place is a rename
 * everywhere — which is the failure mode the task calls out.
 */

/** `data-cms` → `targetId`. Marks a discoverable CMS target. */
export const ATTR_TARGET = "data-cms";
/** `data-cms-content` → a content item nested inside a target. */
export const ATTR_CONTENT = "data-cms-content";
/** `data-cms-container-target` → a target is a container of nested targets. */
export const ATTR_CONTAINER_TARGET = "data-cms-container-target";
/** `data-cms-container` → a content item that is itself a container. */
export const ATTR_CONTAINER = "data-cms-container";
/** `data-style-group` → `styleGroup` (style-rule scope). */
export const ATTR_STYLE_GROUP = "data-style-group";

/* --- Style-element wrapper attributes (consumed by SIFR-I-0005) --------- */
/** `data-style-element` → marks a style-targetable wrapper element. */
export const ATTR_STYLE_ELEMENT = "data-style-element";
/** `data-style-name` → the content/style name of the wrapped element. */
export const ATTR_STYLE_NAME = "data-style-name";
/** `data-style-id` → stable id of the wrapped content item. */
export const ATTR_STYLE_ID = "data-style-id";
/** `data-style-rules` → comma-joined list of applicable style rules. */
export const ATTR_STYLE_RULES = "data-style-rules";
