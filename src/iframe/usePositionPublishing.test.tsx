import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { usePositionPublishing } from "./usePositionPublishing.js";
import type { ContentTarget, ScrollState } from "../protocol/registry.js";

/* -------------------------------------------------------------------------- */
/* Observer mocks (jsdom has neither ResizeObserver nor a spy-able instance)   */
/* -------------------------------------------------------------------------- */

class MockObserver {
  static instances: MockObserver[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  callback: () => void;
  constructor(callback: () => void) {
    this.callback = callback;
    MockObserver.instances.push(this);
  }
}

let addSpy: MockInstance;
let removeSpy: MockInstance;
let rafCbs: FrameRequestCallback[];

function flushRaf(): void {
  const cbs = rafCbs;
  rafCbs = [];
  act(() => {
    cbs.forEach((cb) => { cb(0); });
  });
}

beforeEach(() => {
  MockObserver.instances = [];
  rafCbs = [];
  vi.stubGlobal("ResizeObserver", MockObserver);
  vi.stubGlobal("MutationObserver", MockObserver);
  addSpy = vi.spyOn(window, "addEventListener");
  removeSpy = vi.spyOn(window, "removeEventListener");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function Harness(props: {
  onPositions: (p: ContentTarget[]) => void;
  onScroll: (s: ScrollState) => void;
}): null {
  usePositionPublishing({
    publishPositions: props.onPositions,
    publishScroll: props.onScroll,
    raf: (cb) => {
      rafCbs.push(cb);
      return rafCbs.length;
    },
    caf: () => {
      /* handled by flushRaf clearing the queue */
    },
  });
  return null;
}

describe("usePositionPublishing", () => {
  it("TC-001: every listener is removed with the same reference and observers disconnect", () => {
    const { unmount } = render(
      <Harness onPositions={vi.fn()} onScroll={vi.fn()} />
    );

    // Captured the scroll + resize listener references that were added.
    const addedScroll = addSpy.mock.calls.filter((c) => c[0] === "scroll");
    const addedResize = addSpy.mock.calls.filter((c) => c[0] === "resize");
    expect(addedScroll).toHaveLength(1);
    expect(addedResize).toHaveLength(1);

    // Two observers created (Resize + Mutation), each observing.
    expect(MockObserver.instances).toHaveLength(2);
    expect(MockObserver.instances.every((o) => o.observe.mock.calls.length >= 1)).toBe(
      true
    );

    unmount();

    const removedScroll = removeSpy.mock.calls.filter((c) => c[0] === "scroll");
    const removedResize = removeSpy.mock.calls.filter((c) => c[0] === "resize");
    // Same handler reference and same capture flag on removal.
    expect(removedScroll[0]![1]).toBe(addedScroll[0]![1]);
    expect(removedScroll[0]![2]).toBe(addedScroll[0]![2]);
    expect(removedResize[0]![1]).toBe(addedResize[0]![1]);
    // Both observers disconnected.
    expect(MockObserver.instances.every((o) => o.disconnect.mock.calls.length === 1)).toBe(
      true
    );
  });

  it("does not grow active listeners/observers across repeated mount/unmount", () => {
    for (let i = 0; i < 5; i++) {
      const { unmount } = render(
        <Harness onPositions={vi.fn()} onScroll={vi.fn()} />
      );
      unmount();
    }

    const netScroll =
      addSpy.mock.calls.filter((c) => c[0] === "scroll").length -
      removeSpy.mock.calls.filter((c) => c[0] === "scroll").length;
    const netResize =
      addSpy.mock.calls.filter((c) => c[0] === "resize").length -
      removeSpy.mock.calls.filter((c) => c[0] === "resize").length;
    expect(netScroll).toBe(0);
    expect(netResize).toBe(0);

    // Every observer that was created was also disconnected.
    expect(
      MockObserver.instances.every((o) => o.disconnect.mock.calls.length === 1)
    ).toBe(true);
  });

  it("TC-002: coalesces a burst of scroll/resize events into one push per frame", () => {
    const onPositions = vi.fn();
    const onScroll = vi.fn();
    render(<Harness onPositions={onPositions} onScroll={onScroll} />);

    // Setup publishes once; flush the setup frame.
    flushRaf();
    expect(onPositions).toHaveBeenCalledTimes(1);

    // Fire a burst within a single frame.
    act(() => {
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new Event("scroll"));
        window.dispatchEvent(new Event("resize"));
      }
      // Also fire observer callbacks in the same frame.
      MockObserver.instances.forEach((o) => { o.callback(); });
    });

    // Nothing extra published until the frame runs.
    expect(onPositions).toHaveBeenCalledTimes(1);

    flushRaf();
    // Exactly one additional push coalesced from the whole burst.
    expect(onPositions).toHaveBeenCalledTimes(2);
    expect(onScroll).toHaveBeenCalledTimes(2);
  });
});
