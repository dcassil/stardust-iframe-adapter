/**
 * `mapGeometry` — the single pure coordinate transform for the host overlay.
 *
 * It projects a `Geometry` rectangle as reported by the iframe (in the iframe's
 * own document coordinate space) into host-viewport coordinates, accounting for
 * two effects:
 *
 *  1. **Scale** — the host may render the iframe scaled down (e.g. a zoomed-out
 *     builder canvas). Every dimension and offset is multiplied by `scale`.
 *  2. **Scroll projection** — the iframe scrolls independently of the host, so a
 *     target's on-screen position shifts by the iframe's scroll offset before it
 *     is scaled.
 *
 * This replaces the fragile inline math scattered across the prototype
 * (`useFrame.tsx`'s `containerSize.width / documentSize.width` scale and
 * `CMSTargetAreas.tsx`'s absolute `top/left/width/height` placement). By keeping
 * this the *only* place coordinates are computed, overlays and the demo stay
 * correct and testable (REQ-003, NFR-001).
 *
 * This module imports only the `Geometry` type from the protocol and touches no
 * React and no DOM globals — it is total, side-effect free, and never mutates
 * its arguments.
 *
 * NOTE (deliberate omission): the prototype's app-specific `-40` header offset
 * and container insets are intentionally NOT carried here. If a caller needs a
 * fixed offset, it belongs in an explicit, documented option on the host hook
 * (SIFR-T-0018) folded into `scrollOffset`, not baked into this transform.
 */

import type { Geometry } from "../protocol/index.js";

/**
 * The scale + scroll transform applied to a `Geometry`.
 *
 * - `scale` — multiplier applied to every offset and dimension. `1` is identity.
 * - `scrollOffset` — the iframe's current scroll position (`{ x, y }`), in the
 *   iframe's own unscaled coordinate space, subtracted before scaling.
 */
export interface GeometryTransform {
  scale: number;
  scrollOffset: { x: number; y: number };
}

/**
 * The result of `mapGeometry`: an absolutely-positionable box in host-viewport
 * pixels. Exactly the four fields an overlay needs for
 * `position: absolute; top; left; width; height`.
 */
export interface MappedGeometry {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Project an iframe-reported `Geometry` into host-viewport coordinates.
 *
 * The transform is, exactly:
 * ```
 * left   = (geometry.left - scrollOffset.x) * scale
 * top    = (geometry.top  - scrollOffset.y) * scale
 * width  =  geometry.width  * scale
 * height =  geometry.height * scale
 * ```
 *
 * @param geometry  the rectangle as reported by the iframe.
 * @param transform the current `scale` and iframe `scrollOffset`.
 * @returns a `MappedGeometry` suitable for absolute positioning.
 */
export function mapGeometry(
  geometry: Geometry,
  transform: GeometryTransform,
): MappedGeometry {
  const { scale, scrollOffset } = transform;

  return {
    left: (geometry.left - scrollOffset.x) * scale,
    top: (geometry.top - scrollOffset.y) * scale,
    width: geometry.width * scale,
    height: geometry.height * scale,
  };
}
