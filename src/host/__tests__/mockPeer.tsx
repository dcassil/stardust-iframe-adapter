/**
 * Mock frame-link peer harness for host-side tests.
 *
 * Mirrors the mock-peer pattern used by the frame-link-react unit tests: mock
 * `createFrameLink` so a real `FrameLinkProvider` wraps a controllable fake
 * `FrameLink` instance. The fake:
 *
 *  - resolves `send('cms/requestTargetPositions')` with a configured
 *    `ContentTarget[]` fixture;
 *  - records handlers registered via `on(key, handler)` so a test can emit
 *    `cms/sendElementPositions` / `cms/sendScrollPositions` messages;
 *  - flips `connected` on `connect()` so `useConnection` reports connected.
 *
 * `vi.mock("frame-link", ...)` must be hoisted by the test file; this module
 * exposes the factory + control surface it wires up.
 */

import { act, render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { FrameLinkProvider } from "frame-link-react";
import type { ContentTarget, ScrollState } from "../../protocol/registry.js";

/** A handler registered by the hook via `frameLink.on`. */
type AnyHandler = (payload: unknown) => unknown;

/** The control surface a test uses to drive the mock peer. */
export interface MockPeer {
  /** The fake FrameLink instance handed to the provider. */
  frameLink: {
    send: (key: string, payload: unknown) => Promise<unknown>;
    on: (key: string, handler: AnyHandler) => () => void;
    off: (key: string) => void;
    connect: (target: Window) => Promise<void>;
    destroy: () => void;
    connected: boolean;
  };
  /** Emit an iframe → host message to whatever handler the hook registered. */
  emit(key: string, payload: unknown): void;
  /** Number of live handlers currently registered for a key. */
  handlerCount(key: string): number;
  /** Calls made to `send`, for assertions. */
  sends: { key: string; payload: unknown }[];
  /** Whether `destroy` was called. */
  destroyed: boolean;
}

/**
 * Build a mock peer. `positions` is returned from
 * `send('cms/requestTargetPositions')`.
 */
export function createMockPeer(positions: ContentTarget[]): MockPeer {
  const handlers = new Map<string, Set<AnyHandler>>();
  const sends: { key: string; payload: unknown }[] = [];
  const state = { destroyed: false };

  const frameLink: MockPeer["frameLink"] = {
    connected: false,
    send: (key: string, payload: unknown): Promise<unknown> => {
      sends.push({ key, payload });
      if (key === "cms/requestTargetPositions") {
        return Promise.resolve(positions);
      }
      return Promise.resolve(undefined);
    },
    on: (key: string, handler: AnyHandler): (() => void) => {
      let set = handlers.get(key);
      if (!set) {
        set = new Set();
        handlers.set(key, set);
      }
      set.add(handler);
      return (): void => {
        set.delete(handler);
      };
    },
    off: (key: string): void => {
      handlers.delete(key);
    },
    connect: (): Promise<void> => {
      frameLink.connected = true;
      return Promise.resolve();
    },
    destroy: (): void => {
      state.destroyed = true;
      handlers.clear();
    },
  };

  return {
    frameLink,
    emit(key: string, payload: unknown): void {
      const set = handlers.get(key);
      if (!set) {
        return;
      }
      for (const handler of set) {
        handler(payload);
      }
    },
    handlerCount(key: string): number {
      return handlers.get(key)?.size ?? 0;
    },
    sends,
    get destroyed(): boolean {
      return state.destroyed;
    },
  };
}

/** Convenience: a `ScrollState`. */
export function scrollState(h: number, y: number): ScrollState {
  return { h, y, isTop: y === 0, isBottom: false };
}

/** Render `ui` inside a real `FrameLinkProvider` (with an explicit origin). */
export function renderWithHost(
  ui: ReactElement,
  origin = "https://iframe.example.com",
): RenderResult {
  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <FrameLinkProvider options={{ targetOrigin: origin }}>
        {children}
      </FrameLinkProvider>
    );
  }
  return render(ui, { wrapper: Wrapper });
}

/** Re-export `act` so tests share one copy. */
export { act };
