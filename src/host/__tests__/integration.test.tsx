// @vitest-environment jsdom
/**
 * Host-side integration test (SIFR-T-0021).
 *
 * Drives the *public* host entry (`src/host.ts`) — `useStardustHost` +
 * `TargetAreaOverlay` + `mapGeometry` — against a mock frame-link peer that
 * emits a known `ContentTarget[]` + `ScrollState`, following the mock-peer test
 * pattern established for the iframe side. Asserts:
 *   - overlays render at the coordinates produced by `mapGeometry`;
 *   - `connectionState` reaches "connected";
 *   - a simulated drop emits the expected `InsertOp` via `onInsert`;
 *   - subscriptions/observer are torn down on unmount.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, createEvent, fireEvent, render, waitFor } from "@testing-library/react";
import { useRef, type ReactElement, type ReactNode } from "react";
import { FrameLinkProvider } from "frame-link-react";
// Import through the public host barrel to validate the package entry surface.
import {
  useStardustHost,
  TargetAreaOverlay,
  mapGeometry,
  DATA_TRANSFER_KEYS,
  type ContentTarget,
  type Geometry,
} from "../../host.js";
import { createMockPeer, scrollState, type MockPeer } from "./mockPeer.js";

let peer: MockPeer;
vi.mock("frame-link", () => ({
  createFrameLink: (): unknown => peer.frameLink,
}));

const ORIGIN = "https://iframe.example.com";

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
    targetId: "hero",
    isContainer: false,
    geometry: geom(200, 100, 400, 100),
    children: [],
  },
  {
    targetId: "body",
    isContainer: true,
    geometry: geom(400, 100, 400, 300),
    children: [
      {
        contentId: "c1",
        index: 0,
        isContainer: false,
        styleGroup: "g",
        geometry: geom(410, 110, 380, 40),
      },
    ],
  },
];

const SCROLL = scrollState(0, 50);

function makeDataTransfer(values: Record<string, string> = {}) {
  const store: Record<string, string> = { ...values };
  return {
    getData: (k: string): string => store[k] ?? "",
    setData: (k: string, v: string): void => {
      store[k] = v;
    },
    store,
  };
}

function fireDrop(node: Element, clientY: number, dataTransfer: unknown): void {
  const event = createEvent.drop(node, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clientY", { value: clientY });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  fireEvent(node, event);
}

interface HostViewProps {
  onInsert?: (targetId: string, index: number, payload: { type: string }) => void;
  onConnState?: (state: string) => void;
}

/** A minimal host component that consumes the public entry. */
function HostView({ onInsert, onConnState }: HostViewProps): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { targets, connectionState, callbacks } = useStardustHost(iframeRef, {
    origin: ORIGIN,
    ...(onInsert ? { onInsert } : {}),
  });

  onConnState?.(connectionState);

  return (
    <div>
      <iframe ref={iframeRef} title="preview" />
      <div data-testid="overlays">
        {targets.map((t) => (
          <TargetAreaOverlay key={t.targetId} target={t} {...callbacks} />
        ))}
      </div>
    </div>
  );
}

function wrapper({ children }: { children: ReactNode }): ReactElement {
  return (
    <FrameLinkProvider options={{ targetOrigin: ORIGIN }}>
      {children}
    </FrameLinkProvider>
  );
}

describe("host integration against a mock frame-link peer", () => {
  beforeEach(() => {
    peer = createMockPeer(FIXTURE);
  });

  it("TC-001: renders overlays at mapGeometry coordinates; connects", async () => {
    let latestState = "";
    const { container } = render(
      <HostView onConnState={(s) => (latestState = s)} />,
      { wrapper },
    );

    await waitFor(() => {
      expect(
        container.querySelectorAll("[data-target-id]").length,
      ).toBe(FIXTURE.length);
    });

    act(() => {
      peer.emit("cms/sendScrollPositions", SCROLL);
    });

    await waitFor(() => {
      expect(latestState).toBe("connected");
    });

    // scale defaults to 1 in jsdom; scrollOffset = { x: SCROLL.h, y: SCROLL.y }.
    // The scroll commit is rAF-coalesced, so wait for it to reflect.
    const transform = { scale: 1, scrollOffset: { x: SCROLL.h, y: SCROLL.y } };
    await waitFor(() => {
      const first = mapGeometry(FIXTURE[0]!.geometry, transform);
      const box = container.querySelector<HTMLDivElement>(
        `[data-target-id="${FIXTURE[0]!.targetId}"]`,
      )!;
      expect(box.style.top).toBe(`${first.top}px`);
    });

    for (const fixture of FIXTURE) {
      const expected = mapGeometry(fixture.geometry, transform);
      const box = container.querySelector<HTMLDivElement>(
        `[data-target-id="${fixture.targetId}"]`,
      )!;
      expect(box.style.top).toBe(`${expected.top}px`);
      expect(box.style.left).toBe(`${expected.left}px`);
      expect(box.style.width).toBe(`${expected.width}px`);
      expect(box.style.height).toBe(`${expected.height}px`);
    }
  });

  it("TC-002: a simulated drop emits the expected InsertOp through the public API", async () => {
    const onInsert = vi.fn();
    const { container } = render(<HostView onInsert={onInsert} />, { wrapper });

    await waitFor(() => {
      expect(container.querySelectorAll("[data-target-id]").length).toBe(
        FIXTURE.length,
      );
    });

    const heroBox = container.querySelector<HTMLDivElement>(
      '[data-target-id="hero"]',
    )!;
    const dataTransfer = makeDataTransfer({ [DATA_TRANSFER_KEYS.type]: "text" });

    fireEvent.dragOver(heroBox, { dataTransfer });
    fireDrop(heroBox, 0, dataTransfer); // empty target -> index 0

    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onInsert).toHaveBeenCalledWith("hero", 0, { type: "text" });
  });

  it("tears down subscriptions + frame-link on unmount", async () => {
    const { container, unmount } = render(<HostView />, { wrapper });

    await waitFor(() => {
      expect(container.querySelectorAll("[data-target-id]").length).toBe(
        FIXTURE.length,
      );
    });

    expect(peer.handlerCount("cms/sendElementPositions")).toBeGreaterThan(0);
    expect(peer.handlerCount("cms/sendScrollPositions")).toBeGreaterThan(0);

    unmount();

    expect(peer.destroyed).toBe(true);
    expect(peer.handlerCount("cms/sendElementPositions")).toBe(0);
    expect(peer.handlerCount("cms/sendScrollPositions")).toBe(0);
  });
});
