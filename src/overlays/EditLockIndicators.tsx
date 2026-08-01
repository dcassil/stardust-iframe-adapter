/**
 * `EditLockIndicators` — the adapter's thin advisory edit-lock overlay over
 * colab.
 *
 * PRESENCE / EDIT-LOCKS ONLY (no CRDT/OT, no merge/conflict resolution). The
 * advisory soft-lock state ("who is editing which scope") is owned entirely by
 * colab's reference {@link EditLock} interaction, read here through
 * {@link useInteraction}; participant identity (name/color) comes from colab's
 * roster ({@link usePresence}). The adapter contributes ONLY geometry and the
 * `data-cms`↔`scopeId` boundary mapping.
 *
 * The overlay keys off colab {@link ScopeId}s. Callers pass their `data-cms`
 * targets (id + iframe-space geometry); each target id is converted to the
 * scope colab locks against via {@link targetIdToScopeId}, so the EXACT element
 * that was locked pre-migration is the exact element badged post-migration. A
 * scope colab reports as locked but that matches no known target is ignored
 * (graceful no-op — never throws). Target geometry is projected to host pixels
 * through the adapter's SIFR-I-0003 {@link mapGeometry}; colab stays
 * geometry-free.
 *
 * Copy is deliberately presence-only ("{name} is editing"): it never claims a
 * merge/conflict-resolution guarantee. Markup (`data-presence-lock` /
 * `data-presence-lock-by` hooks) is preserved verbatim.
 */

import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";
import { mapGeometry, type GeometryTransform } from "../host/mapGeometry.js";
import type { Geometry } from "../protocol/registry.js";
import { targetIdToScopeId, type CmsTargetId } from "./scopeId.js";
import {
  usePresence,
  useInteraction,
  EditLock,
  type Participant,
} from "colab-ui/react";

/** Minimal geometry-bearing shape the lock layer needs per `data-cms` target. */
export interface LockTarget {
  targetId: CmsTargetId;
  geometry: Geometry;
}

export interface EditLockIndicatorsProps {
  /** The current scale + scroll transform. */
  transform: GeometryTransform;
  /**
   * The known `data-cms` targets (id + iframe-space geometry). Typically the
   * mapped targets' source geometry from `useStardustHost`. A locked scope that
   * matches no entry here is ignored (graceful no-op).
   */
  targets: LockTarget[];
  /** Optional class name applied to each lock badge wrapper. */
  className?: string;
  /** Optional style merged onto each lock badge wrapper after positioning. */
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
 * Render an advisory "{name} is editing" badge on each known target whose colab
 * {@link ScopeId} is currently locked. Two participants locking different
 * targets each show their own editor; an unlocked target shows nothing; a
 * locked scope with no matching known target is ignored.
 */
export function EditLockIndicators({
  transform,
  targets,
  className,
  style,
}: EditLockIndicatorsProps): ReactElement {
  const roster = usePresence();
  const { selectors } = useInteraction(EditLock);
  const lockedBy = selectors.lockedBy;

  const locks = useMemo(
    () =>
      targets
        .map((t) => ({
          target: t,
          participantId: lockedBy(targetIdToScopeId(t.targetId)),
        }))
        .filter(
          (l): l is { target: LockTarget; participantId: string } =>
            l.participantId !== null,
        ),
    [targets, lockedBy],
  );

  return (
    <>
      {locks.map(({ target, participantId }) => {
        const { name, color } = identityOf(roster, participantId);
        const mapped = mapGeometry(target.geometry, transform);
        const wrapperStyle: CSSProperties = {
          position: "absolute",
          left: mapped.left,
          top: mapped.top,
          width: mapped.width,
          height: mapped.height,
          outline: `2px solid ${color}`,
          pointerEvents: "none",
          boxSizing: "border-box",
          ...style,
        };
        const badgeStyle: CSSProperties = {
          position: "absolute",
          left: 0,
          top: -18,
          whiteSpace: "nowrap",
          background: color,
          color: "#fff",
          fontSize: 11,
          lineHeight: "18px",
          padding: "0 6px",
          borderRadius: 2,
        };
        return (
          <div
            key={target.targetId}
            data-presence-lock={target.targetId}
            data-presence-lock-by={participantId}
            className={className}
            style={wrapperStyle}
          >
            <span style={badgeStyle}>{name} is editing</span>
          </div>
        );
      })}
    </>
  );
}
