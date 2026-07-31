/**
 * Transport + wire-message layer for {@link MockPresenceProvider}. Split out of
 * `MockPresenceProvider.ts` to respect the module size budget; not part of the
 * public `./presence` surface.
 *
 * PRESENCE / EDIT-LOCKS ONLY. Messages fan out over a `BroadcastChannel` (real
 * browsers, across tabs) or a module-level in-memory bus (jsdom/tests) that
 * exercises the identical fan-out and self-exclusion logic.
 */

import type {
  EditContext,
  PointerPosition,
} from "./PresenceProvider.js";

/** The local participant's wire identity. */
export interface Identity {
  id: string;
  name: string;
  color: string;
}

/** All presence wire messages (distilled from the prototype `useRealTime.tsx`). */
export type PresenceMessage =
  | { kind: "join"; from: Identity }
  | { kind: "pointer"; from: string; pointer: PointerPosition }
  | { kind: "editContext"; from: string; editContext: EditContext | null }
  | { kind: "leave"; from: string }
  | { kind: "heartbeat"; from: string };

/** A presence fan-out transport (BroadcastChannel or in-memory fallback). */
export interface Transport {
  post(msg: PresenceMessage): void;
  onMessage(cb: (msg: PresenceMessage) => void): void;
  close(): void;
}

/**
 * Module-level in-memory buses keyed by channel name. Used when
 * `BroadcastChannel` is unavailable (jsdom). Like a real `BroadcastChannel`, a
 * sender does NOT receive its own message — self-exclusion is enforced by
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

/** Defensive clone so in-memory peers cannot share mutable references. */
function structuredCloneSafe(msg: PresenceMessage): PresenceMessage {
  if (typeof structuredClone === "function") return structuredClone(msg);
  return JSON.parse(JSON.stringify(msg)) as PresenceMessage;
}

export class MemoryTransport implements Transport {
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

export class BroadcastChannelTransport implements Transport {
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

export const defaultClock: PresenceClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms) as unknown as number,
  clearTimeout: (h) => {
    clearTimeout(h);
  },
  setInterval: (fn, ms) => setInterval(fn, ms) as unknown as number,
  clearInterval: (h) => {
    clearInterval(h);
  },
};
