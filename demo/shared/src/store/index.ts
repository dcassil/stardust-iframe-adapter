/**
 * Content-store public surface.
 *
 * Exports the swappable {@link ContentStore} interface, its op vocabulary, the
 * default in-memory implementation, and a factory seeded from the shared demo
 * content model — so the admin constructs a store without hand-wiring the seed.
 */

export type {
  ContentStore,
  ContentSnapshot,
  ContentStoreListener,
} from "./ContentStore.js";
export type {
  StoreOperation,
  EditOp,
  DeleteOp,
  InsertOp,
  MoveOp,
} from "./operations.js";
export { InMemoryContentStore, type StoreSeedItem } from "./InMemoryContentStore.js";

import { SEED_CONTENT } from "../content-model.js";
import { InMemoryContentStore } from "./InMemoryContentStore.js";
import type { ContentStore } from "./ContentStore.js";

/**
 * Build the demo's default store, seeded with the shared {@link SEED_CONTENT}.
 * Returns the {@link ContentStore} interface (not the concrete class) so callers
 * stay decoupled from the implementation (NFR-003).
 */
export function createDemoContentStore(): ContentStore {
  return new InMemoryContentStore(SEED_CONTENT);
}
