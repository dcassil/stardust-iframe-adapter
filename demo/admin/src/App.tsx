/**
 * Demo admin (host) root.
 *
 * Wires the host-side stack:
 *
 *  1. `FrameLinkProvider` — owns the frame-link transport with `targetOrigin`
 *     set to the embedded site's explicit origin (never `*`, NFR-002).
 *  2. `HostCanvas` — the scaled iframe + `useStardustHost` connection + geometry
 *     plumbing, publishing everything through `HostContext`.
 *  3. `ConnectionStatus` — the lifecycle strip (connecting / connected / error).
 *
 * The overlay + side-panel editing layer (SIFR-T-0010) is mounted inside the
 * canvas as `children` and to the side as the panel; this shell provides the
 * connection + geometry surface it consumes via `useHost()`.
 */

import type { ReactNode } from "react";
import { FrameLinkProvider } from "frame-link-react";
import { HostCanvas } from "./HostCanvas";
import { ConnectionStatus } from "./ConnectionStatus";
import { Editing } from "./editing/Editing";
import { SITE_ORIGIN, FRAME_LINK_OPTIONS } from "./config";

export function App(): ReactNode {
  return (
    <FrameLinkProvider options={FRAME_LINK_OPTIONS}>
      <div className="admin-root">
        <Editing
          render={({ operationCallbacks, overlays, panel, palette }) => (
            <div className="admin-layout">
              <div className="admin-main">
                <HostCanvas
                  operationCallbacks={operationCallbacks}
                  renderStatus={(state, scale) => (
                    <ConnectionStatus
                      state={state}
                      scale={scale}
                      siteOrigin={SITE_ORIGIN}
                    />
                  )}
                >
                  {overlays}
                </HostCanvas>
              </div>
              <aside className="admin-sidebar">
                {palette}
                {panel}
              </aside>
            </div>
          )}
        />
      </div>
    </FrameLinkProvider>
  );
}
