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
} from "../protocol/index.js";

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
/* Attribute contract                                                         */
/* -------------------------------------------------------------------------- */

/** `data-cms` → `targetId`. Marks a discoverable CMS target. */
const ATTR_TARGET = "data-cms";
/** `data-cms-content` → a content item nested inside a target. */
const ATTR_CONTENT = "data-cms-content";
/** `data-cms-container-target` → the target (or child) is a container. */
const ATTR_CONTAINER = "data-cms-container-target";
/** `data-style-group` → `styleGroup` (style-rule scope). */
const ATTR_STYLE_GROUP = "data-style-group";

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
      geometry: toGeometry(target.getBoundingClientRect()),
      children: contents.map((content, index) =>
        toChildContent(content, index, containerInset)
      ),
    };
  });
}

/**
 * Whether a `[data-cms]` target is a container: it has a
 * `[data-cms-container-target]` descendant. Mirrors the prototype's
 * `getIsTargetContainer()`.
 */
function isTargetContainer(element: HTMLElement): boolean {
  return element.querySelector(`[${ATTR_CONTAINER}]`) !== null;
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
  containerInset: number
): ChildContent {
  const childIsContainer = isChildContainer(content);
  const geometry = toGeometry(content.getBoundingClientRect());

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
