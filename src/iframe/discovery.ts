/**
 * Pure, framework-agnostic CMS target discovery.
 *
 * Ported from the prototype `getElementsWithPositionData()`
 * (`code_temp/Stardust-CMS-App/demoApp/src/lib/utils/CmsTarget.utils.ts`).
 *
 * This module walks `[data-cms]` / `[data-cms-content]` elements and produces a
 * deterministic, document-ordered `ContentTarget[]` whose geometry is a plain,
 * structured-clone-safe {@link Geometry} object (never a live `DOMRect`). It has
 * zero `react`, zero `frame-link`, and zero window-event dependencies: it reads
 * only the DOM passed to it and the protocol types. This keeps it the pure
 * correctness substrate that host-side overlay mapping (SIFR-I-0003) consumes.
 */

import type {
  ChildContent,
  ContentTarget,
  Geometry,
} from "../protocol/registry.js";
import {
  ATTR_CONTAINER_TARGET,
  ATTR_CONTENT,
  ATTR_STYLE_GROUP,
  ATTR_TARGET,
} from "./attributes.js";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Vertical inset (in CSS pixels) applied to a content item that is itself a
 * container. The prototype nudged container children with
 * `position.top -= 10; position.height -= 10` in `getChildContent()` so the
 * host overlay would sit inside the container's padding rather than flush with
 * its border.
 *
 * Isolated here as a named, overridable constant (per the task's acceptance
 * criteria) rather than a magic `10`. Downstream overlay mapping can reason
 * about — or override, via {@link DiscoverTargetsOptions.containerInset} — the
 * exact inset applied.
 */
export const CONTAINER_INSET = 10;

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

/** Options for {@link discoverTargets}. */
export interface DiscoverTargetsOptions {
  /**
   * Override the vertical inset applied to container children. Defaults to
   * {@link CONTAINER_INSET}.
   */
  containerInset?: number;
}

/* -------------------------------------------------------------------------- */
/* Geometry serialization                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Copy the eight numeric fields out of a `DOMRect` (or any rect-shaped object)
 * into a plain, structured-clone-safe {@link Geometry}.
 *
 * The result is a fresh object literal — asserting `instanceof DOMRect` on it is
 * `false` — so it survives the `postMessage` structured-clone transport.
 */
export function toGeometry(rect: DOMRect): Geometry {
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    x: rect.x,
    y: rect.y,
  };
}

/* -------------------------------------------------------------------------- */
/* Discovery                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Discover every CMS target under `root`, in stable document order.
 *
 * Returns exactly one {@link ContentTarget} per `[data-cms]` element found under
 * `root` (following `querySelectorAll` document order — NFR-004). Each target's
 * `isContainer` is derived from the presence of a `[data-cms-container-target]`
 * descendant, and its `children` are collected from descendant
 * `[data-cms-content]` elements.
 *
 * @param root - The document or element subtree to walk.
 * @param options - Optional overrides (e.g. container inset).
 */
export function discoverTargets(
  root: Document | HTMLElement,
  options: DiscoverTargetsOptions = {}
): ContentTarget[] {
  const containerInset = options.containerInset ?? CONTAINER_INSET;
  const scroll = resolveScrollOffset(root);

  const targets = Array.from(
    root.querySelectorAll<HTMLElement>(`[${ATTR_TARGET}]`)
  );

  return targets.map((target): ContentTarget => {
    const contents = Array.from(
      target.querySelectorAll<HTMLElement>(`[${ATTR_CONTENT}]`)
    );

    return {
      // `[data-cms]` is guaranteed present by the selector above, so the
      // attribute read is non-null.
      targetId: target.getAttribute(ATTR_TARGET) ?? "",
      isContainer: isTargetContainer(target),
      geometry: toAbsoluteGeometry(target.getBoundingClientRect(), scroll),
      children: contents.map((content, index) =>
        toChildContent(content, index, containerInset, scroll)
      ),
    };
  });
}

/** The document scroll offset (`scrollX`/`scrollY`) of a discovery root. */
interface ScrollOffset {
  x: number;
  y: number;
}

/**
 * Resolve the scroll offset of the window that owns `root`. Discovery reports
 * geometry in **document-absolute** coordinates (viewport rect + scroll offset)
 * so that a scroll neither moves the reported rectangles nor requires the host
 * to re-request positions: the host's single scroll-projection step
 * (`mapGeometry`) is the *only* place scroll is applied. Reporting raw
 * viewport-relative rects here would double-count scroll against that host step.
 *
 * Falls back to `{0, 0}` in non-DOM environments (e.g. jsdom without a layout /
 * scroll, where `scrollX`/`scrollY` are `0` anyway).
 */
function resolveScrollOffset(root: Document | HTMLElement): ScrollOffset {
  const doc = "ownerDocument" in root ? root.ownerDocument : root;
  const win = doc?.defaultView ?? (typeof window !== "undefined" ? window : null);
  if (!win) {
    return { x: 0, y: 0 };
  }
  return { x: win.scrollX, y: win.scrollY };
}

/** Copy a rect into absolute {@link Geometry} by adding the scroll offset. */
function toAbsoluteGeometry(rect: DOMRect, scroll: ScrollOffset): Geometry {
  const g = toGeometry(rect);
  g.top += scroll.y;
  g.bottom += scroll.y;
  g.y += scroll.y;
  g.left += scroll.x;
  g.right += scroll.x;
  g.x += scroll.x;
  return g;
}

/**
 * Whether a `[data-cms]` target is a container: it has a
 * `[data-cms-container-target]` descendant. Mirrors the prototype's
 * `getIsTargetContainer()`.
 */
function isTargetContainer(element: HTMLElement): boolean {
  return element.querySelector(`[${ATTR_CONTAINER_TARGET}]`) !== null;
}

/**
 * Whether a `[data-cms-content]` child is itself a container: it nests a further
 * `[data-cms-content]` descendant. Mirrors the prototype's per-child container
 * detection in `getChildContent()`.
 */
function isChildContainer(element: HTMLElement): boolean {
  return element.querySelector(`[${ATTR_CONTENT}]`) !== null;
}

/**
 * Build a single {@link ChildContent} from a `[data-cms-content]` element.
 *
 * When the child is itself a container, the prototype's inset adjustment is
 * applied to the serialized geometry (`top -= inset; height -= inset`) so the
 * overlay lands inside the container. The adjustment is done on the plain
 * {@link Geometry} object, never on the live rect.
 */
function toChildContent(
  content: HTMLElement,
  index: number,
  containerInset: number,
  scroll: ScrollOffset
): ChildContent {
  const childIsContainer = isChildContainer(content);
  const geometry = toAbsoluteGeometry(content.getBoundingClientRect(), scroll);

  if (childIsContainer) {
    geometry.top = geometry.top - containerInset;
    geometry.height = geometry.height - containerInset;
  }

  return {
    contentId: content.id,
    index,
    isContainer: childIsContainer,
    styleGroup: content.getAttribute(ATTR_STYLE_GROUP) ?? "",
    geometry,
  };
}
