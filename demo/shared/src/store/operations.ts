/**
 * The content-store operation vocabulary.
 *
 * The store applies four structured operations — **insert, move, edit, delete**.
 * Insert and move reuse SIFR-I-0003's host op shapes directly (`InsertOp`,
 * `MoveOp` from `@stardust-cms/iframe-adapter/host`) so the overlay/panel code
 * emits ops the store consumes without any adapter glue. Edit and delete are
 * store-level ops (the host overlay vocabulary is insert/move/select only; edit
 * and delete are demo-editing concerns), defined here with the same
 * discriminated-union `kind` style so SVER can dispatch on one discriminant.
 *
 * This module is framework- and transport-free: it imports only the host op
 * types and the protocol `CmsContent`.
 */

import type { InsertOp, MoveOp } from "@stardust-cms/iframe-adapter/host";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";

/**
 * Edit a field of an existing content item, addressed by target + id. `patch`
 * carries the changed `CmsContent` fields (e.g. `{ value }` for text/image src).
 */
export interface EditOp {
  kind: "edit";
  targetId: string;
  contentId: string;
  patch: Partial<Pick<CmsContent, "value" | "styleGroup" | "column" | "data">>;
}

/** Remove an existing content item, addressed by target + id. */
export interface DeleteOp {
  kind: "delete";
  targetId: string;
  contentId: string;
}

/**
 * The full store operation union. `insert` / `move` are the host op shapes;
 * `edit` / `delete` are store-level ops. `select` is intentionally excluded — it
 * is a UI concern that mutates no content, so it never reaches the store.
 */
export type StoreOperation = InsertOp | MoveOp | EditOp | DeleteOp;

export type { InsertOp, MoveOp };
