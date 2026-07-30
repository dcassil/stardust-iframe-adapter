/**
 * `Editing` — the editing-layer seam.
 *
 * SIFR-T-0008 ships this as a thin seam: it owns the content store and the
 * operation callbacks, and hands the shell (`App`) the pieces it composes —
 * `overlays` (rendered inside the scaled canvas), `panel` and `palette`
 * (rendered in the sidebar), and `operationCallbacks` (threaded into
 * `useStardustHost`).
 *
 * SIFR-T-0010 fills in the real overlays, palette, and side panel here. Keeping
 * this seam stable means the shell (`App` / `HostCanvas` / `ConnectionStatus`)
 * does not change when the editing UI lands.
 */

import type { ReactNode } from "react";
import type { OperationCallbacks } from "@stardust-cms/iframe-adapter/host";

export interface EditingRenderArgs {
  operationCallbacks: OperationCallbacks;
  overlays: ReactNode;
  panel: ReactNode;
  palette: ReactNode;
}

export interface EditingProps {
  render: (args: EditingRenderArgs) => ReactNode;
}

/**
 * SIFR-T-0008 placeholder implementation: no operation callbacks and empty
 * editing UI. The shell still connects, shows status, and exposes geometry via
 * `HostContext`. SIFR-T-0010 replaces this body with the store-backed editing
 * layer.
 */
export function Editing({ render }: EditingProps): ReactNode {
  return render({
    operationCallbacks: {},
    overlays: null,
    panel: null,
    palette: null,
  });
}
