/**
 * `@stardust-cms/iframe-adapter/presence` — transport-agnostic presence.
 *
 * PRESENCE / EDIT-LOCKS ONLY. This module models *who is here* and *who is
 * editing what* for the demo. It is deliberately NOT a concurrent-editing
 * engine: there is NO CRDT, NO OT, and NO merge of document state anywhere in
 * this module or its adapters. Edit context is an advisory soft-lock — a hint
 * that a participant is focused on a target — not a mutation channel.
 *
 * The `PresenceProvider` interface is the load-bearing abstraction (successor
 * to the prototype `useRealTime.tsx` `client-pointer`/`server-pointer` and
 * `client-edit-context` flow). The default {@link MockPresenceProvider} runs
 * with no server; the optional Socket.IO adapter (SIFR-T-0024) is a drop-in
 * second implementation of exactly this interface.
 *
 * Zero footprint when unused: this file pulls no network transport and no
 * third-party runtime dependency.
 */

/** A 2D pointer position in the host overlay coordinate space. */
export interface PointerPosition {
  x: number;
  y: number;
}

/**
 * An advisory edit-lock context: the participant is focused on `target`,
 * optionally on a specific content item `id`. This is a soft presence hint, not
 * a lock that blocks writes and not a merge channel.
 */
export interface EditContext {
  /** The content item id the participant is editing (or a target-level id). */
  id: string;
  /** The `data-cms` target id the participant is editing within. */
  target: string;
}

/**
 * A remote (or local) participant in a presence session. Mirrors the
 * collaborator shape reflected by the prototype's `useRealTime.tsx` /
 * `CMSTargetItem.tsx`.
 */
export interface Participant {
  /** Stable unique id for this participant/session. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Display color (any CSS color) used to tint this participant's cursor/lock. */
  color: string;
  /** Last known pointer position, if published. */
  pointer?: PointerPosition;
  /** Current advisory edit context, if the participant is editing. */
  editContext?: EditContext;
}

/**
 * A subscriber callback receiving the current set of *remote* participants
 * (self excluded). Called on every change (join, pointer, editContext, leave).
 */
export type ParticipantsListener = (participants: Participant[]) => void;

/** Unsubscribe function returned by {@link PresenceProvider.subscribe}. */
export type Unsubscribe = () => void;

/**
 * Transport-agnostic presence API. Implemented by {@link MockPresenceProvider}
 * (default, no server) and by the optional Socket.IO adapter (SIFR-T-0024).
 *
 * Lifecycle: construct → {@link connect} → publish/subscribe → {@link disconnect}.
 */
export interface PresenceProvider {
  /**
   * Publish the local participant's pointer position. Throttled by the
   * implementation (~100ms) so rapid moves emit at most ~one message/interval.
   */
  publishPointer(pos: PointerPosition): void;

  /**
   * Publish (or clear, with `null`) the local participant's advisory edit
   * context. NOT throttled — edit-lock changes must be prompt.
   */
  publishEditContext(ctx: EditContext | null): void;

  /**
   * Subscribe to remote-participant updates. Returns an unsubscribe function.
   * The callback receives the full remote-participant list on each change.
   */
  subscribe(cb: ParticipantsListener): Unsubscribe;

  /** Join the presence session and begin sending/receiving. */
  connect(): void;

  /** Leave the presence session; broadcasts a leave and stops delivery. */
  disconnect(): void;
}
