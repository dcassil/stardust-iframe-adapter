/**
 * `RemoteCursors` — the adapter's thin remote-cursor overlay over colab.
 *
 * PRESENCE / EDIT-LOCKS ONLY (no CRDT/OT, no merge/conflict resolution). This
 * component owns NO presence transport: it sources remote participants from
 * colab's roster hook ({@link usePresence}) and their live normalized pointer
 * points from colab's reference {@link Cursor} interaction
 * ({@link useInteraction}). Everything about "who is here and where is their
 * cursor" lives in colab now; the adapter contributes ONLY geometry.
 *
 * Geometry: each colab point is normalized (colab's `Point`) and is projected
 * into host-viewport pixels through the adapter's SIFR-I-0003
 * {@link mapGeometry} — the SAME coordinate authority the target-box overlays
 * use — via the {@link mapGeometryTransform} seam. A given normalized point
 * therefore lands at EXACTLY the `left`/`top` the pre-migration overlay
 * computed under the same `{ scale, scrollOffset }`. colab stays geometry-free;
 * `mapGeometry` is never pushed into it.
 *
 * The rendered markup (dot + colored name pill, `data-presence-cursor` hooks)
 * is preserved verbatim from the pre-migration overlay so downstream styling
 * and tests keep working.
 */

import type { CSSProperties, ReactElement } from "react";
import type { GeometryTransform } from "../host/mapGeometry.js";
import { mapGeometryTransform } from "./transform.js";
import {
  usePresence,
  useInteraction,
  Cursor,
  type Participant,
} from "colab-ui/react";

export interface RemoteCursorsProps {
  /** The current scale + scroll transform (same one used for target boxes). */
  transform: GeometryTransform;
  /** Optional class name applied to each cursor marker. */
  className?: string;
  /** Optional style merged onto each cursor marker after positioning. */
  style?: CSSProperties;
}

/** Roster lookup: participant id → display name/color (falls back to id/gray). */
function identityOf(
  roster: readonly Participant[],
  id: string,
): { name: string; color: string } {
  const match = roster.find((p) => p.id === id);
  return { name: match?.name ?? id, color: match?.color ?? "#888" };
}

/**
 * Render one labeled cursor per REMOTE participant that has a colab cursor
 * point. Points come from colab; positions come from {@link mapGeometry}, so
 * cursors track correctly under iframe scale and scroll. Participants without a
 * point render nothing.
 */
export function RemoteCursors({
  transform,
  className,
  style,
}: RemoteCursorsProps): ReactElement {
  const roster = usePresence();
  const { selectors } = useInteraction(Cursor);
  const project = mapGeometryTransform(transform);

  return (
    <>
      {selectors.remoteCursors.map((entry) => {
        const { name, color } = identityOf(roster, entry.participantId);
        const mapped = project(entry.point);
        const markerStyle: CSSProperties = {
          position: "absolute",
          left: mapped.x,
          top: mapped.y,
          pointerEvents: "none",
          ...style,
        };
        const labelStyle: CSSProperties = {
          position: "absolute",
          left: 8,
          top: 0,
          whiteSpace: "nowrap",
          background: color,
          color: "#fff",
          fontSize: 11,
          lineHeight: "16px",
          padding: "0 4px",
          borderRadius: 2,
        };
        const dotStyle: CSSProperties = {
          position: "absolute",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
        };
        return (
          <div
            key={entry.participantId}
            data-presence-cursor={entry.participantId}
            className={className}
            style={markerStyle}
          >
            <span aria-hidden style={dotStyle} />
            <span data-presence-cursor-label style={labelStyle}>
              {name}
            </span>
          </div>
        );
      })}
    </>
  );
}
