/**
 * Public `./presence` entry — opt-in presence / edit-lock overlay surface.
 *
 * PRESENCE / EDIT-LOCKS ONLY (no CRDT, no OT, no document merge). Not loaded by
 * `./host` or `./iframe`; import this subpath explicitly to add remote cursors
 * and advisory edit-locks.
 *
 * The presence CORE (roster, transport, cursor/edit-lock state) is now provided
 * by published `colab-ui`: mount a `<ColabProvider>` from `colab-ui/react`
 * above these overlays and connect it to a `colab-server` relay. This entry
 * re-exports only the adapter's THIN, geometry-aware overlays and the
 * `data-cms`↔`scopeId` boundary — the adapter carries no presence transport of
 * its own.
 */
export * from "./overlays/barrel.js";
