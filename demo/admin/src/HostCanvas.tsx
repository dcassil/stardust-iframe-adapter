/**
 * `HostCanvas` — the scaled iframe canvas + host connection (SIFR-T-0008).
 *
 * Successor to the prototype `IFrame.tsx`. It:
 *
 *  - renders the preview `<iframe>` pointing at the demo-site origin (explicit,
 *    never `*`);
 *  - mounts `useStardustHost(iframeRef, { origin, headerOffset, ...callbacks })`,
 *    which owns the frame-link handshake, position request, geometry/scroll
 *    streaming, and scale tracking;
 *  - lays the iframe out at the unscaled `designWidth` and applies
 *    `transform: scale(scale)` (the successor to `IFrame.tsx`'s
 *    `transform: scale(...)`), where `scale` is the hook-derived
 *    container-width / design-width ratio — so overlays mapped through
 *    `mapGeometry` (which multiplies by the same scale) land exactly over the
 *    visually-scaled iframe;
 *  - publishes the host result through {@link HostContext} for the overlay/panel
 *    layer (SIFR-T-0010) to consume.
 *
 * The overlay layer is passed as `children` and is rendered absolutely over the
 * (already scaled) canvas coordinate space. This task ships the shell; T-0010
 * supplies the overlays and the operation callbacks.
 */

import { useRef, type ReactNode } from "react";
import { useStardustHost } from "@stardust-cms/iframe-adapter/host";
import type { OperationCallbacks } from "@stardust-cms/iframe-adapter/host";
import { HostContext, type HostContextValue } from "./host-context";
import { SITE_ORIGIN, SITE_URL, DESIGN_WIDTH, DESIGN_HEIGHT } from "./config";

export interface HostCanvasProps {
  /** Edit-intent callbacks supplied by the editing layer (SIFR-T-0010). */
  operationCallbacks?: OperationCallbacks;
  /** Overlay layer rendered over the scaled canvas. */
  children?: ReactNode;
  /**
   * Render prop for the status strip, given the live connection state + scale,
   * so the shell can place it wherever it likes (outside the scaled canvas).
   */
  renderStatus?: (state: HostContextValue["connectionState"], scale: number) => ReactNode;
}

export function HostCanvas({
  operationCallbacks,
  children,
  renderStatus,
}: HostCanvasProps): ReactNode {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { targets, scale, connectionState, callbacks } = useStardustHost(
    iframeRef,
    {
      origin: SITE_ORIGIN,
      ...(operationCallbacks?.onInsert ? { onInsert: operationCallbacks.onInsert } : {}),
      ...(operationCallbacks?.onMove ? { onMove: operationCallbacks.onMove } : {}),
      ...(operationCallbacks?.onSelect ? { onSelect: operationCallbacks.onSelect } : {}),
    },
  );

  const contextValue: HostContextValue = {
    targets,
    scale,
    connectionState,
    callbacks,
    designWidth: DESIGN_WIDTH,
  };

  // The canvas width is CSS-driven (the available column width); the hook
  // derives `scale` from that width / designWidth. We only need to reserve the
  // matching scaled *height* so the scaled iframe box has room and the overlay
  // layer (which shares the canvas top-left origin) lines up.
  const scaledHeight = DESIGN_HEIGHT * scale;

  return (
    <HostContext.Provider value={contextValue}>
      {renderStatus?.(connectionState, scale)}
      <div className="admin-canvas-scroll">
        <div
          className="admin-canvas"
          style={{ height: scaledHeight }}
          data-connection-state={connectionState}
        >
          <iframe
            ref={iframeRef}
            className="admin-canvas__iframe"
            title="Demo site preview"
            src={SITE_URL}
            style={{
              width: DESIGN_WIDTH,
              height: DESIGN_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
          {/* Overlay layer: absolutely positioned over the scaled canvas,
              sharing the canvas top-left origin. mapGeometry has already
              applied `scale`, so no further transform is needed here. */}
          <div className="admin-overlay-layer">{children}</div>
        </div>
      </div>
    </HostContext.Provider>
  );
}
