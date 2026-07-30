/**
 * Opt-in style-engine surface (SIFR-I-0005).
 *
 * This barrel gathers the framework-agnostic allowlist/validators
 * (SIFR-T-0026), the pure `generateCss` generator (SIFR-T-0027), and the
 * iframe-side managed-`<style>` injector + discovery helpers (SIFR-T-0028).
 *
 * It is OPT-IN: nothing here is auto-loaded by the adapter provider. Consumers
 * must explicitly import and wire it (see the iframe entry re-export).
 */

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
} from "./allowlist.js";

export {
  generateCss,
  type StyleValue,
  type GenerateCssOptions,
} from "./generateCss.js";

export {
  ADAPTER_STYLE_ATTR,
  injectStyles,
  clearStyles,
  discoverStyleElements,
  type DiscoveredStyleGroup,
} from "./injector.js";

export {
  useStyleFeature,
  type UseStyleFeatureOptions,
} from "./useStyleFeature.js";
export { StyleFeature, type StyleFeatureProps } from "./StyleFeature.js";
