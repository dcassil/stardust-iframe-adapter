// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FrameLinkProvider } from "frame-link-react";
import type { ContentTarget, Geometry } from "../protocol/registry.js";
import { mapGeometry } from "./mapGeometry.js";
import { useStardustHost } from "./useStardustHost.js";
import { createMockPeer, scrollState, type MockPeer } from "./__tests__/mockPeer.js";

// A mutable holder the mocked `createFrameLink` returns.
let peer: MockPeer;
vi.mock("frame-link", () => ({
  createFrameLink: (): unknown => peer.frameLink,
}));

function geom(top: number, left: number, width: number, height: number): Geometry {
  return {
    top,
    left,
    width,
    height,
    x: left,
    y: top,
    right: left + width,
    bottom: top + height,
  };
}

const FIXTURE: ContentTarget[] = [
  {
    targetId: "t1",
    isContainer: false,
    geometry: geom(200, 100, 400, 100),
    children: [
      {
        contentId: "c1",
        index: 0,
        isContainer: false,
        styleGroup: "g",
        geometry: geom(210, 110, 380, 40),
      },
    ],
  },
];

function wrapper({ children }: { children: ReactNode }) {
  return (
    <FrameLinkProvider options={{ targetOrigin: "https://iframe.example.com" }}>
      {children}
    </FrameLinkProvider>
  );
}

/** A fake iframe ref whose `contentWindow` is a truthy stand-in. */
function fakeIframeRef() {
  const iframe = document.createElement("iframe");
  // jsdom gives iframes a real contentWindow once attached.
  document.body.appendChild(iframe);
  return { current: iframe };
}

describe("useStardustHost", () => {
  beforeEach(() => {
    peer = createMockPeer(FIXTURE);
    document.body.innerHTML = "";
  });

  it("TC-001: requests positions on connect and maps them to host coords", async () => {
    const ref = fakeIframeRef();

    const { result } = renderHook(
      () =>
        useStardustHost(ref, { origin: "https://iframe.example.com" }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.targets).toHaveLength(1);
    });

    // Emit a scroll so scrollOffset is known; scale defaults to 1 in jsdom
    // (no layout), so mapping is identity minus scroll.
    act(() => {
      peer.emit("cms/sendScrollPositions", scrollState(0, 0));
    });

    await waitFor(() => {
      expect(result.current.connectionState).toBe("connected");
    });

    const scale = result.current.scale;
    const scrollOffset = { x: 0, y: 0 };
    const mapped = result.current.targets[0]!;
    expect(mapped.targetId).toBe("t1");
    expect(mapped.geometry).toEqual(
      mapGeometry(FIXTURE[0]!.geometry, { scale, scrollOffset }),
    );
    expect(mapped.children[0]!.geometry).toEqual(
      mapGeometry(FIXTURE[0]!.children[0]!.geometry, { scale, scrollOffset }),
    );

    expect(
      peer.sends.some((s) => s.key === "cms/requestTargetPositions"),
    ).toBe(true);
  });

  it("TC-002: coalesces rapid scroll updates to the final offset", async () => {
    const ref = fakeIframeRef();

    const { result } = renderHook(
      () => useStardustHost(ref, { origin: "https://iframe.example.com" }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.targets).toHaveLength(1);
    });

    act(() => {
      for (let i = 1; i <= 10; i++) {
        peer.emit("cms/sendScrollPositions", scrollState(0, i * 10));
      }
    });

    // Final scroll y = 100; the target top (200) projects to 200 - 100 = 100
    // at scale 1.
    await waitFor(() => {
      expect(result.current.targets[0]!.geometry.top).toBe(100);
    });
  });

  it("throws when origin is a wildcard", () => {
    const ref = fakeIframeRef();
    expect(() =>
      renderHook(() => useStardustHost(ref, { origin: "*" }), { wrapper }),
    ).toThrow(/origin/);
  });

  it("subscribes to both streamed message keys and tears down on unmount", async () => {
    const ref = fakeIframeRef();
    const { unmount, result } = renderHook(
      () => useStardustHost(ref, { origin: "https://iframe.example.com" }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.targets).toHaveLength(1);
    });

    expect(peer.handlerCount("cms/sendElementPositions")).toBeGreaterThan(0);
    expect(peer.handlerCount("cms/sendScrollPositions")).toBeGreaterThan(0);

    unmount();

    // Provider destroys the frame-link instance; handler subscriptions are gone.
    expect(peer.destroyed).toBe(true);
    expect(peer.handlerCount("cms/sendElementPositions")).toBe(0);
    expect(peer.handlerCount("cms/sendScrollPositions")).toBe(0);
  });

  it("returned callbacks.onInsert reflects a NEW onInsert identity swapped in after mount (stale-callback regression)", async () => {
    const ref = fakeIframeRef();

    const first = vi.fn();
    const { result, rerender } = renderHook(
      ({ onInsert }: { onInsert: (t: string, i: number, p: { type: string }) => void }) =>
        useStardustHost(ref, { origin: "https://iframe.example.com", onInsert }),
      { wrapper, initialProps: { onInsert: first } },
    );

    await waitFor(() => {
      expect(result.current.targets).toHaveLength(1);
    });

    // Swap in a NEW callback identity after mount.
    const second = vi.fn();
    rerender({ onInsert: second });

    // The bundled callback must be the NEW function, not the stale first one.
    result.current.callbacks.onInsert?.("t1", 0, { type: "text" });
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith("t1", 0, { type: "text" });
    expect(first).not.toHaveBeenCalled();
  });

  it("updates targets when cms/sendElementPositions streams new geometry", async () => {
    const ref = fakeIframeRef();
    const { result } = renderHook(
      () => useStardustHost(ref, { origin: "https://iframe.example.com" }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.targets).toHaveLength(1);
    });

    const updated: ContentTarget[] = [
      { ...FIXTURE[0]!, geometry: geom(500, 500, 50, 50), children: [] },
    ];
    act(() => {
      peer.emit("cms/sendElementPositions", updated);
    });

    await waitFor(() => {
      expect(result.current.targets[0]!.geometry.top).toBe(500);
      expect(result.current.targets[0]!.children).toHaveLength(0);
    });
  });
});
