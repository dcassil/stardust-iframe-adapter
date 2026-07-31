/**
 * Default, server-less presence adapter.
 *
 * PRESENCE / EDIT-LOCKS ONLY — no CRDT, no OT, no state merge. This adapter
 * fans presence messages out over a `BroadcastChannel` (real browsers, across
 * tabs) or, when `BroadcastChannel` is absent (jsdom/tests), over a
 * module-level in-memory bus that exercises the identical fan-out and
 * self-exclusion logic. It has no third-party runtime dependency.
 *
 * Wire vocabulary (distilled from the prototype `useRealTime.tsx`):
 *  - `join`        — announces identity; peers reply with `join` so late
 *                    joiners learn about already-present participants.
 *  - `pointer`     — throttled (~100ms) local pointer position.
 *  - `editContext` — advisory edit-lock context (NOT throttled).
 *  - `leave`       — explicit departure on `disconnect()`.
 *  - `heartbeat`   — periodic liveness; silent peers are pruned on timeout.
 */

import type {
  EditContext,
  ParticipantsListener,
  PointerPosition,
  PresenceProvider,
  Unsubscribe,
} from "./PresenceProvider.js";
import {
  BroadcastChannelTransport,
  MemoryTransport,
  defaultClock,
  type Identity,
  type PresenceClock,
  type PresenceMessage,
  type Transport,
} from "./MockPresenceProvider.transport.js";
import { PresenceRoster } from "./MockPresenceProvider.roster.js";

// Re-export the injectable clock type so `./presence` consumers and the
// SocketIo adapter keep importing it from this module (public API unchanged).
export type { PresenceClock };

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

export interface MockPresenceProviderOptions {
  /** Presence channel name; instances sharing it see each other. */
  channelName: string;
  /** The local participant's identity. */
  self: { id: string; name: string; color: string };
  /** Pointer publish throttle in ms (default 100, matching the prototype). */
  throttleMs?: number;
  /**
   * Milliseconds without any message from a remote peer before it is pruned as
   * stale. Default 15000. Set `0` to disable timeout-based pruning.
   */
  staleTimeoutMs?: number;
  /** Heartbeat interval in ms (default 5000). Set `0` to disable heartbeats. */
  heartbeatMs?: number;
  /** Injectable clock for deterministic tests. Defaults to real timers. */
  clock?: PresenceClock;
  /**
   * Transport selection. `"auto"` (default) uses `BroadcastChannel` when
   * available and the in-memory bus otherwise. `"memory"` forces the
   * synchronous in-memory bus — used by tests to exercise fan-out
   * deterministically regardless of whether a `BroadcastChannel` global exists.
   */
  transport?: "auto" | "memory";
}

/* -------------------------------------------------------------------------- */
/* MockPresenceProvider                                                        */
/* -------------------------------------------------------------------------- */

export class MockPresenceProvider implements PresenceProvider {
  private readonly channelName: string;
  private readonly self: Identity;
  private readonly throttleMs: number;
  private readonly staleTimeoutMs: number;
  private readonly heartbeatMs: number;
  private readonly clock: PresenceClock;
  private readonly transportMode: "auto" | "memory";

  private transport: Transport | null = null;
  private readonly listeners = new Set<ParticipantsListener>();
  private readonly roster = new PresenceRoster(() => {
    this.post({ kind: "join", from: this.self });
  });

  private heartbeatHandle: number | null = null;
  private staleSweepHandle: number | null = null;

  // Throttle state for publishPointer (leading + trailing at throttleMs).
  private lastPointerSent = 0;
  private pendingPointer: PointerPosition | null = null;
  private trailingHandle: number | null = null;

  constructor(options: MockPresenceProviderOptions) {
    this.channelName = options.channelName;
    this.self = {
      id: options.self.id,
      name: options.self.name,
      color: options.self.color,
    };
    this.throttleMs = options.throttleMs ?? 100;
    this.staleTimeoutMs = options.staleTimeoutMs ?? 15000;
    this.heartbeatMs = options.heartbeatMs ?? 5000;
    this.clock = options.clock ?? defaultClock;
    this.transportMode = options.transport ?? "auto";
  }

  connect(): void {
    if (this.transport) return;
    const useBroadcast =
      this.transportMode === "auto" && typeof BroadcastChannel !== "undefined";
    this.transport = useBroadcast
      ? new BroadcastChannelTransport(this.channelName)
      : new MemoryTransport(this.channelName);

    this.transport.onMessage((msg) => {
      this.handleMessage(msg);
    });
    this.post({ kind: "join", from: this.self });

    if (this.heartbeatMs > 0) {
      this.heartbeatHandle = this.clock.setInterval(() => {
        this.post({ kind: "heartbeat", from: this.self.id });
      }, this.heartbeatMs);
    }
    if (this.staleTimeoutMs > 0) {
      // Sweep more frequently than the timeout so a peer is pruned promptly
      // after it lapses, rather than up to one full timeout period later.
      const sweepEvery = Math.max(1, Math.floor(this.staleTimeoutMs / 2));
      this.staleSweepHandle = this.clock.setInterval(() => {
        this.pruneStale();
      }, sweepEvery);
    }
  }

  disconnect(): void {
    if (!this.transport) return;
    this.post({ kind: "leave", from: this.self.id });
    if (this.trailingHandle !== null) {
      this.clock.clearTimeout(this.trailingHandle);
      this.trailingHandle = null;
    }
    if (this.heartbeatHandle !== null) {
      this.clock.clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = null;
    }
    if (this.staleSweepHandle !== null) {
      this.clock.clearInterval(this.staleSweepHandle);
      this.staleSweepHandle = null;
    }
    this.transport.close();
    this.transport = null;
    this.roster.clear();
    this.pendingPointer = null;
    this.lastPointerSent = 0;
  }

  subscribe(cb: ParticipantsListener): Unsubscribe {
    this.listeners.add(cb);
    // Emit the current snapshot immediately so late subscribers are consistent.
    cb(this.roster.snapshot());
    return () => {
      this.listeners.delete(cb);
    };
  }

  publishPointer(pos: PointerPosition): void {
    const now = this.clock.now();
    const elapsed = now - this.lastPointerSent;
    if (elapsed >= this.throttleMs) {
      // Leading edge: send immediately.
      this.lastPointerSent = now;
      this.pendingPointer = null;
      this.post({ kind: "pointer", from: this.self.id, pointer: pos });
      return;
    }
    // Within the window: remember the latest and schedule a single trailing send.
    this.pendingPointer = pos;
    if (this.trailingHandle === null) {
      const wait = this.throttleMs - elapsed;
      this.trailingHandle = this.clock.setTimeout(() => {
        this.trailingHandle = null;
        const pending = this.pendingPointer;
        this.pendingPointer = null;
        if (pending) {
          this.lastPointerSent = this.clock.now();
          this.post({ kind: "pointer", from: this.self.id, pointer: pending });
        }
      }, wait);
    }
  }

  publishEditContext(ctx: EditContext | null): void {
    // NOT throttled — edit-lock changes must be prompt.
    this.post({ kind: "editContext", from: this.self.id, editContext: ctx });
  }

  private post(msg: PresenceMessage): void {
    this.transport?.post(msg);
  }

  private handleMessage(msg: PresenceMessage): void {
    // Ignore any echo of our own id defensively (BroadcastChannel excludes self,
    // but keep both transports identical).
    const fromId = msg.kind === "join" ? msg.from.id : msg.from;
    if (fromId === this.self.id) return;

    const now = this.clock.now();
    switch (msg.kind) {
      case "join": {
        const known = this.roster.has(msg.from.id);
        this.roster.touch(msg.from, now);
        // Reply ONLY to a newly-seen peer so the newcomer learns we exist.
        // Replying unconditionally would ping-pong forever on a synchronous
        // transport (the in-memory bus); guarding on `known` makes join
        // idempotent while still informing genuine newcomers.
        if (!known) {
          this.post({ kind: "join", from: this.self });
        }
        break;
      }
      case "heartbeat": {
        const rec = this.roster.get(fromId);
        if (rec) rec.lastSeen = now;
        else this.post({ kind: "join", from: this.self });
        return; // No participant-list change on a bare heartbeat.
      }
      case "pointer": {
        const rec = this.roster.ensure(fromId, now);
        rec.participant = { ...rec.participant, pointer: msg.pointer };
        break;
      }
      case "editContext": {
        const rec = this.roster.ensure(fromId, now);
        const next = { ...rec.participant };
        if (msg.editContext) next.editContext = msg.editContext;
        else delete next.editContext;
        rec.participant = next;
        break;
      }
      case "leave": {
        if (!this.roster.delete(fromId)) return;
        break;
      }
    }
    this.emit();
  }

  private pruneStale(): void {
    const changed = this.roster.pruneStale(
      this.clock.now(),
      this.staleTimeoutMs,
    );
    if (changed) this.emit();
  }

  private emit(): void {
    const snap = this.roster.snapshot();
    for (const cb of this.listeners) cb(snap);
  }
}
