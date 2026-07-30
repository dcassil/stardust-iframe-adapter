/**
 * Public `./host` entry — the host-side overlay adapter surface.
 *
 * This is the entry the admin/builder shell imports. It re-exports the
 * framework-agnostic protocol so host consumers get the types, and will export
 * the host-side hook/overlay primitives delivered by SIFR-I-0003.
 *
 * IMPORTANT (bundle-separation invariant): this module must NEVER import from
 * `./iframe` — the host bundle must not pull in the iframe provider code. Only
 * the protocol module and (later) host-side code may be re-exported here.
 */
export * from "./protocol/index.js";

// SIFR-I-0003 — host-side overlay adapter surface.
export { mapGeometry } from "./host/mapGeometry.js";
export type { GeometryTransform, MappedGeometry } from "./host/mapGeometry.js";

export { useStardustHost } from "./host/useStardustHost.js";
export type {
  UseStardustHostOptions,
  UseStardustHostResult,
  MappedTarget,
  MappedChild,
} from "./host/useStardustHost.js";

export {
  TargetAreaOverlay,
  ContentItemOverlay,
} from "./host/overlays.js";
export type {
  TargetAreaOverlayProps,
  ContentItemOverlayProps,
} from "./host/overlays.js";

export {
  opFromDataTransfer,
  dispatchOp,
  DATA_TRANSFER_KEYS,
} from "./host/operations.js";
export type {
  InsertOp,
  MoveOp,
  SelectOp,
  StardustHostOp,
  ConnectionState,
  ContentLocation,
  DropContext,
  DataTransferLike,
  OperationCallbacks,
} from "./host/operations.js";
