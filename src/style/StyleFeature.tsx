/**
 * Opt-in style feature mount (SIFR-T-0029).
 *
 * `<StyleFeature enabled />` is the recommended way to enable the iframe-side
 * style feature. It guarantees TRUE zero footprint when disabled: when
 * `enabled` is false it renders `null` and mounts nothing, so there is NO
 * `cms/updateStyles` subscription and no adapter `<style>` node (REQ-005/006,
 * NFR-004). Only when `enabled` is true does it mount the inner component that
 * calls {@link useStyleFeature} (and thus registers the frame-link handler).
 *
 * This keeps the subscription itself gated — not merely made inert — which the
 * rules of hooks would otherwise prevent inside a single hook.
 */

import type { ReactNode } from "react";
import {
  useStyleFeature,
  type UseStyleFeatureOptions,
} from "./useStyleFeature.js";

/** Props for {@link StyleFeature}. */
export interface StyleFeatureProps
  extends Omit<UseStyleFeatureOptions, "enabled"> {
  /** Opt-in flag. When false nothing is mounted — zero footprint. */
  enabled: boolean;
}

/** Inner mount that actually subscribes; only rendered when enabled. */
function StyleFeatureActive(
  props: Omit<UseStyleFeatureOptions, "enabled">,
): ReactNode {
  useStyleFeature({ enabled: true, ...props });
  return null;
}

export function StyleFeature({
  enabled,
  ...rest
}: StyleFeatureProps): ReactNode {
  if (!enabled) return null;
  return <StyleFeatureActive {...rest} />;
}
