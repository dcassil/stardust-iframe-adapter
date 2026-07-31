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
 */

import type { RefObject } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useConnection,
  useHandler,
  useSend,
} from "frame-link-react";
import type { ContentTarget, ChildContent } from "../protocol/index.js";
import { mapGeometry, type MappedGeometry } from "./mapGeometry.js";
import type {
  ConnectionState,
  OperationCallbacks,
} from "./operations.js";
import type { StardustFrameLinkRegistry } from "./registry.js";

/** A content item with its geometry projected into host coordinates. */
export interface MappedChild {
  contentId: string;
  index: number;
  isContainer: boolean;
  styleGroup: string;
  geometry: MappedGeometry;
}

/** A target with its geometry (and its children's) mapped to host coordinates. */
export interface MappedTarget {
  targetId: string;
  isContainer: boolean;
  geometry: MappedGeometry;
  children: MappedChild[];
}

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

type HostRegistry = StardustFrameLinkRegistry;

/** Snapshot of the scroll offset in iframe (unscaled) coordinates. */
interface ScrollOffset {
  x: number;
  y: number;
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

  // Raw (iframe-space) state. Coordinate mapping is derived, not stored.
  const [rawTargets, setRawTargets] = useState<ContentTarget[]>([]);
  const [scrollOffset, setScrollOffset] = useState<ScrollOffset>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  /* ---------------------------------------------------------------------- */
  /* Coalesced scroll commits (NFR-003)                                     */
  /* ---------------------------------------------------------------------- */

  // Latest pending scroll, plus a scheduled-flush guard. Rapid scroll messages
  // update the ref synchronously but commit to React state at most once per
  // animation frame (or microtask, when rAF is unavailable — e.g. jsdom).
  const pendingScrollRef = useRef<ScrollOffset | null>(null);
  const flushScheduledRef = useRef(false);

  const scheduleScrollFlush = useCallback((): void => {
    if (flushScheduledRef.current) {
      return;
    }
    flushScheduledRef.current = true;

    const flush = (): void => {
      flushScheduledRef.current = false;
      const next = pendingScrollRef.current;
      pendingScrollRef.current = null;
      if (next !== null) {
        setScrollOffset(next);
      }
    };

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(flush);
    } else {
      queueMicrotask(flush);
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Streamed message subscriptions                                          */
  /* ---------------------------------------------------------------------- */

  // iframe → host: fresh target/content geometry.
  useHandler<HostRegistry, "cms/sendElementPositions">(
    "cms/sendElementPositions",
    useCallback((targets: ContentTarget[]): void => {
      setRawTargets(targets);
    }, []),
  );

  // iframe → host: scroll state. `h` carries scrollX (see protocol note).
  useHandler<HostRegistry, "cms/sendScrollPositions">(
    "cms/sendScrollPositions",
    useCallback(
      (scroll: { h: number; y: number }): void => {
        pendingScrollRef.current = {
          x: scroll.h,
          y: scroll.y + headerOffset,
        };
        scheduleScrollFlush();
      },
      [headerOffset, scheduleScrollFlush],
    ),
  );

  /* ---------------------------------------------------------------------- */
  /* Connection lifecycle + initial position request                         */
  /* ---------------------------------------------------------------------- */

  useEffect((): (() => void) | undefined => {
    const target = iframeRef.current?.contentWindow;
    if (!target) {
      return undefined;
    }

    let cancelled = false;

    void (async (): Promise<void> => {
      try {
        await connect(target);
        if (cancelled) {
          return;
        }
        const targets = await requestPositions();
        if (!cancelled && targets) {
          setRawTargets(targets);
        }
      } catch {
        // Connection/handshake errors surface through `useConnection().error`,
        // which is folded into `connectionState` below.
      }
    })();

    return (): void => {
      cancelled = true;
    };
  }, [iframeRef, origin, connect, requestPositions]);

  /* ---------------------------------------------------------------------- */
  /* Scale tracking via ResizeObserver (REQ-006)                             */
  /* ---------------------------------------------------------------------- */

  useEffect((): (() => void) | undefined => {
    const iframe = iframeRef.current;
    if (!iframe || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    // scale = container (on-screen) width / document (iframe content) width,
    // mirroring `useFrame.tsx`. The container is the iframe's offset parent
    // (its host-side wrapper); fall back to the iframe box itself.
    const container = iframe.parentElement ?? iframe;

    const recompute = (): void => {
      const documentWidth = iframe.offsetWidth;
      const containerWidth = container.getBoundingClientRect().width;
      if (documentWidth > 0 && containerWidth > 0) {
        setScale(containerWidth / documentWidth);
      }
    };

    const observer = new ResizeObserver(recompute);
    observer.observe(iframe);
    if (container !== iframe) {
      observer.observe(container);
    }
    recompute();

    return (): void => {
      observer.disconnect();
    };
  }, [iframeRef]);

  /* ---------------------------------------------------------------------- */
  /* Derive mapped targets (single map pass over a consistent snapshot)      */
  /* ---------------------------------------------------------------------- */

  const targets = useMemo((): MappedTarget[] => {
    const transform = { scale, scrollOffset };
    return rawTargets.map((target): MappedTarget => ({
      targetId: target.targetId,
      isContainer: target.isContainer,
      geometry: mapGeometry(target.geometry, transform),
      children: target.children.map((child: ChildContent): MappedChild => ({
        contentId: child.contentId,
        index: child.index,
        isContainer: child.isContainer,
        styleGroup: child.styleGroup,
        geometry: mapGeometry(child.geometry, transform),
      })),
    }));
  }, [rawTargets, scale, scrollOffset]);

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
