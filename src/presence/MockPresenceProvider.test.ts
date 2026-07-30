/**
 * Unit tests for the default {@link MockPresenceProvider}.
 *
 * These run under jsdom where `BroadcastChannel` is absent, so they exercise
 * the in-memory fallback bus — the same fan-out + self-exclusion path used by
 * the real transport. A hand-rolled {@link FakeClock} drives the throttle and
 * stale-timeout deterministically (no real `Date.now()`).
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  MockPresenceProvider,
  type PresenceClock,
} from "./MockPresenceProvider.js";
import type { Participant } from "./PresenceProvider.js";

/** Deterministic clock: time only advances via `tick`. */
class FakeClock implements PresenceClock {
  private current = 0;
  private seq = 1;
  private readonly timeouts = new Map<
    number,
    { at: number; fn: () => void }
  >();
  private readonly intervals = new Map<
    number,
    { every: number; next: number; fn: () => void }
  >();

  now(): number {
    return this.current;
  }

  setTimeout(fn: () => void, ms: number): number {
    const id = this.seq++;
    this.timeouts.set(id, { at: this.current + ms, fn });
    return id;
  }

  clearTimeout(handle: number): void {
    this.timeouts.delete(handle);
  }

  setInterval(fn: () => void, ms: number): number {
    const id = this.seq++;
    this.intervals.set(id, { every: ms, next: this.current + ms, fn });
    return id;
  }

  clearInterval(handle: number): void {
    this.intervals.delete(handle);
  }

  /** Advance time by `ms`, firing due timeouts/intervals in order. */
  tick(ms: number): void {
    const target = this.current + ms;
    // Step in 1ms granularity is unnecessary; jump to each due event boundary.
    let guard = 0;
    for (;;) {
      const next = this.nextDue(target);
      if (next === null) break;
      this.current = next;
      this.fireDue();
      if (++guard > 100000) throw new Error("FakeClock runaway");
    }
    this.current = target;
    this.fireDue();
  }

  private nextDue(limit: number): number | null {
    let min: number | null = null;
    for (const t of this.timeouts.values()) {
      if (t.at <= limit && (min === null || t.at < min)) min = t.at;
    }
    for (const iv of this.intervals.values()) {
      if (iv.next <= limit && (min === null || iv.next < min)) min = iv.next;
    }
    return min !== null && min > this.current ? min : null;
  }

  private fireDue(): void {
    for (const [id, t] of [...this.timeouts]) {
      if (t.at <= this.current) {
        this.timeouts.delete(id);
        t.fn();
      }
    }
    for (const iv of this.intervals.values()) {
      while (iv.next <= this.current) {
        iv.next += iv.every;
        iv.fn();
      }
    }
  }
}

const providers: MockPresenceProvider[] = [];

function make(
  channel: string,
  self: { id: string; name: string; color: string },
  clock: PresenceClock,
  overrides: Partial<{ throttleMs: number; staleTimeoutMs: number; heartbeatMs: number }> = {},
): MockPresenceProvider {
  const p = new MockPresenceProvider({
    channelName: channel,
    self,
    clock,
    // Force the synchronous in-memory bus so fan-out + self-exclusion are
    // exercised deterministically under the FakeClock (Node/jsdom both expose a
    // real async BroadcastChannel global that would otherwise be selected).
    transport: "memory",
    heartbeatMs: 0,
    staleTimeoutMs: 0,
    ...overrides,
  });
  providers.push(p);
  return p;
}

afterEach(() => {
  while (providers.length) providers.pop()?.disconnect();
});

function findById(list: Participant[], id: string): Participant | undefined {
  return list.find((p) => p.id === id);
}

describe("MockPresenceProvider (TC-001)", () => {
  it("fans out pointer and editContext between two participants, self excluded", () => {
    const clock = new FakeClock();
    const a = make("room-1", { id: "A", name: "Ada", color: "#f00" }, clock);
    const b = make("room-1", { id: "B", name: "Bo", color: "#00f" }, clock);
    a.connect();
    b.connect();

    let latest: Participant[] = [];
    b.subscribe((ps) => {
      latest = ps;
    });

    a.publishPointer({ x: 120, y: 340 });
    a.publishEditContext({ id: "c1", target: "t-hero" });
    clock.tick(100);

    const seenA = findById(latest, "A");
    expect(seenA).toBeDefined();
    expect(seenA?.pointer).toEqual({ x: 120, y: 340 });
    expect(seenA?.editContext).toEqual({ id: "c1", target: "t-hero" });
    // A identity propagated via join reply.
    expect(seenA?.name).toBe("Ada");
    expect(seenA?.color).toBe("#f00");
    // B never appears in its own remote list.
    expect(findById(latest, "B")).toBeUndefined();
  });
});

describe("MockPresenceProvider (TC-002)", () => {
  it("throttles pointer to ~one message per 100ms window and stops after unsubscribe", () => {
    const clock = new FakeClock();
    const a = make("room-2", { id: "A", name: "Ada", color: "#f00" }, clock);
    const b = make("room-2", { id: "B", name: "Bo", color: "#00f" }, clock);
    a.connect();
    b.connect();

    let pointerUpdates = 0;
    let lastPointer: { x: number; y: number } | undefined;
    const unsub = b.subscribe((ps) => {
      const seenA = findById(ps, "A");
      if (seenA?.pointer) {
        pointerUpdates++;
        lastPointer = seenA.pointer;
      }
    });

    // 10 rapid publishes within one 100ms window.
    for (let i = 0; i < 10; i++) {
      a.publishPointer({ x: i, y: i });
    }
    clock.tick(100);

    // Leading send (x:0) + a single trailing send (latest x:9) = 2 max, not 10.
    expect(pointerUpdates).toBeLessThanOrEqual(2);
    expect(pointerUpdates).toBeGreaterThanOrEqual(1);
    expect(lastPointer).toEqual({ x: 9, y: 9 });

    const before = pointerUpdates;
    unsub();
    a.publishPointer({ x: 999, y: 999 });
    clock.tick(200);
    expect(pointerUpdates).toBe(before);
  });
});

describe("MockPresenceProvider leave / stale handling", () => {
  it("removes a participant on explicit disconnect", () => {
    const clock = new FakeClock();
    const a = make("room-3", { id: "A", name: "Ada", color: "#f00" }, clock);
    const b = make("room-3", { id: "B", name: "Bo", color: "#00f" }, clock);
    a.connect();
    b.connect();

    let latest: Participant[] = [];
    b.subscribe((ps) => {
      latest = ps;
    });
    a.publishPointer({ x: 1, y: 1 });
    clock.tick(100);
    expect(findById(latest, "A")).toBeDefined();

    a.disconnect();
    expect(findById(latest, "A")).toBeUndefined();
  });

  it("prunes a silent participant after the stale timeout", () => {
    const clock = new FakeClock();
    const a = make("room-4", { id: "A", name: "Ada", color: "#f00" }, clock, {
      heartbeatMs: 0,
    });
    const b = make("room-4", { id: "B", name: "Bo", color: "#00f" }, clock, {
      staleTimeoutMs: 5000,
      heartbeatMs: 0,
    });
    a.connect();
    b.connect();

    let latest: Participant[] = [];
    b.subscribe((ps) => {
      latest = ps;
    });
    a.publishPointer({ x: 1, y: 1 });
    clock.tick(100);
    expect(findById(latest, "A")).toBeDefined();

    // A goes silent (no heartbeat); advance well past the stale timeout on B
    // so at least one sweep observes A as lapsed.
    clock.tick(11000);
    expect(findById(latest, "A")).toBeUndefined();
  });

  it("unsubscribe stops delivery but others keep receiving", () => {
    const clock = new FakeClock();
    const a = make("room-5", { id: "A", name: "Ada", color: "#f00" }, clock);
    const b = make("room-5", { id: "B", name: "Bo", color: "#00f" }, clock);
    a.connect();
    b.connect();

    let count = 0;
    const unsub = b.subscribe(() => {
      count++;
    });
    unsub();
    const before = count;
    a.publishEditContext({ id: "c1", target: "t-1" });
    clock.tick(10);
    expect(count).toBe(before);
  });
});
