/**
 * `mapGeometry`-as-colab-`Transform` seam — the ONE place the adapter's
 * SIFR-I-0003 coordinate authority ({@link mapGeometry}) is adapted to colab's
 * render-only point transform contract.
 *
 * colab keeps its cursor/lock layer geometry-free: its {@link Transform} is a
 * pure `(Point) => Point` seam over NORMALIZED points, and colab applies it and
 * nothing else in screen space (see `<ColabProvider transform>` /
 * `<RemoteCursors>` docs in `colab-ui/react`). The adapter, by contrast, owns
 * ALL geometry: {@link mapGeometry} projects an iframe-reported rectangle
 * through the host's `{ scale, scrollOffset }` into host-viewport pixels.
 *
 * This module is the seam between the two. It NEVER pushes `mapGeometry` (or
 * scale/scroll) into colab; instead it wraps the adapter's transform in a
 * closure of colab's `Transform` shape, so a consumer that renders colab's own
 * `<RemoteCursors>` under a `<ColabStage>` can hand the adapter's exact
 * projection to `<ColabProvider transform={...}>`. Geometry stays in the
 * adapter; colab stays geometry-free.
 *
 * A colab `Point` is a canonical normalized `{ x, y }`. The adapter treats that
 * point as a zero-size {@link Geometry} at `(x, y)`, runs it through
 * {@link mapGeometry}, and returns the projected `{ left, top }` as the mapped
 * `Point`. This yields EXACTLY the `left`/`top` the pre-migration overlay
 * computed for a pointer — the projection math is unchanged and lives only in
 * `mapGeometry`.
 */

import {
  mapGeometry,
  type GeometryTransform,
} from "../host/mapGeometry.js";
import type { Geometry } from "../protocol/registry.js";
import type { Point, Transform } from "colab-ui/react";

/** Build a zero-size {@link Geometry} at `(x, y)` for a point projection. */
function pointGeometry(x: number, y: number): Geometry {
  return { top: y, left: x, right: x, bottom: y, width: 0, height: 0, x, y };
}

/**
 * Adapt the adapter's {@link mapGeometry} into a colab {@link Transform}.
 *
 * The returned closure takes a colab {@link Point}, projects it through
 * {@link mapGeometry} with the supplied `{ scale, scrollOffset }`, and returns
 * the projected pixel offset as a `Point` (`x = left`, `y = top`). Handing this
 * to `<ColabProvider transform={...}>` makes colab's geometry-free cursor layer
 * land pixel-identically to the adapter's target-box overlays under scale and
 * scroll — the same coordinate authority, expressed through colab's seam.
 *
 * @param transform the current host `scale` + iframe `scrollOffset`.
 * @returns a colab `Transform` projecting normalized points to host pixels.
 */
export function mapGeometryTransform(transform: GeometryTransform): Transform {
  return (point: Point): Point => {
    const mapped = mapGeometry(pointGeometry(point.x, point.y), transform);
    return { x: mapped.left, y: mapped.top };
  };
}
