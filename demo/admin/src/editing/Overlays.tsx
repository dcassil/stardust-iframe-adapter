/**
 * Styled overlay layer (SIFR-T-0010).
 *
 * Wraps the intentionally-unstyled SIFR-I-0003 primitives:
 *
 *  - `TargetAreaOverlay` — one per mapped target; styled as a dashed drop area
 *    that accepts palette drags (→ insert op) and item moves (→ move op). The
 *    library computes the drop index and dispatches the op through the passed
 *    callbacks.
 *  - `ContentItemOverlay` — one per container child, styled as a selectable box.
 *
 * On top of the primitives we add demo chrome the library deliberately omits:
 * a hover/selected outline (via CSS + the `selected` class) and a small delete
 * affordance per item. All geometry comes from `useHost()` (already mapped by
 * `mapGeometry`); nothing is recomputed here.
 */

import type { ReactNode } from "react";
import {
  TargetAreaOverlay,
  ContentItemOverlay,
} from "@stardust-cms/iframe-adapter/host";
import type { MappedChild, MappedTarget } from "@stardust-cms/iframe-adapter/host";
import { useHost } from "../host-context";

export interface OverlaysProps {
  selectedContentId: string | null;
  selectedTargetId: string | null;
  onDeleteItem: (targetId: string, contentId: string) => void;
}

function DeleteButton({
  child,
  targetId,
  onDelete,
}: {
  child: MappedChild;
  targetId: string;
  onDelete: (targetId: string, contentId: string) => void;
}): ReactNode {
  const { geometry } = child;
  return (
    <button
      type="button"
      className="ov-delete"
      title="Delete block"
      style={{ top: geometry.top + 4, left: geometry.left + geometry.width - 26 }}
      onClick={(e) => {
        e.stopPropagation();
        onDelete(targetId, child.contentId);
      }}
    >
      ×
    </button>
  );
}

export function Overlays({
  selectedContentId,
  selectedTargetId,
  onDeleteItem,
}: OverlaysProps): ReactNode {
  const { targets, callbacks } = useHost();

  return (
    <>
      {targets.map((target: MappedTarget) => {
        const targetSelected =
          selectedTargetId === target.targetId && selectedContentId === null;
        return (
          <div key={target.targetId} className="ov-group">
            <TargetAreaOverlay
              target={target}
              {...callbacks}
              className={`ov-target${targetSelected ? " ov-target--selected" : ""}${
                target.isContainer ? " ov-target--container" : ""
              }`}
              itemClassName="ov-item-hit"
            />
            {/* Selection ring + delete chrome per child, layered above. */}
            {target.children.map((child) => {
              const isSel = child.contentId === selectedContentId;
              return (
                <div key={`chrome-${child.contentId}`}>
                  <ContentItemOverlay
                    targetId={target.targetId}
                    child={child}
                    index={child.index}
                    onSelect={callbacks.onSelect ?? (() => {})}
                    className={`ov-item${isSel ? " ov-item--selected" : ""}`}
                  />
                  <DeleteButton
                    child={child}
                    targetId={target.targetId}
                    onDelete={onDeleteItem}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
