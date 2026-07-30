/**
 * Unstyled host overlay primitives.
 *
 * `TargetAreaOverlay` (successor to `CMSTargetAreas.tsx`) and
 * `ContentItemOverlay` (successor to `CMSTargetItem.tsx`) render
 * absolutely-positioned boxes straight from mapped geometry and forward all
 * pointer/drag intent as structured callbacks. They are pure/presentational:
 *
 *  - **No visual styling** beyond `position: absolute` + the four geometry
 *    properties (NFR-004). Consumers pass `className`/`style` to style them; the
 *    demo owns all appearance.
 *  - **No Stardust contexts, no content store** (NFR-002). Every input is a prop;
 *    every output is a callback.
 *  - Geometry is consumed as-is from `MappedGeometry` — never recomputed here
 *    (`mapGeometry` in SIFR-T-0014 is the sole coordinate authority).
 */

import type { CSSProperties, DragEvent, MouseEvent, ReactElement } from "react";
import type { MappedChild, MappedTarget } from "./useStardustHost.js";
import type { MappedGeometry } from "./mapGeometry.js";
import {
  DATA_TRANSFER_KEYS,
  dispatchOp,
  opFromDataTransfer,
  type OperationCallbacks,
} from "./operations.js";

/** Turn a `MappedGeometry` into the absolute-positioning style block. */
function positionStyle(geometry: MappedGeometry): CSSProperties {
  return {
    position: "absolute",
    top: geometry.top,
    left: geometry.left,
    width: geometry.width,
    height: geometry.height,
  };
}

/* -------------------------------------------------------------------------- */
/* ContentItemOverlay                                                         */
/* -------------------------------------------------------------------------- */

export interface ContentItemOverlayProps extends OperationCallbacks {
  /** The owning target's id. */
  targetId: string;
  /** The content item, already mapped to host coordinates. */
  child: MappedChild;
  /** The item's index within its target. */
  index: number;
  /** Optional consumer class name. */
  className?: string;
  /** Optional consumer style, merged after the positioning style. */
  style?: CSSProperties;
}

/**
 * A single content item box. Emits `onSelect(targetId, contentId)` on click and
 * populates `dataTransfer` on drag start so a later drop can be resolved into a
 * `MoveOp` (mirrors `CMSTargetItem.tsx`'s `isMove`/`target`/`contentId`/`index`).
 */
export function ContentItemOverlay({
  targetId,
  child,
  index,
  onSelect,
  className,
  style,
}: ContentItemOverlayProps): ReactElement {
  const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    onSelect?.(targetId, child.contentId);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    event.dataTransfer.setData(DATA_TRANSFER_KEYS.isMove, "true");
    event.dataTransfer.setData(DATA_TRANSFER_KEYS.sourceTarget, targetId);
    event.dataTransfer.setData(DATA_TRANSFER_KEYS.contentId, child.contentId);
    event.dataTransfer.setData(DATA_TRANSFER_KEYS.sourceIndex, String(index));
  };

  return (
    <div
      data-content-id={child.contentId}
      data-index={index}
      draggable
      onClick={handleClick}
      onDragStart={handleDragStart}
      className={className}
      style={{ ...positionStyle(child.geometry), ...style }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* TargetAreaOverlay                                                          */
/* -------------------------------------------------------------------------- */

export interface TargetAreaOverlayProps extends OperationCallbacks {
  /** The target, already mapped to host coordinates. */
  target: MappedTarget;
  /** Optional consumer class name for the target box. */
  className?: string;
  /** Optional consumer style, merged after the positioning style. */
  style?: CSSProperties;
  /** Optional class name applied to child `ContentItemOverlay`s. */
  itemClassName?: string;
  /** Optional style applied to child `ContentItemOverlay`s. */
  itemStyle?: CSSProperties;
}

/**
 * Compute the insert index for a drop within this target.
 *
 * `offsetY` is the pointer's position *relative to the target box's top edge*
 * (i.e. `event.clientY - boxRect.top`). Each child's vertical midpoint is taken
 * relative to the same box top (`child.top - target.top + child.height / 2`).
 * The result is the number of children the pointer is past — drop-above-first
 * → 0, between i-1 and i → i, below-last → children.length. Mirrors the
 * prototype's above/below drop zones in `CMSTargetItem.tsx`, collapsed into one
 * continuous computation.
 */
function computeInsertIndex(target: MappedTarget, offsetY: number): number {
  const { children } = target;
  const targetTop = target.geometry.top;
  for (let i = 0; i < children.length; i++) {
    const { top, height } = children[i]!.geometry;
    const midpoint = top - targetTop + height / 2;
    if (offsetY < midpoint) {
      return i;
    }
  }
  return children.length;
}

/**
 * A target drop-area box. Renders one `ContentItemOverlay` per content item
 * (or an empty drop zone when the target has none), and resolves drops into
 * structured insert/move operations dispatched through the callbacks.
 */
export function TargetAreaOverlay({
  target,
  onInsert,
  onMove,
  onSelect,
  className,
  style,
  itemClassName,
  itemStyle,
}: TargetAreaOverlayProps): ReactElement {
  const callbacks: OperationCallbacks = {
    ...(onInsert ? { onInsert } : {}),
    ...(onMove ? { onMove } : {}),
    ...(onSelect ? { onSelect } : {}),
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    // Signal this is a valid drop target so the browser fires `drop`.
    event.preventDefault();
  };

  const dropAt = (event: DragEvent<HTMLDivElement>, index: number): void => {
    event.preventDefault();
    event.stopPropagation();
    const op = opFromDataTransfer(event.dataTransfer, {
      targetId: target.targetId,
      index,
    });
    dispatchOp(op, callbacks);
  };

  const handleAreaDrop = (event: DragEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    dropAt(event, computeInsertIndex(target, offsetY));
  };

  const handleSelect = (event: MouseEvent<HTMLDivElement>): void => {
    // Only fire when the target box itself (not a child) was clicked.
    if (event.target === event.currentTarget) {
      onSelect?.(target.targetId);
    }
  };

  const hasChildren = target.children.length > 0;

  return (
    <div
      data-target-id={target.targetId}
      onDragOver={handleDragOver}
      onDrop={handleAreaDrop}
      onClick={handleSelect}
      className={className}
      style={{ ...positionStyle(target.geometry), ...style }}
    >
      {hasChildren
        ? target.children.map((child) => (
            <ContentItemOverlay
              key={child.contentId}
              targetId={target.targetId}
              child={child}
              index={child.index}
              {...callbacks}
              {...(itemClassName !== undefined ? { className: itemClassName } : {})}
              {...(itemStyle !== undefined ? { style: itemStyle } : {})}
            />
          ))
        : null}
    </div>
  );
}
