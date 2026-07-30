/**
 * Structured host edit-operation vocabulary + `DataTransfer` → op construction.
 *
 * The host overlay never mutates a content store. Instead every edit intent
 * leaves the package as one of a small set of structured, serializable
 * operations (`InsertOp` / `MoveOp` / `SelectOp`), surfaced through the
 * `onInsert` / `onMove` / `onSelect` callbacks of `useStardustHost`. This is the
 * successor to the prototype's direct `addContent` / `moveContent` calls in
 * `useCMSTarget.tsx` (REQ-005, NFR-002).
 *
 * This module is framework-agnostic: no React, no store access, no DOM mutation.
 * The only DOM type it reads is the drop event's `DataTransfer`, and it only
 * *reads* it.
 *
 * ## SVER vocabulary alignment
 *
 * These op shapes are chosen to line up with SVER's operation vocabulary so no
 * adapter glue is needed at the SVER boundary:
 *
 *  - Every op is a discriminated union on a `kind` string literal
 *    (`'insert' | 'move' | 'select'`) — SVER dispatches on the same discriminant.
 *  - `InsertOp` carries `targetId`, a numeric `index`, and an open, serializable
 *    `payload` bag whose only required field is `type` (the block type). SVER's
 *    insert consumes exactly `{ targetId, index, payload }`.
 *  - `MoveOp` uses `from` / `to` location records (`{ targetId, index, contentId? }`),
 *    matching SVER's relocation op which also addresses content by
 *    (target, index) with an optional content id.
 *  - `SelectOp` carries `targetId` and an optional `contentId` (absent selects the
 *    whole target), matching SVER's selection event.
 *
 * If SVER's field names ever diverge, the divergence is adapted here — this file
 * is the single contract boundary — rather than leaking into the overlays/hook.
 */

/** Where a piece of content lives, addressed by target + position (+ id). */
export interface ContentLocation {
  targetId: string;
  index: number;
  /** The moved content's id, when relocating an existing item. */
  contentId?: string;
}

/**
 * Insert a *new* block into a target at a position. `payload.type` is the block
 * type (e.g. `"text"`); additional serializable fields may accompany it.
 */
export interface InsertOp {
  kind: "insert";
  targetId: string;
  index: number;
  payload: { type: string; [key: string]: unknown };
}

/** Relocate an *existing* content item from one location to another. */
export interface MoveOp {
  kind: "move";
  from: ContentLocation;
  to: ContentLocation;
}

/** Select a target, or a specific content item within it. */
export interface SelectOp {
  kind: "select";
  targetId: string;
  contentId?: string;
}

/** The union of every operation the host emits. */
export type StardustHostOp = InsertOp | MoveOp | SelectOp;

/**
 * Connection lifecycle state the host hook exposes. Successor to the prototype's
 * `ConnectStatus`, enabling the demo's connect/error UI.
 */
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/**
 * The `dataTransfer` keys the overlays read/write during drag/drop. Mirrors the
 * prototype's `CMSTargetItem.tsx` (`isMove`, `target`, `contentId`, `index`),
 * plus `type` for new-block drags. Centralized here so parsing lives in one
 * place (SIFR-T-0019 uses these to populate `dataTransfer`).
 */
export const DATA_TRANSFER_KEYS = {
  /** `"true"` when dragging an existing content item (a move). */
  isMove: "isMove",
  /** Block type for a new-block insert (e.g. `"text"`). */
  type: "type",
  /** Source target id of a moved item. */
  sourceTarget: "target",
  /** Content id of a moved item. */
  contentId: "contentId",
  /** Source index of a moved item, as a string. */
  sourceIndex: "index",
} as const;

/**
 * A minimal read-only view of the parts of `DataTransfer` this constructor uses.
 * Declared structurally so the pure constructor can be unit-tested with a plain
 * object (no jsdom `DataTransfer` instance required).
 */
export interface DataTransferLike {
  getData(format: string): string;
}

/** The drop context: where the drop landed. */
export interface DropContext {
  targetId: string;
  index: number;
}

/* -------------------------------------------------------------------------- */
/* Callback signatures                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Edit-intent callbacks, using the positional signatures named in the
 * initiative (`onInsert(targetId, index, payload)`, `onMove(from, to)`,
 * `onSelect(targetId, contentId?)`). These are the surface the host hook and
 * overlays expose; the structured `InsertOp`/`MoveOp`/`SelectOp` records above
 * are the serializable payloads carried across the SVER boundary.
 */
export interface OperationCallbacks {
  /** A new block was inserted into `targetId` at `index`. */
  onInsert?: (targetId: string, index: number, payload: InsertOp["payload"]) => void;
  /** An existing content item was relocated. */
  onMove?: (from: ContentLocation, to: ContentLocation) => void;
  /** A target (or a content item within it) was selected. */
  onSelect?: (targetId: string, contentId?: string) => void;
}

/**
 * Dispatch a structured op (as built by {@link opFromDataTransfer}) to the
 * matching positional callback. Keeps the op→callback fan-out in one place so
 * the hook and overlays stay consistent.
 */
export function dispatchOp(
  op: InsertOp | MoveOp | null,
  callbacks: OperationCallbacks,
): void {
  if (!op) {
    return;
  }
  if (op.kind === "insert") {
    callbacks.onInsert?.(op.targetId, op.index, op.payload);
  } else {
    callbacks.onMove?.(op.from, op.to);
  }
}

/**
 * Pure constructor: read a drop's `DataTransfer` and produce the correct op.
 *
 *  - If the transfer carries an existing `contentId` (an item being relocated),
 *    returns a `MoveOp` from the source location to the drop context.
 *  - Otherwise, if it carries a block `type`, returns an `InsertOp` for a new
 *    block at the drop context.
 *  - If the transfer carries neither (malformed/empty), returns `null` — the
 *    caller decides how to handle a no-op drop. Never throws.
 *
 * No DOM mutation, no store access.
 */
export function opFromDataTransfer(
  dataTransfer: DataTransferLike | null | undefined,
  context: DropContext,
): InsertOp | MoveOp | null {
  if (!dataTransfer) {
    return null;
  }

  const contentId = readString(dataTransfer, DATA_TRANSFER_KEYS.contentId);

  // An existing content item is being relocated → MoveOp.
  if (contentId) {
    const sourceTargetId =
      readString(dataTransfer, DATA_TRANSFER_KEYS.sourceTarget) ?? context.targetId;
    const sourceIndexRaw = readString(dataTransfer, DATA_TRANSFER_KEYS.sourceIndex);
    const sourceIndex = sourceIndexRaw === undefined ? 0 : Number.parseInt(sourceIndexRaw, 10);

    return {
      kind: "move",
      from: {
        targetId: sourceTargetId,
        index: Number.isNaN(sourceIndex) ? 0 : sourceIndex,
        contentId,
      },
      to: {
        targetId: context.targetId,
        index: context.index,
      },
    };
  }

  // A new block is being inserted → InsertOp.
  const type = readString(dataTransfer, DATA_TRANSFER_KEYS.type);
  if (type) {
    return {
      kind: "insert",
      targetId: context.targetId,
      index: context.index,
      payload: { type },
    };
  }

  // Nothing actionable on the transfer.
  return null;
}

/** Read a `dataTransfer` key, treating an empty string as absent. */
function readString(
  dataTransfer: DataTransferLike,
  key: string,
): string | undefined {
  const value = dataTransfer.getData(key);
  return value === "" ? undefined : value;
}
