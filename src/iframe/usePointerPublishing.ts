/**
 * Throttled pointer-position publishing for the iframe adapter (SIFR-I-0007).
 *
 * The parent document cannot observe `pointermove` over an embedded iframe — the
 * events go to the iframe's own document. This hook captures `pointermove` on the
 * iframe document, RAF-throttles it (reusing {@link rafThrottle}, the same util
 * that coalesces scroll/position streaming), normalizes to `0..1` of the iframe
 * viewport, and publishes it over `cms/pointer` so the host can place a
 * collaboration cursor over the iframe. A `pointerleave`/blur sends a leave
 * signal ({@link POINTER_LEFT}).
 *
 * Opt-in and tree-shakeable: it is NOT wired into {@link StardustAdapterProvider}
 * by default (see its `publishPointer` prop). Consumers that do not render
 * presence cursors never import this module and pay nothing.
 *
 * Listener discipline mirrors {@link usePositionPublishing}: every listener is a
 * single stable reference added and removed with the identical reference, and the
 * pending RAF frame is cancelled on unmount so no post fires after teardown.
 */

import { useEffect, useRef } from "react";
import type { PointerState } from "../protocol/registry.js";
import { readPointerState, POINTER_LEFT } from "./pointer-state.js";
import { rafThrottle } from "./raf-throttle.js";

/** Options for {@link usePointerPublishing}. */
export interface PointerPublishingOptions {
  /**
   * Whether pointer capture is active. When `false` the hook installs no
   * listeners and never publishes — lets a provider call the hook
   * unconditionally (Rules of Hooks) while keeping it opt-in. Defaults to `true`
   * so direct consumers of the hook get capture without extra ceremony.
   */
  enabled?: boolean;
  /** Publish the current pointer state (`cms/pointer`). */
  publishPointer: (pointer: PointerState) => void;
  /** Document whose pointer events are captured. Defaults to `document`. */
  root?: Document;
  /** Window whose viewport size normalizes coords / drives blur. Defaults to `window`. */
  win?: Window;
  /** Injectable rAF/caf for deterministic tests. */
  raf?: (cb: FrameRequestCallback) => number;
  caf?: (handle: number) => void;
}

export function usePointerPublishing(options: PointerPublishingOptions): void {
  // Keep the latest callbacks/root/win in a ref so the setup effect runs once
  // (stable listener identities) while always calling the current publisher.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const enabled = options.enabled ?? true;

  useEffect((): (() => void) | undefined => {
    if (!enabled) return undefined;
    const current = optionsRef.current;
    const win = current.win ?? window;
    const root = current.root ?? win.document;
    const rafFn = current.raf ?? win.requestAnimationFrame.bind(win);
    const cafFn = current.caf ?? win.cancelAnimationFrame.bind(win);

    // The latest pointer event, published at most once per animation frame.
    let latest: PointerState | null = null;
    const flush = (): void => {
      if (latest !== null) {
        optionsRef.current.publishPointer(latest);
        latest = null;
      }
    };
    const throttledFlush = rafThrottle(flush, rafFn, cafFn);

    /* --- Stable listener references ------------------------------------ */
    const onPointerMove = (event: PointerEvent): void => {
      latest = readPointerState(event, win);
      throttledFlush();
    };
    // A leave supersedes any coalesced move: cancel the pending frame and send
    // the leave immediately so the host does not first receive a stale position.
    const onLeave = (): void => {
      latest = null;
      throttledFlush.cancel();
      optionsRef.current.publishPointer(POINTER_LEFT);
    };

    root.addEventListener("pointermove", onPointerMove, true);
    root.addEventListener("pointerleave", onLeave, true);
    win.addEventListener("blur", onLeave);

    return (): void => {
      root.removeEventListener("pointermove", onPointerMove, true);
      root.removeEventListener("pointerleave", onLeave, true);
      win.removeEventListener("blur", onLeave);
      throttledFlush.cancel();
    };
  }, [enabled]);
}
