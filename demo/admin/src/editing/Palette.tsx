/**
 * Block palette (SIFR-T-0010).
 *
 * Draggable source blocks. On drag start, each sets the `DATA_TRANSFER_KEYS.type`
 * key so a drop on a `TargetAreaOverlay` is resolved by the library's
 * `opFromDataTransfer` into an `InsertOp` for a new block of that type (including
 * a drop into the nested container). The library owns the drop→op translation;
 * the palette only advertises the block type on the drag.
 */

import type { DragEvent, ReactNode } from "react";
import { DATA_TRANSFER_KEYS } from "@stardust-cms/iframe-adapter/host";

interface PaletteBlock {
  type: string;
  label: string;
}

const BLOCKS: readonly PaletteBlock[] = [
  { type: "text", label: "Text block" },
  { type: "image", label: "Image" },
];

export function Palette(): ReactNode {
  const handleDragStart =
    (block: PaletteBlock) =>
    (event: DragEvent<HTMLDivElement>): void => {
      event.dataTransfer.setData(DATA_TRANSFER_KEYS.type, block.type);
      event.dataTransfer.effectAllowed = "copy";
    };

  return (
    <section className="panel">
      <h2 className="panel__title">Blocks</h2>
      <p className="panel__hint">Drag a block onto any target (including a container column).</p>
      <div className="palette">
        {BLOCKS.map((block) => (
          <div
            key={block.label}
            className="palette__item"
            draggable
            onDragStart={handleDragStart(block)}
          >
            <span className="palette__type">{block.type}</span>
            {block.label}
          </div>
        ))}
      </div>
    </section>
  );
}
