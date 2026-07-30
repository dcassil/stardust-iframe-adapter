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
  Participant,
  ParticipantsListener,
  PointerPosition,
  PresenceProvider,
  Unsubscribe,
} from "./PresenceProvider.js";

/* -------------------------------------------------------------------------- */
/* Wire messages                                                              */
/* -------------------------------------------------------------------------- */

interface Identity {
  id: string;
  name: string;
  color: string;
}

type PresenceMessage =
  | { kind: "join"; from: Identity }
  | { kind: "pointer"; from: string; pointer: PointerPosition }
  | { kind: "editContext"; from: string; editContext: EditContext | null }
  | { kind: "leave"; from: string }
  | { kind: "heartbeat"; from: string };

/* -------------------------------------------------------------------------- */
/* Transport abstraction (BroadcastChannel or in-memory fallback)             */
/* -------------------------------------------------------------------------- */

interface Transport {
  post(msg: PresenceMessage): void;
  onMessage(cb: (msg: PresenceMessage) => void): void;
  close(): void;
}

/**
 * Module-level in-memory buses keyed by channel name. Used when
 * `BroadcastChannel` is unavailable (jsdom). Like a real `BroadcastChannel`,
 * a sender does NOT receive its own message — self-exclusion is enforced by
 * skipping the posting subscriber, matching the browser transport exactly.
 */
const memoryBuses = new Map<string, Set<(msg: PresenceMessage) => void>>();

function getMemoryBus(name: string): Set<(msg: PresenceMessage) => void> {
  let bus = memoryBuses.get(name);
  if (!bus) {
    bus = new Set();
    memoryBuses.set(name, bus);
  }
  return bus;
}

class MemoryTransport implements Transport {
  private handler: ((msg: PresenceMessage) => void) | null = null;
  private readonly bus: Set<(msg: PresenceMessage) => void>;

  constructor(private readonly channelName: string) {
    this.bus = getMemoryBus(channelName);
  }

  post(msg: PresenceMessage): void {
    // Deliver to every subscriber except the one that owns this transport
    // (self-exclusion, mirroring BroadcastChannel semantics). Snapshot first;
    // handlers may mutate the set.
    const own = this.handler;
    const clone = structuredCloneSafe(msg);
    for (const sub of [...this.bus]) {
      if (sub === own) continue;
      sub(clone);
    }
  }

  onMessage(cb: (msg: PresenceMessage) => void): void {
    this.handler = cb;
    this.bus.add(cb);
  }

  close(): void {
    if (this.handler) {
      this.bus.delete(this.handler);
      this.handler = null;
    }
    if (this.bus.size === 0) {
      memoryBuses.delete(this.channelName);
    }
  }
}

class BroadcastChannelTransport implements Transport {
  private readonly channel: BroadcastChannel;

  constructor(channelName: string) {
    this.channel = new BroadcastChannel(channelName);
  }

  post(msg: PresenceMessage): void {
    this.channel.postMessage(msg);
  }

  onMessage(cb: (msg: PresenceMessage) => void): void {
    this.channel.onmessage = (ev: MessageEvent<PresenceMessage>): void => {
      cb(ev.data);
    };
  }

  close(): void {
    this.channel.onmessage = null;
    this.channel.close();
  }
}

/** Defensive clone so in-memory peers cannot share mutable references. */
function structuredCloneSafe(msg: PresenceMessage): PresenceMessage {
  if (typeof structuredClone === "function") return structuredClone(msg);
  return JSON.parse(JSON.stringify(msg)) as PresenceMessage;
}

/* -------------------------------------------------------------------------- */
/* Clock injection (deterministic under fake timers)                          */
/* -------------------------------------------------------------------------- */

/** Minimal timer surface so tests can drive throttle/heartbeat deterministically. */
export interface PresenceClock {
  now(): number;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(handle: number): void;
  setInterval(fn: () => void, ms: number): number;
  clearInterval(handle: number): void;
}

const defaultClock: PresenceClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms) as unknown as number,
  clearTimeout: (h) => clearTimeout(h),
  setInterval: (fn, ms) => setInterval(fn, ms) as unknown as number,
  clearInterval: (h) => clearInterval(h),
};

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

interface RemoteRecord {
  participant: Participant;
  lastSeen: number;
}

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
  private readonly remotes = new Map<string, RemoteRecord>();

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

    this.transport.onMessage((msg) => this.handleMessage(msg));
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
    this.remotes.clear();
    this.pendingPointer = null;
    this.lastPointerSent = 0;
  }

  subscribe(cb: ParticipantsListener): Unsubscribe {
    this.listeners.add(cb);
    // Emit the current snapshot immediately so late subscribers are consistent.
    cb(this.snapshot());
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
        const known = this.remotes.has(msg.from.id);
        this.touch(msg.from, now);
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
        const rec = this.remotes.get(fromId);
        if (rec) rec.lastSeen = now;
        else this.post({ kind: "join", from: this.self });
        return; // No participant-list change on a bare heartbeat.
      }
      case "pointer": {
        const rec = this.ensure(fromId, now);
        rec.participant = { ...rec.participant, pointer: msg.pointer };
        break;
      }
      case "editContext": {
        const rec = this.ensure(fromId, now);
        const next = { ...rec.participant };
        if (msg.editContext) next.editContext = msg.editContext;
        else delete next.editContext;
        rec.participant = next;
        break;
      }
      case "leave": {
        if (!this.remotes.delete(fromId)) return;
        break;
      }
    }
    this.emit();
  }

  /** Ensure a record exists for an id we have not seen a `join` from yet. */
  private ensure(id: string, now: number): RemoteRecord {
    let rec = this.remotes.get(id);
    if (!rec) {
      rec = {
        participant: { id, name: id, color: "#888888" },
        lastSeen: now,
      };
      this.remotes.set(id, rec);
      // Announce ourselves so the peer can fill in our identity too.
      this.post({ kind: "join", from: this.self });
    } else {
      rec.lastSeen = now;
    }
    return rec;
  }

  private touch(identity: Identity, now: number): void {
    const existing = this.remotes.get(identity.id);
    if (existing) {
      existing.participant = {
        ...existing.participant,
        name: identity.name,
        color: identity.color,
      };
      existing.lastSeen = now;
    } else {
      this.remotes.set(identity.id, {
        participant: {
          id: identity.id,
          name: identity.name,
          color: identity.color,
        },
        lastSeen: now,
      });
    }
  }

  private pruneStale(): void {
    const now = this.clock.now();
    let changed = false;
    for (const [id, rec] of this.remotes) {
      if (now - rec.lastSeen > this.staleTimeoutMs) {
        this.remotes.delete(id);
        changed = true;
      }
    }
    if (changed) this.emit();
  }

  private snapshot(): Participant[] {
    return [...this.remotes.values()].map((r) => ({ ...r.participant }));
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const cb of this.listeners) cb(snap);
  }
}
