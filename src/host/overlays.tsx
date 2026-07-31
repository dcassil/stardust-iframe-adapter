/**
 * Unstyled host overlay primitives.
 *
 * `TargetAreaOverlay` (successor to `CMSTargetAreas.tsx`) and
 * `ContentItemOverlay` (successor to `CMSTargetItem.tsx`) render
 * absolutely-positioned boxes straight from mapped geometry and forward all
 * pointer/drag intent as structured callbacks. They are pure/presentational:
 *
 *  - **No visual styling** beyond positioning + structural data attributes /
 *    stable class names (NFR-004). Consumers pass `className`/`style` to style
 *    them; the demo owns all appearance (bar color, drag-over tint, etc.).
 *  - **No Stardust contexts, no content store** (NFR-002). Every input is a prop;
 *    every output is a callback.
 *  - Geometry is consumed as-is from `MappedGeometry` — never recomputed here
 *    (`mapGeometry` in SIFR-T-0014 is the sole coordinate authority).
 *
 * ## Drop-zone model (ported from the prototype)
 *
 * The prototype (`CMSTargetAreas.tsx` / `CMSTargetItem.tsx`) built drops from a
 * per-item TOP zone (drop → item's index) and BOTTOM zone (drop → index + 1),
 * and a single full-area zone (index 0) for an empty target. Only the active
 * zone became interactive so the iframe underneath stayed usable. This module
 * reproduces that structure with stable data attributes:
 *
 *  - The target box carries `data-target-id` and, while a drag is over it,
 *    `data-dragover=""` (tracked with an enter/leave counter so moving across
 *    child nodes doesn't flicker).
 *  - Each item renders a `data-drop-zone="top"` (→ its index) and
 *    `data-drop-zone="bottom"` (→ index + 1) zone. An empty target renders one
 *    `data-drop-zone="empty"` full-area zone (→ index 0).
 *  - The zone currently under the pointer during a drag carries
 *    `data-drop-active=""`, so CSS can render the ~8px insertion bar.
 *  - The drop area + zones set `pointer-events` interactive only while a native
 *    drag is in progress anywhere in the document (detected by
 *    {@link useDragActive} via document-level `dragstart`/`dragend`/`drop`, or
 *    overridden by the `dragActive` prop); when idle they let clicks fall
 *    through to the item's select hit-box and to the iframe. Gating on the
 *    GLOBAL drag flag — not the target's own `onDragEnter` — is essential:
 *    `dragenter` can never fire on a `pointer-events:none` element, so the
 *    prototype-style global flag is the only reliable trigger.
 */

import { useCallback, useRef, useState } from "react";
import type { CSSProperties, DragEvent, MouseEvent, ReactElement } from "react";
import type { MappedChild, MappedTarget } from "./useStardustHost.js";
import type { MappedGeometry } from "./mapGeometry.js";
import { useDragActive } from "./useDragActive.js";
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

/** Default minimum height (px) for a target's droppable area. */
const DEFAULT_MIN_DROP_HEIGHT = 18;

/**
 * Identifies the active insertion zone within a target: which content item it
 * hangs off, and which edge (`top` → item index, `bottom` → index + 1). For an
 * empty target the single zone resolves to index 0.
 */
interface ActiveZone {
  /** The resolved insert index for a drop in this zone. */
  index: number;
  /** The item index the zone belongs to (or `-1` for the empty zone). */
  itemIndex: number;
  /** Which edge of the item this zone represents. */
  edge: "top" | "bottom" | "empty";
}

/**
 * Fallback insert-index computation for a drop that lands directly on the target
 * box rather than on a specific insertion zone (e.g. between zones, or in a gap).
 *
 * `offsetY` is the pointer's position relative to the target box's top edge.
 * Each child's vertical midpoint is taken relative to the same box top; the
 * result is the number of children the pointer is past — drop-above-first → 0,
 * between i-1 and i → i, below-last → children.length.
 */
function computeInsertIndex(target: MappedTarget, offsetY: number): number {
  const { children } = target;
  const targetTop = target.geometry.top;
  for (let i = 0; i < children.length; i++) {
    const { top, height } = children[i]!.geometry;
    const midpoint = top - targetTop + height / 2;
    if (offsetY < midpoint) {
      return children[i]!.index;
    }
  }
  return children.length;
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
  /**
   * When `true`, a drag is active over the owning target, so the item box goes
   * non-interactive to let the insertion zones underneath receive the drag.
   */
  dragActive?: boolean;
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
  dragActive = false,
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
      style={{
        ...positionStyle(child.geometry),
        ...(dragActive ? { pointerEvents: "none" } : {}),
        ...style,
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* TargetAreaOverlay                                                          */
/* -------------------------------------------------------------------------- */

export interface TargetAreaOverlayProps extends OperationCallbacks {
  /** The target, already mapped to host coordinates. */
  target: MappedTarget;
  /**
   * Minimum height (in host px) guaranteed for the target's droppable area, so
   * short or empty targets stay grabbable. Defaults to {@link DEFAULT_MIN_DROP_HEIGHT}
   * (18). This only clamps the *drop area's* height; it never shifts the
   * reported geometry of this or any other target.
   */
  minDropHeight?: number;
  /** Optional consumer class name for the target box. */
  className?: string;
  /** Optional consumer style, merged after the positioning style. */
  style?: CSSProperties;
  /** Optional class name applied to child `ContentItemOverlay`s. */
  itemClassName?: string;
  /** Optional style applied to child `ContentItemOverlay`s. */
  itemStyle?: CSSProperties;
  /**
   * Optional class name applied to each insertion drop-zone (`top`/`bottom`/
   * `empty`). The active zone additionally carries `data-drop-active`.
   */
  zoneClassName?: string;
  /**
   * When set, OVERRIDES the built-in native-drag detector that decides whether
   * the drop area + zones are interactive (`pointer-events: auto`) so that a
   * real HTML5 drag can reach them. Defaults to the auto-detected value from
   * {@link useDragActive} (document-level `dragstart`/`dragend`/`drop`), which
   * makes the overlay work with no consumer wiring. Pass a boolean to drive it
   * yourself (e.g. from a palette drag flag).
   */
  dragActive?: boolean;
}

/**
 * A target drop-area box. Renders one `ContentItemOverlay` per content item
 * plus its TOP/BOTTOM insertion zones (or a single full-area zone when empty),
 * and resolves drops into structured insert/move operations dispatched through
 * the callbacks.
 */
export function TargetAreaOverlay({
  target,
  minDropHeight = DEFAULT_MIN_DROP_HEIGHT,
  onInsert,
  onMove,
  onSelect,
  className,
  style,
  itemClassName,
  itemStyle,
  zoneClassName,
  dragActive: dragActiveProp,
}: TargetAreaOverlayProps): ReactElement {
  // Auto-detect a native drag anywhere in the document; a consumer may override.
  const autoDragActive = useDragActive();
  const dragActive = dragActiveProp ?? autoDragActive;

  const callbacks: OperationCallbacks = {
    ...(onInsert ? { onInsert } : {}),
    ...(onMove ? { onMove } : {}),
    ...(onSelect ? { onSelect } : {}),
  };

  // Whole-area drag-over state, tracked with an enter/leave counter so moving
  // the pointer across child nodes doesn't flicker the tint off and on.
  const [dragOver, setDragOver] = useState(false);
  const enterCountRef = useRef(0);
  // The insertion zone currently under the pointer during a drag.
  const [activeZone, setActiveZone] = useState<ActiveZone | null>(null);

  const clearDrag = useCallback((): void => {
    enterCountRef.current = 0;
    setDragOver(false);
    setActiveZone(null);
  }, []);

  const handleAreaDragEnter = (): void => {
    enterCountRef.current += 1;
    setDragOver(true);
  };

  const handleAreaDragLeave = (): void => {
    enterCountRef.current -= 1;
    if (enterCountRef.current <= 0) {
      enterCountRef.current = 0;
      setDragOver(false);
      setActiveZone(null);
    }
  };

  const handleAreaDragOver = (event: DragEvent<HTMLDivElement>): void => {
    // Signal this is a valid drop target so the browser fires `drop`.
    event.preventDefault();
  };

  const activateZone = (zone: ActiveZone) => (
    event: DragEvent<HTMLDivElement>,
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!dragOver) {
      setDragOver(true);
    }
    setActiveZone((prev) =>
      prev && prev.index === zone.index && prev.edge === zone.edge
        ? prev
        : zone,
    );
  };

  const dropAt = (event: DragEvent<HTMLDivElement>, index: number): void => {
    event.preventDefault();
    event.stopPropagation();
    const op = opFromDataTransfer(event.dataTransfer, {
      targetId: target.targetId,
      index,
    });
    dispatchOp(op, callbacks);
    clearDrag();
  };

  const handleZoneDrop = (zone: ActiveZone) => (
    event: DragEvent<HTMLDivElement>,
  ): void => {
    dropAt(event, zone.index);
  };

  const handleAreaDrop = (event: DragEvent<HTMLDivElement>): void => {
    // A drop landing on the target box itself (not a specific zone, which
    // stops propagation). Resolve via the active zone if one is marked, else
    // fall back to a midpoint computation over the pointer position.
    if (activeZone) {
      dropAt(event, activeZone.index);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    dropAt(event, computeInsertIndex(target, offsetY));
  };

  const handleSelect = (event: MouseEvent<HTMLDivElement>): void => {
    // Only fire when the target box itself (not a child/zone) was clicked.
    if (event.target === event.currentTarget) {
      onSelect?.(target.targetId);
    }
  };

  const hasChildren = target.children.length > 0;

  const isZoneActive = (zone: ActiveZone): boolean =>
    activeZone !== null &&
    activeZone.index === zone.index &&
    activeZone.edge === zone.edge;

  // The drop area + zones capture pointer events while a native drag is active
  // (so `dragenter`/`dragover`/`drop` actually reach them and toggle
  // `data-dragover`/`data-drop-active`); when idle they are non-interactive so
  // selection clicks and the iframe underneath stay usable. Gating on the
  // GLOBAL drag flag (not the deadlock-prone per-target `onDragEnter`) is the
  // fix: `dragenter` can never fire on a `pointer-events:none` element.
  const dropPointerEvents: CSSProperties["pointerEvents"] = dragActive
    ? "auto"
    : "none";

  // Guarantee a grabbable drop area even for short/empty targets, without
  // touching the reported geometry (used elsewhere for hit-testing/layout).
  const dropAreaHeight = Math.max(target.geometry.height, minDropHeight);

  return (
    <div
      data-target-id={target.targetId}
      {...(dragOver ? { "data-dragover": "" } : {})}
      onDragEnter={handleAreaDragEnter}
      onDragLeave={handleAreaDragLeave}
      onDragOver={handleAreaDragOver}
      onDrop={handleAreaDrop}
      onClick={handleSelect}
      className={className}
      style={{
        ...positionStyle(target.geometry),
        // Idle: container is non-interactive so clicks reach items/iframe.
        // During a drag: it becomes interactive so drag events reach the drop
        // area + zones inside it (the drop area re-clamps the hit region).
        pointerEvents: dragActive ? "auto" : "none",
        ...style,
      }}
    >
      {/* Droppable area layer, clamped to a minimum grabbable height. */}
      <div
        data-drop-area=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: dropAreaHeight,
          pointerEvents: dropPointerEvents,
        }}
      >
        {hasChildren ? (
          target.children.map((child, i) => {
            const topZone: ActiveZone = {
              index: child.index,
              itemIndex: i,
              edge: "top",
            };
            const bottomZone: ActiveZone = {
              index: child.index + 1,
              itemIndex: i,
              edge: "bottom",
            };
            const top = child.geometry.top - target.geometry.top;
            const height = child.geometry.height;
            const halfway = height / 2;
            return (
              <div key={child.contentId}>
                <div
                  data-drop-zone="top"
                  data-drop-index={topZone.index}
                  {...(isZoneActive(topZone) ? { "data-drop-active": "" } : {})}
                  onDragOver={activateZone(topZone)}
                  onDrop={handleZoneDrop(topZone)}
                  className={zoneClassName}
                  style={{
                    position: "absolute",
                    left: 0,
                    width: "100%",
                    top,
                    height: halfway,
                    pointerEvents: dropPointerEvents,
                  }}
                />
                <div
                  data-drop-zone="bottom"
                  data-drop-index={bottomZone.index}
                  {...(isZoneActive(bottomZone)
                    ? { "data-drop-active": "" }
                    : {})}
                  onDragOver={activateZone(bottomZone)}
                  onDrop={handleZoneDrop(bottomZone)}
                  className={zoneClassName}
                  style={{
                    position: "absolute",
                    left: 0,
                    width: "100%",
                    top: top + halfway,
                    height: height - halfway,
                    pointerEvents: dropPointerEvents,
                  }}
                />
              </div>
            );
          })
        ) : (
          <div
            data-drop-zone="empty"
            data-drop-index={0}
            {...(isZoneActive({ index: 0, itemIndex: -1, edge: "empty" })
              ? { "data-drop-active": "" }
              : {})}
            onDragOver={activateZone({ index: 0, itemIndex: -1, edge: "empty" })}
            onDrop={handleZoneDrop({ index: 0, itemIndex: -1, edge: "empty" })}
            className={zoneClassName}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: dropPointerEvents,
            }}
          />
        )}
      </div>

      {hasChildren
        ? target.children.map((child) => (
            <ContentItemOverlay
              key={child.contentId}
              targetId={target.targetId}
              child={child}
              index={child.index}
              dragActive={dragActive}
              {...callbacks}
              {...(itemClassName !== undefined ? { className: itemClassName } : {})}
              {...(itemStyle !== undefined ? { style: itemStyle } : {})}
            />
          ))
        : null}
    </div>
  );
}
