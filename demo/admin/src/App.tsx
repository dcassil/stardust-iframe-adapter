/**
 * Demo admin (host) root — rebuilt on `@stardust-cms/dashboard`'s `HostShell`.
 *
 * The hand-rolled host stack (FrameLinkProvider + HostCanvas + Editing +
 * StoreBridge + Overlays + useContentStore + useSendElements + Palette +
 * SidePanel) is gone. `HostShell` now OWNS the transport, the store injection,
 * the geometry canvas, and the ops → store → `cms/sendElements` pipeline. This
 * file just:
 *
 *  1. constructs the VCE-backed {@link VceContentStoreAdapter} once (seeded from
 *     the shared demo content model),
 *  2. hands it to `HostShell` together with the demo's `text`/`image`
 *     {@link DEMO_BLOCK_TYPES} registry and the explicit iframe origin (never `*`),
 *  3. supplies `renderOverlayChrome` — the bundled {@link Overlays} — which also
 *     mirrors the shell's tracked selection into local state, since the shell
 *     hands selection only to `renderOverlayChrome` and not to the side panel, and
 *  4. arranges the canvas beside a sidebar (palette / side panel / versioning
 *     controls) via `renderLayout`.
 *
 * The palette / side panel live in the sidebar (rendered by `renderLayout`), NOT
 * as overlay-layer `children`, so they are not double-rendered over the canvas —
 * `children` is intentionally omitted.
 */

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  HostShell,
  Overlays,
  Palette,
  type OverlayChromeParts,
  type HostShellLayoutParts,
} from "@stardust-cms/dashboard";
import { createDemoContentStore } from "@demo/shared/store";
import { DEMO_BLOCK_TYPES } from "./blockTypes";
import { VersionControls } from "./VersionControls";
import { EditPanel } from "./EditPanel";
import { StylePanel } from "./StylePanel";
import { HostBridgeContext, type Reinject } from "./host-bridge";
import { SITE_ORIGIN, DESIGN_WIDTH, DESIGN_HEIGHT } from "./config";
import { PRESENCE_ENABLED } from "./presence/config";
import { usePresenceSession } from "./presence/usePresenceSession";
import { PresenceOverlays } from "./presence/PresenceOverlays";
import { PresenceIndicator } from "./presence/PresenceIndicator";

/** The admin's tracked selection, mirrored from the shell's overlay chrome. */
interface Selection {
  targetId: string | null;
  contentId: string | null;
}

export function App(): ReactNode {
  // Construct the store exactly once (a fresh instance would reset the seed +
  // version history on every render).
  const store = useMemo(() => createDemoContentStore(), []);
  const [selection, setSelection] = useState<Selection>({
    targetId: null,
    contentId: null,
  });
  // The shell's `onSelect` callback captured from `renderOverlayChrome` — the
  // only place the shell exposes a dispatch path. Re-selecting an item through it
  // triggers the shell's `cms/sendElements` re-injection, which is how side-panel
  // field edits reach the iframe.
  const reinjectRef = useRef<Reinject>(() => {});

  // Server-less presence session (BroadcastChannel), gated by the build flag.
  // When the flag is off `provider` is null and nothing presence-related mounts.
  const presenceProvider = usePresenceSession(PRESENCE_ENABLED, selection);

  const renderOverlayChrome = (parts: OverlayChromeParts): ReactNode => {
    reinjectRef.current = parts.callbacks.onSelect ?? (() => {});
    // Mirror the shell's tracked selection into our context so the side panel
    // (in the sidebar) can read it. Guarded by an equality check so the
    // render-phase setState does not loop.
    if (
      parts.selectedTargetId !== selection.targetId ||
      parts.selectedContentId !== selection.contentId
    ) {
      setSelection({
        targetId: parts.selectedTargetId,
        contentId: parts.selectedContentId,
      });
    }
    return (
      <>
        <Overlays
          targets={parts.targets}
          callbacks={parts.callbacks}
          selectedTargetId={parts.selectedTargetId}
          selectedContentId={parts.selectedContentId}
        />
        {presenceProvider && (
          <PresenceOverlays
            provider={presenceProvider}
            targets={parts.targets}
          />
        )}
      </>
    );
  };

  // Stable bridge: delegates to whatever `onSelect` the shell most recently
  // exposed (kept in the ref), so children get a stable function identity.
  const reinject = useMemo<Reinject>(
    () => (targetId, contentId) => reinjectRef.current(targetId, contentId),
    [],
  );

  const renderLayout = ({ canvas, status }: HostShellLayoutParts): ReactNode => (
    <HostBridgeContext.Provider value={reinject}>
      <div className="admin-layout">
        <div className="admin-main">
          {status}
          {canvas}
        </div>
        <aside className="admin-sidebar">
          <Palette blockTypes={DEMO_BLOCK_TYPES} />
          <EditPanel
            blockTypes={DEMO_BLOCK_TYPES}
            selectedTargetId={selection.targetId}
            selectedContentId={selection.contentId}
          />
          <StylePanel
            selectedTargetId={selection.targetId}
            selectedContentId={selection.contentId}
          />
          {presenceProvider && (
            <PresenceIndicator provider={presenceProvider} />
          )}
          <VersionControls />
        </aside>
      </div>
    </HostBridgeContext.Provider>
  );

  return (
    <div className="admin-root">
      <HostShell
        store={store}
        blockTypes={DEMO_BLOCK_TYPES}
        iframeOrigin={SITE_ORIGIN}
        designWidth={DESIGN_WIDTH}
        designHeight={DESIGN_HEIGHT}
        renderOverlayChrome={renderOverlayChrome}
        renderLayout={renderLayout}
      />
    </div>
  );
}
