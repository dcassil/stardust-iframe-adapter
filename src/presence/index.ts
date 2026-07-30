/**
 * `@stardust-cms/iframe-adapter/presence` — opt-in presence surface.
 *
 * PRESENCE / EDIT-LOCKS ONLY. Import this entry explicitly to add remote
 * cursors and advisory edit-locks to a host shell. Nothing here is auto-loaded
 * by the `./host` or `./iframe` entries, and the default adapter has no
 * third-party runtime dependency. There is NO CRDT/OT and NO document merge.
 */

export type {
  PresenceProvider,
  Participant,
  ParticipantsListener,
  Unsubscribe,
  PointerPosition,
  EditContext,
} from "./PresenceProvider.js";

export {
  MockPresenceProvider,
  type MockPresenceProviderOptions,
  type PresenceClock,
} from "./MockPresenceProvider.js";

export {
  RemoteCursors,
  EditLockIndicators,
  usePresenceParticipants,
  type RemoteCursorsProps,
  type EditLockIndicatorsProps,
  type LockTarget,
} from "./overlays.js";
