/**
 * `InMemoryContentStore` — the demo's default {@link ContentStore}.
 *
 * Holds the content tree as an ordered map `targetId -> CmsContent[]` (flat
 * targets and the nested container's child targets `split-col.1` / `split-col.2`
 * are all just entries in this map, keyed by target id). Each operation is a
 * pure reducer over a cloned tree, so snapshots never alias internal state.
 *
 * Framework- and transport-free: no React, no frame-link. The admin wraps it in
 * a React hook (SIFR-T-0010); a subscriber pushes each snapshot item through
 * `cms/sendElements`.
 */

import type {
  CmsContent,
  ContentKind,
  ContentPayload,
} from "@stardust-cms/iframe-adapter/protocol";
import type {
  ContentSnapshot,
  ContentStore,
  ContentStoreListener,
} from "./ContentStore.js";
import type { StoreOperation } from "./operations.js";

/** A seed entry used to initialize the store (matches the shared seed shape). */
export interface StoreSeedItem {
  targetId: string;
  index: number;
  content: CmsContent;
}

let autoId = 0;
/** Generate a stable-enough unique id for a newly inserted block. */
function nextId(type: string): string {
  autoId += 1;
  return `${type}-${Date.now().toString(36)}-${autoId}`;
}

/** Deep-ish clone of one content item (structured-clone-safe fields only). */
function cloneContent(content: CmsContent): CmsContent {
  return { ...content, ...(content.data !== undefined ? { data: content.data } : {}) };
}

export class InMemoryContentStore implements ContentStore {
  /** targetId -> ordered content items. */
  private readonly byTarget = new Map<string, CmsContent[]>();
  private readonly listeners = new Set<ContentStoreListener>();

  constructor(seed: readonly StoreSeedItem[]) {
    // Insert seed items honoring their declared index order per target.
    const sorted = [...seed].sort((a, b) => a.index - b.index);
    for (const item of sorted) {
      const list = this.byTarget.get(item.targetId) ?? [];
      list.push(cloneContent(item.content));
      this.byTarget.set(item.targetId, list);
    }
  }

  getSnapshot(): ContentSnapshot {
    const payloads: ContentPayload[] = [];
    for (const [targetId, list] of this.byTarget) {
      list.forEach((content, index) => {
        payloads.push({
          targetId,
          contentId: content.id,
          index,
          content: cloneContent(content),
        });
      });
    }
    return payloads;
  }

  apply(op: StoreOperation): ContentSnapshot {
    switch (op.kind) {
      case "insert":
        this.applyInsert(op.targetId, op.index, op.payload);
        break;
      case "move":
        this.applyMove(op.from.targetId, op.from.index, op.to.targetId, op.to.index);
        break;
      case "edit":
        this.applyEdit(op.targetId, op.contentId, op.patch);
        break;
      case "delete":
        this.applyDelete(op.targetId, op.contentId);
        break;
      default: {
        const _exhaustive: never = op;
        void _exhaustive;
        break;
      }
    }
    const snapshot = this.getSnapshot();
    this.emit(snapshot);
    return snapshot;
  }

  subscribe(listener: ContentStoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /* --- Reducers ---------------------------------------------------------- */

  private applyInsert(
    targetId: string,
    index: number,
    payload: { type: string; [key: string]: unknown },
  ): void {
    const list = this.byTarget.get(targetId) ?? [];
    const content = contentFromInsertPayload(payload);
    const clamped = clampIndex(index, list.length);
    list.splice(clamped, 0, content);
    this.byTarget.set(targetId, list);
  }

  private applyMove(
    fromTarget: string,
    fromIndex: number,
    toTarget: string,
    toIndex: number,
  ): void {
    const source = this.byTarget.get(fromTarget);
    if (!source) return;
    const clampedFrom = clampIndex(fromIndex, source.length - 1);
    const [moved] = source.splice(clampedFrom, 1);
    if (moved === undefined) return;
    this.byTarget.set(fromTarget, source);

    const dest = this.byTarget.get(toTarget) ?? [];
    // When moving within the same target and removing an earlier item shifts the
    // destination index down by one, clamp handles the boundary either way.
    const clampedTo = clampIndex(toIndex, dest.length);
    dest.splice(clampedTo, 0, moved);
    this.byTarget.set(toTarget, dest);
  }

  private applyEdit(
    targetId: string,
    contentId: string,
    patch: Partial<CmsContent>,
  ): void {
    const list = this.byTarget.get(targetId);
    if (!list) return;
    const idx = list.findIndex((c) => c.id === contentId);
    if (idx === -1) return;
    const current = list[idx]!;
    list[idx] = { ...current, ...patch, id: current.id, type: current.type };
  }

  private applyDelete(targetId: string, contentId: string): void {
    const list = this.byTarget.get(targetId);
    if (!list) return;
    const idx = list.findIndex((c) => c.id === contentId);
    if (idx === -1) return;
    list.splice(idx, 1);
    this.byTarget.set(targetId, list);
  }

  private emit(snapshot: ContentSnapshot): void {
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

/** Clamp an index into `[0, max]` (max inclusive). Negative / NaN → 0. */
function clampIndex(index: number, max: number): number {
  if (!Number.isFinite(index) || index < 0) return 0;
  const upper = Math.max(0, max);
  return Math.min(index, upper);
}

/** Known content kinds, for validating an insert payload's `type`. */
const CONTENT_KINDS: readonly ContentKind[] = ["text", "number", "image", "container"];

/** Build a `CmsContent` from an insert payload's open bag. */
function contentFromInsertPayload(payload: {
  type: string;
  [key: string]: unknown;
}): CmsContent {
  const type: ContentKind = (CONTENT_KINDS as readonly string[]).includes(payload.type)
    ? (payload.type as ContentKind)
    : "text";

  const id =
    typeof payload["id"] === "string" && payload["id"].length > 0
      ? (payload["id"] as string)
      : nextId(type);

  const content: CmsContent = { id, type };
  if (typeof payload["value"] === "string") content.value = payload["value"];
  if (typeof payload["styleGroup"] === "string")
    content.styleGroup = payload["styleGroup"];
  if (typeof payload["column"] === "boolean") content.column = payload["column"];
  return content;
}
