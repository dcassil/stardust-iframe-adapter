/**
 * Internal building blocks for the host overlay primitives (`overlays.tsx`).
 *
 * Split out purely to keep each module within the size budget; nothing here is
 * part of the public `./host` surface. `overlays.tsx` composes these into the
 * exported `TargetAreaOverlay` / `ContentItemOverlay`.
 */

import { useCallback, useRef, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import type { MappedTarget } from "./useStardustHost.js";
import type { MappedGeometry } from "./mapGeometry.js";
import {
  dispatchOp,
  opFromDataTransfer,
  type OperationCallbacks,
} from "./operations.js";

/** Default minimum height (px) for a target's droppable area. */
export const DEFAULT_MIN_DROP_HEIGHT = 18;

/** Turn a `MappedGeometry` into the absolute-positioning style block. */
export function positionStyle(geometry: MappedGeometry): CSSProperties {
  return {
    position: "absolute",
    top: geometry.top,
    left: geometry.left,
    width: geometry.width,
    height: geometry.height,
  };
}

/**
 * Identifies the active insertion zone within a target: which content item it
 * hangs off, and which edge (`top` → item index, `bottom` → index + 1). For an
 * empty target the single zone resolves to index 0.
 */
export interface ActiveZone {
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
 * result is the number of children the pointer is past.
 */
export function computeInsertIndex(
  target: MappedTarget,
  offsetY: number,
): number {
  const { children } = target;
  const targetTop = target.geometry.top;
  for (const child of children) {
    const { top, height } = child.geometry;
    const midpoint = top - targetTop + height / 2;
    if (offsetY < midpoint) {
      return child.index;
    }
  }
  return children.length;
}

/** The drag/drop state and event handlers backing a target drop area. */
export interface DropAreaState {
  dragActive: boolean;
  dragOver: boolean;
  handleAreaDragEnter: () => void;
  handleAreaDragLeave: () => void;
  handleAreaDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleAreaDrop: (event: DragEvent<HTMLDivElement>) => void;
  activateZone: (zone: ActiveZone) => (event: DragEvent<HTMLDivElement>) => void;
  handleZoneDrop: (zone: ActiveZone) => (event: DragEvent<HTMLDivElement>) => void;
  isZoneActive: (zone: ActiveZone) => boolean;
}

/**
 * Own the whole drag/drop lifecycle for one target's drop area: the enter/leave
 * counter, the active-zone marker, and the drop resolution (active zone → its
 * index, else a midpoint computation over the pointer position).
 */
export function useDropArea(
  target: MappedTarget,
  callbacks: OperationCallbacks,
  dragActive: boolean,
): DropAreaState {
  const [dragOver, setDragOver] = useState(false);
  const enterCountRef = useRef(0);
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

  const activateZone =
    (zone: ActiveZone) =>
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      if (!dragOver) {
        setDragOver(true);
      }
      setActiveZone((prev) =>
        prev?.index === zone.index && prev.edge === zone.edge ? prev : zone,
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

  const handleZoneDrop =
    (zone: ActiveZone) =>
    (event: DragEvent<HTMLDivElement>): void => {
      dropAt(event, zone.index);
    };

  const handleAreaDrop = (event: DragEvent<HTMLDivElement>): void => {
    // A drop landing on the target box itself (not a specific zone, which stops
    // propagation). Resolve via the active zone if one is marked, else fall
    // back to a midpoint computation over the pointer position.
    if (activeZone) {
      dropAt(event, activeZone.index);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    dropAt(event, computeInsertIndex(target, offsetY));
  };

  const isZoneActive = (zone: ActiveZone): boolean =>
    activeZone !== null &&
    activeZone.index === zone.index &&
    activeZone.edge === zone.edge;

  return {
    dragActive,
    dragOver,
    handleAreaDragEnter,
    handleAreaDragLeave,
    handleAreaDragOver,
    handleAreaDrop,
    activateZone,
    handleZoneDrop,
    isZoneActive,
  };
}
