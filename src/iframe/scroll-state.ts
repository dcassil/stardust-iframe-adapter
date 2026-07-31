/**
 * Pure scroll-state reader.
 *
 * Ported from the prototype `getWindowPositions()`
 * (`code_temp/Stardust-CMS-App/demoApp/src/lib/utils/CmsWindow.utils.ts`).
 * Produces the serializable {@link ScrollState} the iframe publishes over
 * `cms/sendScrollPositions`. Note `h` carries the horizontal scroll offset for
 * wire-compatibility with the prototype (see the protocol docs).
 */

import type { ScrollState } from "../protocol/registry.js";

/** Read the current window scroll state as a serializable {@link ScrollState}. */
export function readScrollState(win: Window = window): ScrollState {
  const scrollY = win.scrollY;
  return {
    h: win.scrollX,
    y: scrollY,
    isTop: scrollY === 0,
    isBottom:
      scrollY + win.innerHeight >= win.document.body.scrollHeight,
  };
}
