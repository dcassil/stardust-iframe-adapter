/**
 * OPTIONAL Socket.IO presence adapter (demo-scoped).
 *
 * PRESENCE / EDIT-LOCKS ONLY — no CRDT/OT, no document merge. This is a
 * drop-in second implementation of {@link PresenceProvider} (the SIFR-T-0022
 * contract), interchangeable with `MockPresenceProvider` with no overlay
 * changes. It reproduces the prototype's `client-pointer`/`server-pointer` and
 * `client-edit-context` fan-out, keyed by an `appId` room so only sessions
 * sharing the app exchange presence.
 *
 * `socket.io-client` is imported LAZILY inside `connect()` so merely importing
 * this module — or the `./presence` entry — pulls no socket transport. The core
 * `./host`/`./iframe` packages never import presence, so `socket.io-client`
 * never enters their dependency graphs.
 */

import type {
  EditContext,
  Participant,
  ParticipantsListener,
  PointerPosition,
  PresenceProvider,
  Unsubscribe,
} from "./PresenceProvider.js";
import type { PresenceClock } from "./MockPresenceProvider.js";

/* -------------------------------------------------------------------------- */
/* Wire events (parity with the prototype server)                             */
/* -------------------------------------------------------------------------- */

/** Client → server events. */
export const PRESENCE_EVENTS = {
  /** Local pointer update. */
  clientPointer: "presence:pointer",
  /** Local advisory edit-context update (or clear). */
  clientEditContext: "presence:edit-context",
} as const;

/** Server → client events. */
export const PRESENCE_SERVER_EVENTS = {
  /** A peer's pointer update. */
  serverPointer: "presence:server-pointer",
  /** A peer's edit-context update. */
  serverEditContext: "presence:server-edit-context",
  /** A peer left the room. */
  serverLeave: "presence:server-leave",
} as const;

interface Identity {
  id: string;
  name: string;
  color: string;
}

/** Payload for a pointer fan-out. */
export interface PointerEnvelope {
  from: Identity;
  pointer: PointerPosition;
}

/** Payload for an edit-context fan-out. */
export interface EditContextEnvelope {
  from: Identity;
  editContext: EditContext | null;
}

/** Payload for a leave fan-out. */
export interface LeaveEnvelope {
  from: string;
}

/* -------------------------------------------------------------------------- */
/* Minimal socket surface (avoids a type dependency on socket.io-client)      */
/* -------------------------------------------------------------------------- */

/**
 * The subset of the `socket.io-client` Socket we use. Declared structurally so
 * this module carries no static import of the optional dependency.
 */
export interface MinimalSocket {
  on(event: string, handler: (payload: unknown) => void): void;
  emit(event: string, payload: unknown): void;
  disconnect(): void;
  connect(): void;
}

/** Factory that opens a socket to the demo server. Injectable for tests. */
export type SocketFactory = (options: {
  url: string;
  appId: string;
}) => MinimalSocket;

/* -------------------------------------------------------------------------- */
/* Options                                                                     */
/* -------------------------------------------------------------------------- */

export interface SocketIoPresenceProviderOptions {
  /** Demo presence server URL, e.g. `http://localhost:4010`. */
  url: string;
  /** Room key — only sockets sharing this `appId` exchange presence. */
  appId: string;
  /** Local participant identity. */
  self: { id: string; name: string; color: string };
  /** Pointer throttle in ms (default 100, consistent with the mock adapter). */
  throttleMs?: number;
  /** Injectable clock for deterministic tests. Defaults to real timers. */
  clock?: PresenceClock;
  /**
   * Optional socket factory override (tests inject a fake). When omitted,
   * `connect()` lazily imports `socket.io-client` and opens a real socket with
   * `{ query: { appId }, autoConnect: true }`.
   */
  socketFactory?: SocketFactory;
}

const defaultClock: PresenceClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms) as unknown as number,
  clearTimeout: (h) => clearTimeout(h),
  setInterval: (fn, ms) => setInterval(fn, ms) as unknown as number,
  clearInterval: (h) => clearInterval(h),
};

/* -------------------------------------------------------------------------- */
/* SocketIoPresenceProvider                                                    */
/* -------------------------------------------------------------------------- */

export class SocketIoPresenceProvider implements PresenceProvider {
  private readonly url: string;
  private readonly appId: string;
  private readonly self: Identity;
  private readonly throttleMs: number;
  private readonly clock: PresenceClock;
  private readonly socketFactory: SocketFactory | undefined;

  private socket: MinimalSocket | null = null;
  private readonly listeners = new Set<ParticipantsListener>();
  private readonly remotes = new Map<string, Participant>();

  private lastPointerSent = 0;
  private pendingPointer: PointerPosition | null = null;
  private trailingHandle: number | null = null;

  constructor(options: SocketIoPresenceProviderOptions) {
    this.url = options.url;
    this.appId = options.appId;
    this.self = { ...options.self };
    this.throttleMs = options.throttleMs ?? 100;
    this.clock = options.clock ?? defaultClock;
    this.socketFactory = options.socketFactory;
  }

  connect(): void {
    if (this.socket) return;
    if (this.socketFactory) {
      this.socket = this.socketFactory({ url: this.url, appId: this.appId });
      this.wire(this.socket);
      return;
    }
    // Lazy import so the optional dependency never loads unless a real socket
    // connection is actually requested.
    void this.openRealSocket();
  }

  private async openRealSocket(): Promise<void> {
    const mod = (await import("socket.io-client")) as {
      io: (url: string, opts: unknown) => MinimalSocket;
    };
    if (this.socket) return; // Raced a disconnect.
    const socket = mod.io(this.url, {
      query: { appId: this.appId },
      transports: ["websocket"],
      autoConnect: true,
    });
    this.socket = socket;
    this.wire(socket);
  }

  private wire(socket: MinimalSocket): void {
    socket.on(PRESENCE_SERVER_EVENTS.serverPointer, (payload: unknown) => {
      const env = payload as PointerEnvelope;
      if (env.from.id === this.self.id) return;
      const existing = this.remotes.get(env.from.id);
      this.remotes.set(env.from.id, {
        ...(existing ?? { id: env.from.id, name: env.from.name, color: env.from.color }),
        name: env.from.name,
        color: env.from.color,
        pointer: env.pointer,
      });
      this.emit();
    });

    socket.on(PRESENCE_SERVER_EVENTS.serverEditContext, (payload: unknown) => {
      const env = payload as EditContextEnvelope;
      if (env.from.id === this.self.id) return;
      const existing = this.remotes.get(env.from.id);
      const next: Participant = {
        ...(existing ?? { id: env.from.id, name: env.from.name, color: env.from.color }),
        name: env.from.name,
        color: env.from.color,
      };
      if (env.editContext) next.editContext = env.editContext;
      else delete next.editContext;
      this.remotes.set(env.from.id, next);
      this.emit();
    });

    socket.on(PRESENCE_SERVER_EVENTS.serverLeave, (payload: unknown) => {
      const env = payload as LeaveEnvelope;
      if (this.remotes.delete(env.from)) this.emit();
    });
  }

  disconnect(): void {
    if (this.trailingHandle !== null) {
      this.clock.clearTimeout(this.trailingHandle);
      this.trailingHandle = null;
    }
    this.socket?.disconnect();
    this.socket = null;
    this.remotes.clear();
    this.pendingPointer = null;
    this.lastPointerSent = 0;
  }

  subscribe(cb: ParticipantsListener): Unsubscribe {
    this.listeners.add(cb);
    cb(this.snapshot());
    return () => {
      this.listeners.delete(cb);
    };
  }

  publishPointer(pos: PointerPosition): void {
    const now = this.clock.now();
    const elapsed = now - this.lastPointerSent;
    if (elapsed >= this.throttleMs) {
      this.lastPointerSent = now;
      this.pendingPointer = null;
      this.sendPointer(pos);
      return;
    }
    this.pendingPointer = pos;
    if (this.trailingHandle === null) {
      const wait = this.throttleMs - elapsed;
      this.trailingHandle = this.clock.setTimeout(() => {
        this.trailingHandle = null;
        const pending = this.pendingPointer;
        this.pendingPointer = null;
        if (pending) {
          this.lastPointerSent = this.clock.now();
          this.sendPointer(pending);
        }
      }, wait);
    }
  }

  private sendPointer(pointer: PointerPosition): void {
    const envelope: PointerEnvelope = { from: this.self, pointer };
    this.socket?.emit(PRESENCE_EVENTS.clientPointer, envelope);
  }

  publishEditContext(ctx: EditContext | null): void {
    // NOT throttled — edit-lock changes must be prompt.
    const envelope: EditContextEnvelope = { from: this.self, editContext: ctx };
    this.socket?.emit(PRESENCE_EVENTS.clientEditContext, envelope);
  }

  private snapshot(): Participant[] {
    return [...this.remotes.values()].map((p) => ({ ...p }));
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const cb of this.listeners) cb(snap);
  }
}
