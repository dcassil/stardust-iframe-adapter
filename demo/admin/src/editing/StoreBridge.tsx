/**
 * `StoreBridge` — mounts the content-store binding inside `HostContext`.
 *
 * The store hook (`useContentStore`) needs the `cms/sendElements` sender and the
 * live connection state, both of which are only available inside `HostCanvas`
 * (which provides `HostContext` and the `FrameLinkProvider` scope). But the
 * editing layer that owns selection/apply renders ABOVE the canvas. This tiny
 * bridge lives inside the canvas, runs the store hook, and lifts `apply` +
 * `snapshot` back up to the editing layer via callbacks.
 *
 * It renders nothing.
 */

import { useEffect, type ReactNode } from "react";
import type { ContentSnapshot, StoreOperation } from "@demo/shared/store";
import { useHost } from "../host-context";
import { useContentStore } from "./useContentStore";

export interface StoreBridgeProps {
  onApplyReady: (apply: () => (op: StoreOperation) => void) => void;
  onSnapshot: (snapshot: ContentSnapshot) => void;
}

export function StoreBridge({
  onApplyReady,
  onSnapshot,
}: StoreBridgeProps): ReactNode {
  const { connectionState } = useHost();
  const connected = connectionState === "connected";
  const { snapshot, apply } = useContentStore(connected);

  // Hand `apply` up. `setState(fn)` treats a bare function as an updater, so we
  // pass a thunk that returns the stable `apply`.
  useEffect((): void => {
    onApplyReady(() => apply);
  }, [apply, onApplyReady]);

  // Mirror the snapshot up for the side panel.
  useEffect((): void => {
    onSnapshot(snapshot);
  }, [snapshot, onSnapshot]);

  return null;
}
