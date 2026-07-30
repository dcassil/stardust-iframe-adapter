import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { StardustAdapterProvider } from "./StardustAdapterProvider.js";
import { EditableTarget } from "./EditableTarget.js";
import { createMockPeer } from "./testing/mock-peer.js";
import { CHANNELS } from "./frameLink.js";
import type { ContentPayload, ContentTarget } from "../protocol/index.js";

/* -------------------------------------------------------------------------- */
/* Controllable frame + observer environment                                  */
/* -------------------------------------------------------------------------- */

class MockObserver {
  static instances: MockObserver[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  callback: () => void;
  constructor(callback: () => void) {
    this.callback = callback;
    MockObserver.instances.push(this);
  }
}

let rafCbs: FrameRequestCallback[];
function flushFrame(): void {
  const cbs = rafCbs;
  rafCbs = [];
  act(() => {
    cbs.forEach((cb) => cb(0));
  });
}

beforeEach(() => {
  MockObserver.instances = [];
  rafCbs = [];
  vi.stubGlobal("ResizeObserver", MockObserver);
  vi.stubGlobal("MutationObserver", MockObserver);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
    rafCbs.push(cb);
    return rafCbs.length;
  });
  vi.stubGlobal("cancelAnimationFrame", (): void => {
    /* pending frames are discarded via flushFrame clearing the queue */
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

/* -------------------------------------------------------------------------- */
/* A tiny consumer app driving content purely through fixtures                */
/* -------------------------------------------------------------------------- */

function stubRects(): void {
  document
    .querySelectorAll<HTMLElement>("[data-cms], [data-cms-content]")
    .forEach((el, i) => {
      el.getBoundingClientRect = (): DOMRect =>
        ({
          top: i,
          left: 0,
          width: 100,
          height: 20,
          right: 100,
          bottom: 20 + i,
          x: 0,
          y: i,
          toJSON() {
            return this;
          },
        }) as DOMRect;
    });
}

const heroContent: ContentPayload = {
  targetId: "hero",
  contentId: "c1",
  index: 0,
  content: { id: "c1", type: "text", value: "Headline", styleGroup: "body" },
};

function TestApp({ peerTarget }: { peerTarget: Window }): React.JSX.Element {
  return (
    <StardustAdapterProvider target={peerTarget}>
      <EditableTarget targetId="hero" />
      <EditableTarget targetId="grid" isContainer />
    </StardustAdapterProvider>
  );
}

describe("iframe adapter integration (mock frame-link peer)", () => {
  it("TC-001: responds to cms/requestTargetPositions with the mounted EditableTarget tree", async () => {
    const { controller, Provider } = createMockPeer();
    render(
      <Provider>
        <TestApp peerTarget={{} as Window} />
      </Provider>
    );

    // Registered exactly once.
    expect(controller.connectCount).toBe(1);

    // Host pushes content into the hero target; EditableTarget renders it.
    await controller.deliver(CHANNELS.sendElements, heroContent);
    stubRects();

    const result = (await controller.deliver(
      CHANNELS.requestTargetPositions,
      undefined
    )) as ContentTarget[];

    const ids = result.map((t) => t.targetId).sort();
    expect(ids).toEqual(["grid", "hero"]);

    const hero = result.find((t) => t.targetId === "hero")!;
    expect(hero.children).toHaveLength(1);
    expect(hero.children[0]!.contentId).toBe("c1");
    expect(hero.children[0]!.styleGroup).toBe("body");
    // Geometry crossed the boundary as a plain object, never a DOMRect.
    expect(hero.geometry instanceof DOMRect).toBe(false);
  });

  it("TC-002 (throttle): a burst of resize/mutation events yields one push per frame", () => {
    const { controller, Provider } = createMockPeer();
    render(
      <Provider>
        <TestApp peerTarget={{} as Window} />
      </Provider>
    );
    stubRects();

    // The setup publish scheduled a frame; flush it and count that baseline.
    flushFrame();
    const baseline = controller.sent.filter(
      (m) => m.key === CHANNELS.sendElementPositions
    ).length;
    expect(baseline).toBe(1);

    // Fire a burst within a single frame: scroll/resize events + observers.
    act(() => {
      for (let i = 0; i < 8; i++) {
        window.dispatchEvent(new Event("scroll"));
        window.dispatchEvent(new Event("resize"));
      }
      MockObserver.instances.forEach((o) => o.callback());
    });

    // Not yet pushed — coalesced into the pending frame.
    const midway = controller.sent.filter(
      (m) => m.key === CHANNELS.sendElementPositions
    ).length;
    expect(midway).toBe(baseline);

    flushFrame();
    const afterFrame = controller.sent.filter(
      (m) => m.key === CHANNELS.sendElementPositions
    ).length;
    // Exactly one additional push for the whole burst.
    expect(afterFrame).toBe(baseline + 1);

    // A scroll push also carried scroll state.
    expect(
      controller.sent.some((m) => m.key === CHANNELS.sendScrollPositions)
    ).toBe(true);
  });

  it("cms/sendElements flows through the provider handler without error", async () => {
    const { controller, Provider } = createMockPeer();
    render(
      <Provider>
        <StardustAdapterProvider target={{} as Window}>
          <EditableTarget targetId="hero" />
        </StardustAdapterProvider>
      </Provider>
    );

    await controller.deliver(CHANNELS.sendElements, {
      targetId: "hero",
      contentId: "c1",
      index: 0,
      content: { id: "c1", type: "text", value: "hi", styleGroup: "body" },
    } satisfies ContentPayload);

    expect(controller.hasHandler(CHANNELS.sendElements)).toBe(true);
  });
});
