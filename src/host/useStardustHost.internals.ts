/**
 * Internal building blocks for {@link useStardustHost} (its sibling entry-point
 * module). Split out purely to keep each module within the size budget; these
 * are not part of the public `./host` surface. The public types
 * {@link MappedChild} / {@link MappedTarget} are re-exported from
 * `useStardustHost.ts`.
 */

import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHandler } from "frame-link-react";
import type {
  ContentTarget,
  ChildContent,
  PointerState,
} from "../protocol/registry.js";
import { mapGeometry, type MappedGeometry } from "./mapGeometry.js";
import type { StardustFrameLinkRegistry } from "./registry.js";

type HostRegistry = StardustFrameLinkRegistry;

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

/** Snapshot of the scroll offset in iframe (unscaled) coordinates. */
export interface ScrollOffset {
  x: number;
  y: number;
}

/**
 * Track the iframe render scale (container width / document width) via a
 * ResizeObserver, mirroring the prototype's `useFrame.tsx`. Updates only when
 * both widths are positive.
 */
export function useIframeScale(
  iframeRef: RefObject<HTMLIFrameElement | null>,
): number {
  const [scale, setScale] = useState(1);

  useEffect((): (() => void) | undefined => {
    const iframe = iframeRef.current;
    if (!iframe || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    // The container is the iframe's offset parent (its host-side wrapper); fall
    // back to the iframe box itself.
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

  return scale;
}

/** Raw iframe-space geometry streamed from the iframe. */
export interface StreamedGeometry {
  rawTargets: ContentTarget[];
  scrollOffset: ScrollOffset;
  setRawTargets: (targets: ContentTarget[]) => void;
}

/**
 * Subscribe to the iframe's streamed target-position and scroll messages.
 * Scroll commits are coalesced to at most one React state update per animation
 * frame (or microtask when rAF is unavailable, e.g. jsdom) per NFR-003.
 */
export function useStreamedGeometry(headerOffset: number): StreamedGeometry {
  const [rawTargets, setRawTargets] = useState<ContentTarget[]>([]);
  const [scrollOffset, setScrollOffset] = useState<ScrollOffset>({ x: 0, y: 0 });

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
        pendingScrollRef.current = { x: scroll.h, y: scroll.y + headerOffset };
        scheduleScrollFlush();
      },
      [headerOffset, scheduleScrollFlush],
    ),
  );

  return { rawTargets, scrollOffset, setRawTargets };
}

/**
 * The latest iframe pointer position as normalized `0..1` coordinates, or `null`
 * when the pointer is not over the iframe. This is the transform-neutral value
 * the iframe streamed; the host/consumer maps it into its own scaled stage box.
 */
export type HostPointer = { x: number; y: number } | null;

/**
 * Subscribe to the iframe's streamed pointer messages (`cms/pointer`,
 * SIFR-I-0007) and expose the latest normalized position. A `PointerState` with
 * `inside: false` (pointer left the iframe / iframe blurred) resolves to `null`.
 * Pointer commits are coalesced to at most one React state update per animation
 * frame (microtask fallback for jsdom), matching the scroll-stream discipline.
 */
export function useStreamedPointer(): HostPointer {
  const [pointer, setPointer] = useState<HostPointer>(null);

  const pendingRef = useRef<{ value: HostPointer } | null>(null);
  const flushScheduledRef = useRef(false);

  const scheduleFlush = useCallback((): void => {
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    const flush = (): void => {
      flushScheduledRef.current = false;
      const next = pendingRef.current;
      pendingRef.current = null;
      if (next) setPointer(next.value);
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(flush);
    } else {
      queueMicrotask(flush);
    }
  }, []);

  useHandler<HostRegistry, "cms/pointer">(
    "cms/pointer",
    useCallback(
      (state: PointerState): void => {
        pendingRef.current = {
          value: state.inside ? { x: state.x, y: state.y } : null,
        };
        scheduleFlush();
      },
      [scheduleFlush],
    ),
  );

  return pointer;
}

/** Project raw iframe-space targets into host-viewport coordinates. */
export function mapTargets(
  rawTargets: ContentTarget[],
  transform: { scale: number; scrollOffset: ScrollOffset },
): MappedTarget[] {
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
}

/** Inputs to {@link useConnectionLifecycle}, grouped to stay within max-params. */
export interface ConnectionLifecycle {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  origin: string;
  connect: (target: Window) => Promise<unknown>;
  requestPositions: () => Promise<ContentTarget[]>;
  setRawTargets: (targets: ContentTarget[]) => void;
}

/**
 * Connect to the iframe and request the initial target positions once the
 * iframe's content window is available. Re-runs when the connection identity or
 * origin changes. Uses an `AbortController` so a teardown that races the async
 * handshake is observed after each `await`.
 */
export function useConnectionLifecycle(deps: ConnectionLifecycle): void {
  const { iframeRef, origin, connect, requestPositions, setRawTargets } = deps;
  useEffect((): (() => void) | undefined => {
    const target = iframeRef.current?.contentWindow;
    if (!target) {
      return undefined;
    }
    const controller = new AbortController();
    // Read through a function so control-flow analysis does not narrow the
    // result across the `await`s — the flag can flip during the handshake.
    const isAborted = (): boolean => controller.signal.aborted;

    void (async (): Promise<void> => {
      try {
        await connect(target);
        if (isAborted()) {
          return;
        }
        const targets = await requestPositions();
        if (!isAborted()) {
          setRawTargets(targets);
        }
      } catch {
        // Connection/handshake errors surface through `useConnection().error`,
        // which is folded into `connectionState` by the caller.
      }
    })();

    return (): void => {
      controller.abort();
    };
  }, [iframeRef, origin, connect, requestPositions, setRawTargets]);
}
