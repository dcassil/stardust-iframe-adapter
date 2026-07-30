/**
 * Public `.` / `./iframe` entry — the iframe-side adapter surface.
 *
 * This is the entry a public/embedded site bundle imports. It re-exports the
 * framework-agnostic protocol so iframe consumers get the types, and will export
 * the iframe-side React provider/components delivered by SIFR-I-0002.
 *
 * IMPORTANT (bundle-separation invariant): this module must NEVER import from
 * `./host` — a public site bundle must not pull in host overlay code. Only the
 * protocol module and (later) iframe-side code may be re-exported here.
 */
export * from "./protocol/index.js";

/* -------------------------------------------------------------------------- */
/* Iframe-side adapter surface (SIFR-I-0002)                                  */
/* -------------------------------------------------------------------------- */

// Pure discovery (SIFR-T-0006).
export {
  CONTAINER_INSET,
  discoverTargets,
  toGeometry,
  type DiscoverTargetsOptions,
} from "./iframe/discovery.js";

// Provider + content context (SIFR-T-0013).
export {
  StardustAdapterProvider,
  type StardustAdapterProviderProps,
} from "./iframe/StardustAdapterProvider.js";
export {
  StardustContentContext,
  mergeContent,
  type ContentByTarget,
  type StardustContentContextValue,
} from "./iframe/content-context.js";
export {
  CHANNELS,
  useStardustHandler,
  useStardustSend,
} from "./iframe/frameLink.js";

// Observer + throttled publishing bundle (SIFR-T-0015).
export {
  usePositionPublishing,
  type PositionPublishingOptions,
} from "./iframe/usePositionPublishing.js";
export { readScrollState } from "./iframe/scroll-state.js";
export { rafThrottle, type RafThrottled } from "./iframe/raf-throttle.js";

// Components + attribute contract (SIFR-T-0016).
export {
  EditableTarget,
  type EditableTargetProps,
} from "./iframe/EditableTarget.js";
export {
  ContentRenderer,
  type ContentRendererProps,
} from "./iframe/ContentRenderer.js";
export { StyleElement, type StyleElementProps } from "./iframe/StyleElement.js";
export {
  ATTR_TARGET,
  ATTR_CONTENT,
  ATTR_CONTAINER_TARGET,
  ATTR_CONTAINER,
  ATTR_STYLE_GROUP,
  ATTR_STYLE_ELEMENT,
  ATTR_STYLE_NAME,
  ATTR_STYLE_ID,
  ATTR_STYLE_RULES,
} from "./iframe/attributes.js";
