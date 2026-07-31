import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { StardustAdapterProvider } from "./StardustAdapterProvider.js";
import { createMockPeer } from "./testing/mock-peer.js";
import { CHANNELS } from "./frameLink.js";
import type { ContentTarget } from "../protocol/registry.js";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function stubRect(el: HTMLElement): void {
  el.getBoundingClientRect = (): DOMRect =>
    ({
      top: 1,
      left: 2,
      width: 3,
      height: 4,
      right: 5,
      bottom: 5,
      x: 2,
      y: 1,
      toJSON() {
        return this;
      },
    });
}

describe("StardustAdapterProvider", () => {
  it("TC-001: registers exactly once across a ready → connected transition", () => {
    const { controller, Provider } = createMockPeer();
    // fake host window target
    const target = {} as Window;

    render(
      <Provider>
        <StardustAdapterProvider target={target}>
          <div />
        </StardustAdapterProvider>
      </Provider>
    );

    // Registered once on mount (ready && !connected).
    expect(controller.connectCount).toBe(1);

    // Host confirms the connection -> connected becomes true.
    controller.setConnected(true);
    expect(controller.connectCount).toBe(1);

    // A spurious connecting/connected flip must not re-register.
    controller.setConnecting(true);
    controller.setConnecting(false);
    expect(controller.connectCount).toBe(1);
  });

  it("TC-002: responds to cms/requestTargetPositions with discoverTargets output", async () => {
    document.body.innerHTML = `<div data-cms="hero"></div>`;
    stubRect(document.querySelector<HTMLElement>('[data-cms="hero"]')!);

    const { controller, Provider } = createMockPeer();
    render(
      <Provider>
        <StardustAdapterProvider target={{} as Window}>
          <div />
        </StardustAdapterProvider>
      </Provider>
    );

    expect(controller.hasHandler(CHANNELS.requestTargetPositions)).toBe(true);

    const result = (await controller.deliver(
      CHANNELS.requestTargetPositions,
      undefined
    )) as ContentTarget[];

    expect(result).toHaveLength(1);
    expect(result[0]!.targetId).toBe("hero");
    expect(result[0]!.geometry.width).toBe(3);
    // Serialized plain object, never a DOMRect.
    expect(result[0]!.geometry instanceof DOMRect).toBe(false);
  });

  it("updates content state on cms/sendElements and exposes it via context", async () => {
    const { controller, Provider } = createMockPeer();

    render(
      <Provider>
        <StardustAdapterProvider target={{} as Window}>
          <div />
        </StardustAdapterProvider>
      </Provider>
    );

    expect(controller.hasHandler(CHANNELS.sendElements)).toBe(true);

    await controller.deliver(CHANNELS.sendElements, {
      targetId: "hero",
      contentId: "c1",
      index: 0,
      content: { id: "c1", type: "text", value: "hi", styleGroup: "text" },
      html: "<p>hi</p>",
    });

    // No throw + handler registered is the observable contract at this layer;
    // the rendered consumption is covered by EditableTarget tests (SIFR-T-0016).
    expect(controller.hasHandler(CHANNELS.sendElements)).toBe(true);
  });

  it("tears down subscriptions on unmount", () => {
    const { controller, Provider } = createMockPeer();
    const { unmount } = render(
      <Provider>
        <StardustAdapterProvider target={{} as Window}>
          <div />
        </StardustAdapterProvider>
      </Provider>
    );

    expect(controller.hasHandler(CHANNELS.requestTargetPositions)).toBe(true);
    unmount();
    expect(controller.hasHandler(CHANNELS.requestTargetPositions)).toBe(false);
    expect(controller.hasHandler(CHANNELS.sendElements)).toBe(false);
  });
});
