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
export * from "./protocol/registry.js";

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

// Opt-in pointer streaming (SIFR-I-0007). Tree-shakeable: import only when
// rendering host-side presence cursors over the iframe.
export {
  usePointerPublishing,
  type PointerPublishingOptions,
} from "./iframe/usePointerPublishing.js";
export {
  readPointerState,
  POINTER_LEFT,
  type PointerLike,
} from "./iframe/pointer-state.js";

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
/* -------------------------------------------------------------------------- */
/* Opt-in style engine (SIFR-I-0005)                                          */
/* -------------------------------------------------------------------------- */

// Framework-agnostic allowlist + validators (SIFR-T-0026). Opt-in: not wired
// into the provider — consumers import and enable the style feature explicitly.
export {
  DEFAULT_ALLOWLIST,
  VALIDATORS,
  isAllowed,
  validateValue,
  validateColor,
  validatePx,
  validateFontWeight,
  validateTextAlign,
  validateDisplay,
  type CssProperty,
  type StyleElementType,
  type StyleAllowlist,
  type ValidatedValue,
  type ValueValidator,
  generateCss,
  type StyleValue,
  type GenerateCssOptions,
  ADAPTER_STYLE_ATTR,
  injectStyles,
  clearStyles,
  discoverStyleElements,
  type DiscoveredStyleGroup,
  useStyleFeature,
  type UseStyleFeatureOptions,
  StyleFeature,
  type StyleFeatureProps,
} from "./style/barrel.js";

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
