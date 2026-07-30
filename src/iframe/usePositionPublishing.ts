/**
 * Observer + throttled scroll/resize publishing bundle for the iframe adapter.
 *
 * Replaces the prototype `CmsBase.context.tsx` listener block, which had three
 * defects this hook fixes:
 *
 *  - Fresh arrow functions passed to both `addEventListener` and
 *    `removeEventListener`, so removal never matched → listener leak. Here every
 *    listener is a single stable reference held in a ref, added and removed with
 *    the identical reference (REQ-005).
 *  - No `ResizeObserver`/`MutationObserver`; layout/DOM changes did not
 *    re-publish. Here both are established and disconnected on cleanup (REQ-004).
 *  - Unthrottled streaming. Here every push is coalesced to at most one per
 *    animation frame via {@link rafThrottle}, and the pending frame is cancelled
 *    on unmount so no post fires after teardown (NFR-001).
 */

import { useEffect, useRef } from "react";
import type { ContentTarget, ScrollState } from "../protocol/index.js";
import { discoverTargets } from "./discovery.js";
import { readScrollState } from "./scroll-state.js";
import { rafThrottle } from "./raf-throttle.js";

/** Options for {@link usePositionPublishing}. */
export interface PositionPublishingOptions {
  /** Publish the current target positions (`cms/sendElementPositions`). */
  publishPositions: (positions: ContentTarget[]) => void;
  /** Publish the current scroll state (`cms/sendScrollPositions`). */
  publishScroll: (scroll: ScrollState) => void;
  /** DOM root that discovery walks and observers watch. Defaults to `document`. */
  root?: Document | HTMLElement;
  /** Window whose scroll/resize events drive publishing. Defaults to `window`. */
  win?: Window;
  /** Injectable rAF/caf for deterministic tests. */
  raf?: (cb: FrameRequestCallback) => number;
  caf?: (handle: number) => void;
}

/**
 * Resolve the element to observe with a `ResizeObserver`. `ResizeObserver` needs
 * an `Element`; when the root is a `Document` we observe `documentElement`.
 */
function resolveObservedElement(
  root: Document | HTMLElement
): Element | null {
  if (root instanceof HTMLElement) return root;
  return root.documentElement;
}

export function usePositionPublishing(
  options: PositionPublishingOptions
): void {
  // Keep the latest callbacks/root/win in refs so the setup effect can run once
  // (stable references) while always calling the current publishers.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect((): (() => void) => {
    const current = optionsRef.current;
    const win = current.win ?? window;
    const root = current.root ?? win.document;
    const rafFn = current.raf ?? win.requestAnimationFrame.bind(win);
    const cafFn = current.caf ?? win.cancelAnimationFrame.bind(win);

    /* --- The single coalesced publish ---------------------------------- */
    const publish = (): void => {
      const { publishPositions, publishScroll } = optionsRef.current;
      publishPositions(discoverTargets(root));
      publishScroll(readScrollState(win));
    };
    const throttledPublish = rafThrottle(publish, rafFn, cafFn);

    /* --- Stable listener references ------------------------------------ */
    const onScroll = (): void => throttledPublish();
    const onResize = (): void => throttledPublish();

    win.addEventListener("scroll", onScroll, true);
    win.addEventListener("resize", onResize);

    /* --- Observers ----------------------------------------------------- */
    const resizeObserver = new ResizeObserver(() => throttledPublish());
    const observed = resolveObservedElement(root);
    if (observed) resizeObserver.observe(observed);

    const mutationObserver = new MutationObserver(() => throttledPublish());
    const mutationTarget = observed ?? win.document.body;
    mutationObserver.observe(mutationTarget, {
      subtree: true,
      childList: true,
      attributes: true,
    });

    // Publish once on setup so the host has current geometry immediately.
    throttledPublish();

    return (): void => {
      // Symmetric teardown: identical references + observer disconnect + cancel
      // any pending frame so no post fires after unmount.
      win.removeEventListener("scroll", onScroll, true);
      win.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      throttledPublish.cancel();
    };
  }, []);
}
