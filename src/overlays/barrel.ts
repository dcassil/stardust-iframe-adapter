/**
 * `@stardust-cms/iframe-adapter/presence` — opt-in presence overlay surface,
 * now backed by published `colab-ui`.
 *
 * PRESENCE / EDIT-LOCKS ONLY. Import this entry explicitly to add remote
 * cursors and advisory edit-locks to a host shell. The presence CORE (roster,
 * transport, cursor/edit-lock state) lives in `colab-ui` — mount a
 * `<ColabProvider>` from `colab-ui/react` above these overlays. This module
 * contributes ONLY the adapter's geometry (`mapGeometry` projected via the
 * {@link mapGeometryTransform} seam) and the `data-cms`↔`scopeId` boundary. No
 * CRDT/OT, no document merge.
 *
 * These overlays are geometry-carrying but transport-free: they read colab's
 * roster + Cursor/EditLock interactions and render the visible presence layer.
 */

export {
  RemoteCursors,
  type RemoteCursorsProps,
} from "./RemoteCursors.js";

export {
  EditLockIndicators,
  type EditLockIndicatorsProps,
  type LockTarget,
} from "./EditLockIndicators.js";

export {
  targetIdToScopeId,
  scopeIdToTargetId,
  isCmsScopeId,
  type CmsTargetId,
} from "./scopeId.js";

export { mapGeometryTransform } from "./transform.js";
