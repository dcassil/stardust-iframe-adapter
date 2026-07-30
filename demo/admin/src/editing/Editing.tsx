/**
 * `Editing` — the store-backed editing layer (SIFR-T-0010).
 *
 * Owns the content store binding and selection state, translates every
 * interaction into a structured store operation, and composes the editing UI
 * pieces the shell (`App`) places:
 *
 *  - `operationCallbacks` — `onInsert` / `onMove` / `onSelect`, threaded into
 *    `useStardustHost` (and thus the overlays). Insert/move call `store.apply`;
 *    select updates local selection state.
 *  - `overlays` — the styled overlay layer, rendered inside the scaled canvas.
 *  - `palette` + `panel` — the sidebar (drag-source blocks, field editor).
 *
 * Every applied op flows store → `cms/sendElements` → site re-render → overlay
 * remap (the remap is automatic: the site streams fresh geometry, the host hook
 * re-maps it, the overlays re-render). The UI depends only on the store
 * interface (NFR-003).
 *
 * The store binding needs the live connection state, which lives in
 * `HostContext` — but this component renders ABOVE `HostCanvas` (it supplies the
 * callbacks the canvas consumes). So the store binding is delegated to an inner
 * component mounted inside the canvas, and callbacks/selection are shared via a
 * small context established here.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import type {
  ContentLocation,
  InsertOp,
} from "@stardust-cms/iframe-adapter/host";
import type { StoreOperation, ContentSnapshot } from "@demo/shared/store";
import { Overlays } from "./Overlays";
import { Palette } from "./Palette";
import { SidePanel } from "./SidePanel";
import { StoreBridge } from "./StoreBridge";
import { EditingContext, type EditingContextValue } from "./editing-context";

/** Default value for a newly inserted block, by type. */
function defaultValueFor(type: string): string | undefined {
  switch (type) {
    case "text":
    case "number":
      return "New text block";
    case "image":
      return "https://placehold.co/240x120/6366f1/fff?text=New";
    default:
      return undefined;
  }
}

export interface EditingRenderArgs {
  operationCallbacks: EditingContextValue["operationCallbacks"];
  overlays: ReactNode;
  panel: ReactNode;
  palette: ReactNode;
}

export interface EditingProps {
  render: (args: EditingRenderArgs) => ReactNode;
}

export function Editing({ render }: EditingProps): ReactNode {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ContentSnapshot>([]);

  // `apply` is provided by the StoreBridge (which owns the store hook, since it
  // must live inside HostContext for the sender). We hold it in state so the
  // callbacks below can call it.
  const [applyOp, setApplyOp] = useState<(op: StoreOperation) => void>(
    () => () => {},
  );

  const onInsert = useCallback(
    (targetId: string, index: number, payload: InsertOp["payload"]): void => {
      const value = defaultValueFor(payload.type);
      applyOp({
        kind: "insert",
        targetId,
        index,
        payload: { ...payload, ...(value !== undefined ? { value } : {}) },
      });
    },
    [applyOp],
  );

  const onMove = useCallback(
    (from: ContentLocation, to: ContentLocation): void => {
      applyOp({ kind: "move", from, to });
    },
    [applyOp],
  );

  const onSelect = useCallback((targetId: string, contentId?: string): void => {
    setSelectedTargetId(targetId);
    setSelectedContentId(contentId ?? null);
  }, []);

  const onDeleteItem = useCallback(
    (targetId: string, contentId: string): void => {
      applyOp({ kind: "delete", targetId, contentId });
      setSelectedContentId((cur) => (cur === contentId ? null : cur));
    },
    [applyOp],
  );

  const onEdit = useCallback(
    (targetId: string, contentId: string, value: string): void => {
      applyOp({ kind: "edit", targetId, contentId, patch: { value } });
    },
    [applyOp],
  );

  const operationCallbacks = useMemo(
    () => ({ onInsert, onMove, onSelect }),
    [onInsert, onMove, onSelect],
  );

  const contextValue = useMemo<EditingContextValue>(
    () => ({
      operationCallbacks,
      selectedTargetId,
      selectedContentId,
    }),
    [operationCallbacks, selectedTargetId, selectedContentId],
  );

  const overlays = (
    <>
      {/* StoreBridge lives inside the canvas (HostContext) and wires the store
          hook + snapshot back up to this layer. */}
      <StoreBridge onApplyReady={setApplyOp} onSnapshot={setSnapshot} />
      <Overlays
        selectedContentId={selectedContentId}
        selectedTargetId={selectedTargetId}
        onDeleteItem={onDeleteItem}
      />
    </>
  );

  const palette = <Palette />;
  const panel = (
    <SidePanel
      snapshot={snapshot}
      selectedTargetId={selectedTargetId}
      selectedContentId={selectedContentId}
      onEdit={onEdit}
    />
  );

  return (
    <EditingContext.Provider value={contextValue}>
      {render({ operationCallbacks, overlays, panel, palette })}
    </EditingContext.Provider>
  );
}
