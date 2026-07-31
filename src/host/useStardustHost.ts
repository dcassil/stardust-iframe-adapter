/**
 * `useStardustHost` — the host-side entry-point hook.
 *
 * It owns the frame-link connection to the iframe, requests the initial target
 * positions, subscribes to streamed position/scroll updates, tracks the iframe
 * render scale, and returns targets already mapped into host-viewport
 * coordinates (via `mapGeometry`, the single coordinate authority).
 *
 * This is the decoupled successor to the prototype's `useCMSTarget.tsx`
 * (`targetPositions` + `cms_positions` listener + `get_cms_positions` request)
 * and the scale/scroll ownership of `useFrame.tsx` — but with **zero** Stardust
 * legacy contexts (`UIContext`/`ContentContext`/`PagesContext`). All edit intent
 * leaves through the `onInsert` / `onMove` / `onSelect` callbacks (NFR-002).
 *
 * Must be used inside a `frame-link-react` `FrameLinkProvider` configured with
 * `options.targetOrigin` set to the same explicit origin passed here (never
 * `"*"`) — the provider owns the frame-link instance; this hook drives it.
 *
 * Internal building blocks live in `useStardustHost.internals.ts` (split out to
 * respect the module size budget; not part of the public surface).
 */

import type { RefObject } from "react";
import { useMemo } from "react";
import { useConnection, useSend } from "frame-link-react";
import type {
  ConnectionState,
  OperationCallbacks,
} from "./operations.js";
import type { StardustFrameLinkRegistry } from "./registry.js";
import {
  mapTargets,
  useConnectionLifecycle,
  useIframeScale,
  useStreamedGeometry,
  type MappedChild,
  type MappedTarget,
} from "./useStardustHost.internals.js";

export type { MappedChild, MappedTarget };

type HostRegistry = StardustFrameLinkRegistry;

/**
 * Options for {@link useStardustHost}. Extends {@link OperationCallbacks} so the
 * consumer can register edit-intent callbacks on the hook; the same callbacks
 * are returned (as `callbacks`) for convenient threading to the overlays.
 */
export interface UseStardustHostOptions extends OperationCallbacks {
  /**
   * The explicit iframe origin. Must not be `"*"`; passing `"*"` throws. This is
   * asserted here and expected to match the `FrameLinkProvider`'s
   * `targetOrigin`.
   */
  origin: string;
  /**
   * Optional fixed vertical offset (in iframe/unscaled px) folded into the
   * projection — the explicit, documented successor to the prototype's baked-in
   * `-40` header offset. Defaults to `0`.
   */
  headerOffset?: number;
}

/** The value returned by {@link useStardustHost}. */
export interface UseStardustHostResult {
  /** Targets mapped into host-viewport coordinates, ready for the overlays. */
  targets: MappedTarget[];
  /** Current iframe render scale (container width / document width). */
  scale: number;
  /** Connection lifecycle state. */
  connectionState: ConnectionState;
  /**
   * The edit-intent callbacks passed in `options`, bundled for convenient
   * spreading onto the overlay primitives (`<TargetAreaOverlay {...callbacks} />`).
   */
  callbacks: OperationCallbacks;
}

/**
 * Establish and drive the host-side frame-link connection for an iframe, and
 * return its targets mapped into host coordinates.
 */
export function useStardustHost(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  options: UseStardustHostOptions,
): UseStardustHostResult {
  const { origin, headerOffset = 0 } = options;

  if (origin === "*") {
    throw new Error(
      'useStardustHost: `origin` must be an explicit origin, never "*".',
    );
  }

  const { connect, connected, connecting, error } = useConnection();
  const requestPositions = useSend<HostRegistry, "cms/requestTargetPositions">(
    "cms/requestTargetPositions",
  );

  // Raw (iframe-space) geometry + derived scale. Mapping is computed, not stored.
  const scale = useIframeScale(iframeRef);
  const { rawTargets, scrollOffset, setRawTargets } =
    useStreamedGeometry(headerOffset);

  useConnectionLifecycle({
    iframeRef,
    origin,
    connect,
    requestPositions,
    setRawTargets,
  });

  // Derive mapped targets in a single pass over a consistent snapshot.
  const targets = useMemo(
    (): MappedTarget[] => mapTargets(rawTargets, { scale, scrollOffset }),
    [rawTargets, scale, scrollOffset],
  );

  const connectionState: ConnectionState = error
    ? "error"
    : connected
      ? "connected"
      : connecting
        ? "connecting"
        : "disconnected";

  const callbacks = useMemo<OperationCallbacks>(() => {
    // Read the current option callbacks DIRECTLY (not `optionsRef.current`,
    // which lags one render because it's committed in an effect). Reading the
    // deps directly keeps the bundle in lock-step with the caller's callback
    // identities, so a no-op → real handler swap is reflected immediately.
    return {
      ...(options.onInsert ? { onInsert: options.onInsert } : {}),
      ...(options.onMove ? { onMove: options.onMove } : {}),
      ...(options.onSelect ? { onSelect: options.onSelect } : {}),
    };
    // Re-bundle when the identity of any callback changes.
  }, [options.onInsert, options.onMove, options.onSelect]);

  return { targets, scale, connectionState, callbacks };
}
