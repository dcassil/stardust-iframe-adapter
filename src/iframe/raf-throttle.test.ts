import { describe, expect, it, vi } from "vitest";
import { rafThrottle } from "./raf-throttle.js";

/** A controllable rAF: queues callbacks; `flush()` runs them. */
function makeFakeRaf() {
  const queue = new Map<number, FrameRequestCallback>();
  let next = 1;
  const raf = (cb: FrameRequestCallback): number => {
    const id = next++;
    queue.set(id, cb);
    return id;
  };
  const caf = (id: number): void => {
    queue.delete(id);
  };
  const flush = (): void => {
    const cbs = [...queue.values()];
    queue.clear();
    cbs.forEach((cb) => cb(performance.now()));
  };
  return { raf, caf, flush, pending: (): number => queue.size };
}

describe("rafThrottle", () => {
  it("TC-002: coalesces a burst of calls into a single run per frame", () => {
    const fake = makeFakeRaf();
    const cb = vi.fn();
    const throttled = rafThrottle(cb, fake.raf, fake.caf);

    throttled();
    throttled();
    throttled();
    expect(cb).not.toHaveBeenCalled(); // nothing until the frame runs
    expect(fake.pending()).toBe(1); // only one frame scheduled

    fake.flush();
    expect(cb).toHaveBeenCalledTimes(1);

    // A new burst after the frame schedules exactly one more run.
    throttled();
    throttled();
    fake.flush();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("cancel() drops a pending frame so the callback never runs", () => {
    const fake = makeFakeRaf();
    const cb = vi.fn();
    const throttled = rafThrottle(cb, fake.raf, fake.caf);

    throttled();
    expect(fake.pending()).toBe(1);
    throttled.cancel();
    expect(fake.pending()).toBe(0);
    fake.flush();
    expect(cb).not.toHaveBeenCalled();
  });
});
