/**
 * Insertion-zone rendering for the host overlay primitives. Split out of
 * `overlays.internals.tsx` to respect the module size budget; not part of the
 * public `./host` surface. Consumes the drag/drop state produced by
 * {@link useDropArea}.
 */

import type { CSSProperties, ReactElement } from "react";
import type { MappedTarget } from "./useStardustHost.js";
import type { ActiveZone, DropAreaState } from "./overlays.internals.js";

/** Props for {@link InsertionZones}. */
export interface InsertionZonesProps {
  target: MappedTarget;
  drop: DropAreaState;
  dropPointerEvents: CSSProperties["pointerEvents"];
  zoneClassName?: string;
}

/** A single TOP/BOTTOM zone pair for one content item. */
function ItemZones({
  child,
  itemIndex,
  targetTop,
  drop,
  dropPointerEvents,
  zoneClassName,
}: {
  child: MappedTarget["children"][number];
  itemIndex: number;
  targetTop: number;
  drop: DropAreaState;
  dropPointerEvents: CSSProperties["pointerEvents"];
  zoneClassName?: string;
}): ReactElement {
  const topZone: ActiveZone = { index: child.index, itemIndex, edge: "top" };
  const bottomZone: ActiveZone = {
    index: child.index + 1,
    itemIndex,
    edge: "bottom",
  };
  const top = child.geometry.top - targetTop;
  const height = child.geometry.height;
  const halfway = height / 2;
  return (
    <div>
      <div
        data-drop-zone="top"
        data-drop-index={topZone.index}
        {...(drop.isZoneActive(topZone) ? { "data-drop-active": "" } : {})}
        onDragOver={drop.activateZone(topZone)}
        onDrop={drop.handleZoneDrop(topZone)}
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
        {...(drop.isZoneActive(bottomZone) ? { "data-drop-active": "" } : {})}
        onDragOver={drop.activateZone(bottomZone)}
        onDrop={drop.handleZoneDrop(bottomZone)}
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
}

/**
 * Render the insertion zones for a target: a TOP/BOTTOM pair per content item,
 * or a single full-area `empty` zone when the target has no children.
 */
export function InsertionZones({
  target,
  drop,
  dropPointerEvents,
  zoneClassName,
}: InsertionZonesProps): ReactElement {
  if (target.children.length === 0) {
    const emptyZone: ActiveZone = { index: 0, itemIndex: -1, edge: "empty" };
    return (
      <div
        data-drop-zone="empty"
        data-drop-index={0}
        {...(drop.isZoneActive(emptyZone) ? { "data-drop-active": "" } : {})}
        onDragOver={drop.activateZone(emptyZone)}
        onDrop={drop.handleZoneDrop(emptyZone)}
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
    );
  }

  return (
    <>
      {target.children.map((child, i) => (
        <ItemZones
          key={child.contentId}
          child={child}
          itemIndex={i}
          targetTop={target.geometry.top}
          drop={drop}
          dropPointerEvents={dropPointerEvents}
          {...(zoneClassName !== undefined ? { zoneClassName } : {})}
        />
      ))}
    </>
  );
}
