// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { usePointerPublishing } from "./usePointerPublishing.js";
import type { PointerState } from "../protocol/registry.js";

let rafCbs: FrameRequestCallback[];

function flushRaf(): void {
  const cbs = rafCbs;
  rafCbs = [];
  act(() => {
    cbs.forEach((cb) => {
      cb(0);
    });
  });
}

beforeEach(() => {
  rafCbs = [];
  // jsdom reports innerWidth/innerHeight of 1024x768 by default, giving a
  // deterministic normalization denominator.
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Harness(props: {
  onPointer: (p: PointerState) => void;
  enabled?: boolean;
}): null {
  usePointerPublishing({
    ...(props.enabled !== undefined ? { enabled: props.enabled } : {}),
    publishPointer: props.onPointer,
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

function movePointer(clientX: number, clientY: number): void {
  act(() => {
    const ev = new Event("pointermove") as unknown as {
      clientX: number;
      clientY: number;
    };
    ev.clientX = clientX;
    ev.clientY = clientY;
    document.dispatchEvent(ev as unknown as Event);
  });
}

describe("usePointerPublishing", () => {
  it("normalizes pointermove to 0..1 of the viewport and coalesces per frame", () => {
    const onPointer = vi.fn();
    render(<Harness onPointer={onPointer} />);

    // Burst within one frame.
    movePointer(256, 384);
    movePointer(512, 384); // last one wins
    expect(onPointer).not.toHaveBeenCalled();

    flushRaf();
    expect(onPointer).toHaveBeenCalledTimes(1);
    const payload = onPointer.mock.calls[0]![0] as PointerState;
    expect(payload.inside).toBe(true);
    // 512 / innerWidth, 384 / innerHeight — both within 0..1.
    expect(payload.x).toBeCloseTo(512 / window.innerWidth);
    expect(payload.y).toBeCloseTo(384 / window.innerHeight);
  });

  it("sends a leave signal (inside:false) immediately on pointerleave", () => {
    const onPointer = vi.fn();
    render(<Harness onPointer={onPointer} />);

    movePointer(100, 100);
    act(() => {
      document.dispatchEvent(new Event("pointerleave"));
    });
    // Leave is not throttled — it fires synchronously and supersedes the move.
    expect(onPointer).toHaveBeenCalledWith({ x: 0, y: 0, inside: false });
    // The coalesced move frame, when flushed, has nothing pending.
    onPointer.mockClear();
    flushRaf();
    expect(onPointer).not.toHaveBeenCalled();
  });

  it("installs no listeners and never publishes when disabled", () => {
    const onPointer = vi.fn();
    const addSpy = vi.spyOn(document, "addEventListener");
    render(<Harness onPointer={onPointer} enabled={false} />);
    expect(
      addSpy.mock.calls.some((c) => c[0] === "pointermove"),
    ).toBe(false);
    movePointer(100, 100);
    flushRaf();
    expect(onPointer).not.toHaveBeenCalled();
  });

  it("removes its listeners on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<Harness onPointer={vi.fn()} />);
    unmount();
    expect(
      removeSpy.mock.calls.some((c) => c[0] === "pointermove"),
    ).toBe(true);
    expect(
      removeSpy.mock.calls.some((c) => c[0] === "pointerleave"),
    ).toBe(true);
  });
});
