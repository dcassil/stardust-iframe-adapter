/**
 * requestAnimationFrame-based coalescing throttle.
 *
 * The prototype streamed position updates on every raw `scroll`/`resize` event,
 * saturating the postMessage channel. This wraps a callback so that a burst of
 * invocations within one animation frame collapses into a single call on the
 * next frame — the standard fix for scroll/resize-driven work.
 */

/** A throttled function plus a `cancel` to drop any pending frame. */
export interface RafThrottled {
  (): void;
  /** Cancel a pending frame (call on teardown to avoid a post after unmount). */
  cancel: () => void;
}

/**
 * Wrap `callback` so repeated calls within a single animation frame run it at
 * most once, on the next frame. Uses injectable `raf`/`caf` for testability;
 * defaults to `requestAnimationFrame`/`cancelAnimationFrame`.
 */
export function rafThrottle(
  callback: () => void,
  raf: (cb: FrameRequestCallback) => number = requestAnimationFrame,
  caf: (handle: number) => void = cancelAnimationFrame
): RafThrottled {
  let handle: number | null = null;

  const throttled = (): void => {
    if (handle !== null) return;
    handle = raf(() => {
      handle = null;
      callback();
    });
  };

  throttled.cancel = (): void => {
    if (handle !== null) {
      caf(handle);
      handle = null;
    }
  };

  return throttled;
}
