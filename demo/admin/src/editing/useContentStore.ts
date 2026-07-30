/**
 * `useContentStore` — React binding around the framework-free
 * {@link ContentStore} (SIFR-T-0009), plus the store → `cms/sendElements`
 * re-injection pipeline.
 *
 * Responsibilities:
 *  - own a single `ContentStore` instance for the admin session;
 *  - expose the current `snapshot` and an `apply(op)` that dispatches to the
 *    store and re-renders;
 *  - on every snapshot change, push content into the iframe so the site
 *    re-renders (REQ: store → `cms/sendElements` → site re-render → overlay
 *    remap).
 *
 * Re-injection detail: the iframe provider's content merge is per-`(targetId,
 * index)` slot and never deletes. So after a delete/move that shortens a target,
 * we additionally blank any trailing slot that existed previously but no longer
 * does (send an empty `text` item), keeping the rendered page in sync without
 * requiring a library-level "clear target" message.
 *
 * The UI depends only on the {@link ContentStore} interface (NFR-003).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import {
  createDemoContentStore,
  type ContentSnapshot,
  type ContentStore,
  type StoreOperation,
} from "@demo/shared/store";
import { useSendElements } from "../useSendElements";

/** The highest occupied index per target, from a snapshot. */
function maxIndexByTarget(snapshot: ContentSnapshot): Map<string, number> {
  const max = new Map<string, number>();
  for (const p of snapshot) {
    max.set(p.targetId, Math.max(max.get(p.targetId) ?? -1, p.index));
  }
  return max;
}

/** An empty content payload used to blank an orphaned slot. */
function blankPayload(targetId: string, index: number): ContentPayload {
  return {
    targetId,
    contentId: `__blank-${targetId}-${index}`,
    index,
    content: { id: `__blank-${targetId}-${index}`, type: "text", value: "" },
  };
}

export interface UseContentStoreResult {
  snapshot: ContentSnapshot;
  apply: (op: StoreOperation) => void;
  /** Push the full current snapshot to the iframe (used on (re)connect). */
  reinject: () => void;
  store: ContentStore;
}

export function useContentStore(connected: boolean): UseContentStoreResult {
  // One store per admin session.
  const storeRef = useRef<ContentStore | null>(null);
  storeRef.current ??= createDemoContentStore();
  const store = storeRef.current;

  const [snapshot, setSnapshot] = useState<ContentSnapshot>(() => store.getSnapshot());
  const sendElements = useSendElements();

  // Track the previous max index per target so we can blank orphaned slots.
  const prevMaxRef = useRef<Map<string, number>>(maxIndexByTarget(snapshot));

  const inject = useCallback(
    (next: ContentSnapshot): void => {
      // 1. Push every current item.
      for (const payload of next) {
        void sendElements(payload).catch(() => {
          /* not connected yet / peer gone */
        });
      }
      // 2. Blank any trailing slots that existed before but no longer do.
      const nextMax = maxIndexByTarget(next);
      for (const [targetId, prevMax] of prevMaxRef.current) {
        const currentMax = nextMax.get(targetId) ?? -1;
        for (let i = currentMax + 1; i <= prevMax; i++) {
          void sendElements(blankPayload(targetId, i)).catch(() => {
            /* ignore */
          });
        }
      }
      prevMaxRef.current = nextMax;
    },
    [sendElements],
  );

  const apply = useCallback(
    (op: StoreOperation): void => {
      const next = store.apply(op);
      setSnapshot(next);
      inject(next);
    },
    [store, inject],
  );

  const reinject = useCallback((): void => {
    inject(store.getSnapshot());
  }, [store, inject]);

  // On (re)connect, push the full snapshot so the iframe reflects admin state.
  useEffect((): void => {
    if (connected) {
      reinject();
    }
    // Only re-run when the connection flips; reinject is stable.
  }, [connected, reinject]);

  return useMemo(
    () => ({ snapshot, apply, reinject, store }),
    [snapshot, apply, reinject, store],
  );
}
