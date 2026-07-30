/**
 * `PresenceLayer` — mounts the presence overlays and publishes the local
 * session's pointer + edit-context into a `MockPresenceProvider`.
 *
 * PRESENCE / EDIT-LOCKS ONLY — no CRDT/OT, no collaborative editing. This whole
 * component is mounted ONLY when the presence flag is enabled (see
 * `presence-config.ts`); the disabled path never renders it and never imports
 * the optional Socket.IO adapter.
 *
 * Coordinate model: the admin overlay layer already lives in the SCALED canvas
 * coordinate space (mapGeometry has applied `scale`). We therefore publish the
 * local pointer in that same canvas space and render remote cursors/locks with
 * an identity transform, so every session's cursors and lock boxes line up with
 * the target overlays regardless of who is scaled how — reusing the SIFR-I-0003
 * geometry that produced the mapped targets rather than re-deriving scale math.
 */

import { useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  MockPresenceProvider,
  RemoteCursors,
  EditLockIndicators,
  type LockTarget,
} from "@stardust-cms/iframe-adapter/presence";
import type { GeometryTransform } from "@stardust-cms/iframe-adapter/host";
import { useHost } from "../host-context";
import { EditingContext } from "./editing-context";
import {
  PRESENCE_CHANNEL,
  makeLocalIdentity,
} from "./presence-config";

/** Identity transform: coordinates are already in canvas space. */
const IDENTITY: GeometryTransform = { scale: 1, scrollOffset: { x: 0, y: 0 } };

/** Build a zero-size lock target from an already-mapped canvas-space box. */
function lockTargetFrom(
  targetId: string,
  box: { top: number; left: number; width: number; height: number },
): LockTarget {
  return {
    targetId,
    geometry: {
      top: box.top,
      left: box.left,
      right: box.left + box.width,
      bottom: box.top + box.height,
      width: box.width,
      height: box.height,
      x: box.left,
      y: box.top,
    },
  };
}

export function PresenceLayer(): ReactNode {
  const { targets } = useHost();
  const editing = useContext(EditingContext);
  const selectedTargetId = editing?.selectedTargetId ?? null;
  const selectedContentId = editing?.selectedContentId ?? null;

  // One provider per mount (per tab). Connected on mount, disconnected on
  // unmount. Kept off the render path via a ref-stable memo.
  const provider = useMemo(
    () =>
      new MockPresenceProvider({
        channelName: PRESENCE_CHANNEL,
        self: makeLocalIdentity(),
      }),
    [],
  );

  useEffect(() => {
    provider.connect();
    return () => provider.disconnect();
  }, [provider]);

  // Publish the local edit-context whenever the selection changes; publish null
  // on deselect. NOT throttled (the adapter sends it promptly).
  useEffect(() => {
    if (selectedTargetId) {
      provider.publishEditContext({
        id: selectedContentId ?? selectedTargetId,
        target: selectedTargetId,
      });
    } else {
      provider.publishEditContext(null);
    }
  }, [provider, selectedTargetId, selectedContentId]);

  // Publish local pointer moves in canvas space. We attach a document-level
  // `pointermove` listener (rather than an element handler) so the presence
  // layer can stay `pointer-events: none` and never steal clicks from the
  // editing overlays below it. Coordinates are translated relative to the
  // layer's top-left, i.e. the same canvas space `mapGeometry` produces.
  const layerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onMove = (event: PointerEvent): void => {
      const rect = layerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      // Only publish while the pointer is over the canvas area.
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      provider.publishPointer({ x, y });
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, [provider]);

  const lockTargets = useMemo<LockTarget[]>(
    () => targets.map((t) => lockTargetFrom(t.targetId, t.geometry)),
    [targets],
  );

  return (
    <div
      ref={layerRef}
      className="presence-layer"
      data-presence-layer
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <RemoteCursors provider={provider} transform={IDENTITY} />
      <EditLockIndicators
        provider={provider}
        transform={IDENTITY}
        targets={lockTargets}
      />
    </div>
  );
}
