/**
 * Presence overlay primitives — remote cursors and advisory edit-lock badges.
 *
 * PRESENCE / EDIT-LOCKS ONLY (no CRDT/OT, no merge/conflict resolution). These
 * components render the visible presence layer for a host shell, driven by a
 * {@link PresenceProvider} stream. All positions are projected through the
 * SIFR-I-0003 {@link mapGeometry} transform — the SAME coordinate authority the
 * target-box overlays use — so cursors and locks track correctly under iframe
 * scale and scroll. The overlays are intentionally lightly styled; consumers can
 * override via `className`/`style`.
 *
 * Copy is deliberately presence-only ("{name} is editing"): it never claims a
 * merge/conflict-resolution guarantee.
 */

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { mapGeometry, type GeometryTransform } from "../host/mapGeometry.js";
import type { Geometry } from "../protocol/index.js";
import type {
  Participant,
  PresenceProvider,
} from "./PresenceProvider.js";

/* -------------------------------------------------------------------------- */
/* Subscription hook                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Subscribe to a provider's participant stream and return the latest remote
 * participants. Unsubscribes on unmount / provider change.
 */
export function usePresenceParticipants(
  provider: PresenceProvider,
): Participant[] {
  const [participants, setParticipants] = useState<Participant[]>([]);
  useEffect(() => {
    const unsubscribe = provider.subscribe(setParticipants);
    return unsubscribe;
  }, [provider]);
  return participants;
}

/* -------------------------------------------------------------------------- */
/* RemoteCursors                                                              */
/* -------------------------------------------------------------------------- */

export interface RemoteCursorsProps {
  /** The presence provider to subscribe to (defaults to the mock in the demo). */
  provider: PresenceProvider;
  /** The current scale + scroll transform (same one used for target boxes). */
  transform: GeometryTransform;
  /** Optional class name applied to each cursor marker. */
  className?: string;
  /** Optional style merged onto each cursor marker after positioning. */
  style?: CSSProperties;
}

/** Build a zero-size `Geometry` at a pointer so it can pass through `mapGeometry`. */
function pointerGeometry(x: number, y: number): Geometry {
  return {
    top: y,
    left: x,
    right: x,
    bottom: y,
    width: 0,
    height: 0,
    x,
    y,
  };
}

/**
 * Renders one labeled cursor per remote participant that has a `pointer`. Each
 * pointer is projected through {@link mapGeometry} so it lands consistently with
 * the target boxes under scale and scroll. Participants without a pointer (or
 * that have left the list) render nothing.
 */
export function RemoteCursors({
  provider,
  transform,
  className,
  style,
}: RemoteCursorsProps): ReactElement {
  const participants = usePresenceParticipants(provider);

  return (
    <>
      {participants
        .filter((p): p is Participant & { pointer: { x: number; y: number } } =>
          p.pointer !== undefined,
        )
        .map((p) => {
          const mapped = mapGeometry(
            pointerGeometry(p.pointer.x, p.pointer.y),
            transform,
          );
          const markerStyle: CSSProperties = {
            position: "absolute",
            left: mapped.left,
            top: mapped.top,
            pointerEvents: "none",
            ...style,
          };
          const labelStyle: CSSProperties = {
            position: "absolute",
            left: 8,
            top: 0,
            whiteSpace: "nowrap",
            background: p.color,
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
            background: p.color,
          };
          return (
            <div
              key={p.id}
              data-presence-cursor={p.id}
              className={className}
              style={markerStyle}
            >
              <span aria-hidden style={dotStyle} />
              <span data-presence-cursor-label style={labelStyle}>
                {p.name}
              </span>
            </div>
          );
        })}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* EditLockIndicators                                                         */
/* -------------------------------------------------------------------------- */

/** Minimal geometry-bearing shape the lock layer needs per target. */
export interface LockTarget {
  targetId: string;
  geometry: Geometry;
}

export interface EditLockIndicatorsProps {
  /** The presence provider to subscribe to. */
  provider: PresenceProvider;
  /** The current scale + scroll transform. */
  transform: GeometryTransform;
  /**
   * The known targets (id + iframe-space geometry). Typically the mapped
   * targets' source geometry from `useStardustHost`. An `editContext.target`
   * that matches no entry here is ignored (graceful no-op).
   */
  targets: LockTarget[];
  /** Optional class name applied to each lock badge wrapper. */
  className?: string;
  /** Optional style merged onto each lock badge wrapper after positioning. */
  style?: CSSProperties;
}

/**
 * Renders an advisory "{name} is editing" badge anchored to each target that a
 * participant's `editContext` points at. When two participants edit different
 * targets, each target shows its own editor. A target with no editor shows
 * nothing; an `editContext.target` with no matching known target is ignored.
 */
export function EditLockIndicators({
  provider,
  transform,
  targets,
  className,
  style,
}: EditLockIndicatorsProps): ReactElement {
  const participants = usePresenceParticipants(provider);

  const targetsById = useMemo(() => {
    const map = new Map<string, Geometry>();
    for (const t of targets) map.set(t.targetId, t.geometry);
    return map;
  }, [targets]);

  return (
    <>
      {participants
        .filter(
          (p): p is Participant & { editContext: { id: string; target: string } } =>
            p.editContext !== undefined,
        )
        .map((p) => {
          const geometry = targetsById.get(p.editContext.target);
          if (!geometry) return null; // Unknown target: no-op, don't throw.
          const mapped = mapGeometry(geometry, transform);
          const wrapperStyle: CSSProperties = {
            position: "absolute",
            left: mapped.left,
            top: mapped.top,
            width: mapped.width,
            height: mapped.height,
            outline: `2px solid ${p.color}`,
            pointerEvents: "none",
            boxSizing: "border-box",
            ...style,
          };
          const badgeStyle: CSSProperties = {
            position: "absolute",
            left: 0,
            top: -18,
            whiteSpace: "nowrap",
            background: p.color,
            color: "#fff",
            fontSize: 11,
            lineHeight: "18px",
            padding: "0 6px",
            borderRadius: 2,
          };
          return (
            <div
              key={p.id}
              data-presence-lock={p.editContext.target}
              data-presence-lock-by={p.id}
              className={className}
              style={wrapperStyle}
            >
              <span style={badgeStyle}>{p.name} is editing</span>
            </div>
          );
        })}
    </>
  );
}
