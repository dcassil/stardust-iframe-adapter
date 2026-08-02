/**
 * Pure pointer-state reader.
 *
 * Normalizes a raw pointer event's viewport coordinates into the serializable
 * {@link PointerState} the iframe publishes over `cms/pointer` (SIFR-I-0007).
 *
 * COORDINATE CONTRACT: `x`/`y` are normalized to `0..1` of the iframe viewport
 * (clientX / innerWidth, clientY / innerHeight) — transform-neutral, so the host
 * can map them into its own scaled canvas/stage box. See {@link PointerState}.
 */

import type { PointerState } from "../protocol/registry.js";

/** The subset of a `PointerEvent` this reader needs (keeps it test-injectable). */
export interface PointerLike {
  clientX: number;
  clientY: number;
}

/**
 * Normalize a pointer event into a serializable {@link PointerState} marked
 * `inside: true`. Divides viewport-relative client coords by the viewport size;
 * when the viewport has zero extent (jsdom, detached windows) the axis is `0`.
 */
export function readPointerState(
  event: PointerLike,
  win: Window = window,
): PointerState {
  const width = win.innerWidth;
  const height = win.innerHeight;
  return {
    x: width > 0 ? event.clientX / width : 0,
    y: height > 0 ? event.clientY / height : 0,
    inside: true,
  };
}

/** The canonical "pointer left the iframe" signal. */
export const POINTER_LEFT: PointerState = { x: 0, y: 0, inside: false };
