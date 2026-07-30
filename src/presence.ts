/**
 * Public `./presence` entry — opt-in presence / edit-lock surface.
 *
 * PRESENCE / EDIT-LOCKS ONLY (no CRDT, no OT, no document merge). Not loaded by
 * `./host` or `./iframe`; import this subpath explicitly to add remote cursors
 * and advisory edit-locks. The default adapter has no third-party runtime dep.
 */
export * from "./presence/index.js";
