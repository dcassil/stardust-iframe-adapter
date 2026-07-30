/**
 * The `ContentStore` interface — the swappable seam the SVER versioned engine
 * later implements (initiative NFR-003).
 *
 * The demo's editing UI depends ONLY on this interface, never on the concrete
 * in-memory class, so swapping in SVER's engine requires no UI changes. The
 * interface is deliberately minimal and transport-free:
 *
 *  - `getSnapshot()` — the current content as an ordered list of
 *    {@link ContentPayload}s, exactly the shape `cms/sendElements` re-injects.
 *  - `apply(op)` — apply one structured {@link StoreOperation}, returning the
 *    new snapshot.
 *  - `subscribe(listener)` — observe changes; returns an unsubscribe function.
 *
 * `ContentPayload` (not a bespoke type) is the snapshot element so a subscriber
 * can feed each item straight into the `cms/sendElements` sender.
 */

import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import type { StoreOperation } from "./operations.js";

/** An ordered snapshot of all content, ready for `cms/sendElements`. */
export type ContentSnapshot = readonly ContentPayload[];

/** A change listener; receives the fresh snapshot after every applied op. */
export type ContentStoreListener = (snapshot: ContentSnapshot) => void;

export interface ContentStore {
  /** The current content as `cms/sendElements`-ready payloads, ordered. */
  getSnapshot(): ContentSnapshot;
  /** Apply one structured operation; returns the resulting snapshot. */
  apply(op: StoreOperation): ContentSnapshot;
  /** Subscribe to snapshots. Returns an unsubscribe function. */
  subscribe(listener: ContentStoreListener): () => void;
}
