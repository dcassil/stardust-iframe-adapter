/**
 * Rendered-content context shared between {@link StardustAdapterProvider} and
 * the `EditableTarget` component.
 *
 * The host pushes content into targets via the `cms/sendElements` channel as
 * individual {@link ContentPayload} items. The provider accumulates them into a
 * per-target map (keyed by `targetId`, ordered by `index`) and exposes that map
 * plus the reducer through this context. This replaces the prototype's
 * `CmsElementContext`, but stays framework-minimal: it holds serializable
 * payloads, not pre-built React elements.
 */

import { createContext } from "react";
import type { ContentPayload } from "../protocol/index.js";

/** Content items grouped by their `targetId`, each list ordered by `index`. */
export type ContentByTarget = Readonly<Record<string, readonly ContentPayload[]>>;

/** Value exposed by {@link StardustContentContext}. */
export interface StardustContentContextValue {
  /** Current content, grouped by target id. */
  readonly content: ContentByTarget;
  /**
   * Apply one incoming `cms/sendElements` payload, inserting/replacing the item
   * at its `(targetId, index)` slot. Pure with respect to the previous map.
   */
  readonly applyContent: (payload: ContentPayload) => void;
}

/**
 * Fold a single incoming payload into the previous content map, keeping each
 * target's list ordered by `index` and replacing any item already at that
 * index. Exported for direct unit testing of the merge semantics.
 */
export function mergeContent(
  previous: ContentByTarget,
  payload: ContentPayload
): ContentByTarget {
  const existing = previous[payload.targetId] ?? [];
  const withoutSameIndex = existing.filter(
    (item) => item.index !== payload.index
  );
  const nextList = [...withoutSameIndex, payload].sort(
    (a, b) => a.index - b.index
  );

  return { ...previous, [payload.targetId]: nextList };
}

export const StardustContentContext =
  createContext<StardustContentContextValue | null>(null);
