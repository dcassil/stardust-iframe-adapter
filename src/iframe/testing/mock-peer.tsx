/**
 * In-memory mock frame-link peer for iframe-adapter tests.
 *
 * Rather than spin up two `postMessage` windows, this provides a controllable
 * fake `FrameLink` instance and injects it (plus connection state) directly
 * through the real `FrameLinkContext` from `frame-link-react`. That exercises
 * the real `useConnection` / `useHandler` / `useSend` hooks the adapter uses,
 * while letting a test drive the `ready → connected` transition and deliver
 * inbound messages as if they came from the host peer.
 *
 * This file lives under `src/iframe/testing/` and is excluded from the package
 * build; it is a test-only utility.
 */

import { act, useMemo, useState, type ReactNode } from "react";
import { FrameLinkContext } from "frame-link-react";
import type {
  FrameLinkContextValue,
} from "frame-link-react";
import type { MessageHandler, MessageRegistry } from "frame-link";

type AnyHandler = MessageHandler<MessageRegistry, string>;

/** Handle a test uses to drive the mock peer from the outside. */
export interface MockPeer {
  /** How many times `connect()` has been called on this peer. */
  connectCount: number;
  /** Deliver an inbound message to whatever handler is registered for `key`. */
  deliver: (key: string, payload: unknown) => Promise<unknown>;
  /** Whether a handler is currently registered for `key`. */
  hasHandler: (key: string) => boolean;
  /** Payloads sent outbound via `send()`, in order, tagged by key. */
  readonly sent: ReadonlyArray<{ key: string; payload: unknown }>;
}

interface MockController extends MockPeer {
  setConnected: (value: boolean) => void;
  setConnecting: (value: boolean) => void;
}

/**
 * Build a fresh mock peer + a matching `FrameLinkContextValue`. The returned
 * `controller` is a stable object the test can read/drive; the `useProvider`
 * hook wires React state (connected/connecting) so state changes re-render.
 */
export function createMockPeer(): {
  controller: MockController;
  Provider: (props: { children: ReactNode }) => ReactNode;
} {
  const handlers = new Map<string, AnyHandler>();
  const sent: Array<{ key: string; payload: unknown }> = [];

  let setConnectedState: ((v: boolean) => void) | null = null;
  let setConnectingState: ((v: boolean) => void) | null = null;

  const frameLink = {
    connected: false,
    on: (key: string, handler: AnyHandler): (() => void) => {
      handlers.set(key, handler);
      return (): void => {
        if (handlers.get(key) === handler) handlers.delete(key);
      };
    },
    off: (key: string): void => {
      handlers.delete(key);
    },
    send: async (key: string, payload: unknown): Promise<unknown> => {
      sent.push({ key, payload });
      return undefined;
    },
    connect: async (): Promise<void> => {
      controller.connectCount += 1;
    },
    destroy: (): void => {
      handlers.clear();
    },
  };

  const controller: MockController = {
    connectCount: 0,
    sent,
    hasHandler: (key: string): boolean => handlers.has(key),
    deliver: async (key: string, payload: unknown): Promise<unknown> => {
      const handler = handlers.get(key);
      if (!handler) throw new Error(`no handler registered for "${key}"`);
      let result: unknown;
      await act(async () => {
        result = await handler(payload as never);
      });
      return result;
    },
    setConnected: (value: boolean): void => {
      act(() => {
        setConnectedState?.(value);
      });
    },
    setConnecting: (value: boolean): void => {
      act(() => {
        setConnectingState?.(value);
      });
    },
  };

  function Provider({ children }: { children: ReactNode }): ReactNode {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    setConnectedState = setConnected;
    setConnectingState = setConnecting;

    const value = useMemo<FrameLinkContextValue<MessageRegistry>>(
      () => ({
        frameLink: frameLink as unknown as FrameLinkContextValue<MessageRegistry>["frameLink"],
        connected,
        connecting,
        error: null,
        connect: frameLink.connect,
      }),
      [connected, connecting]
    );

    return (
      <FrameLinkContext.Provider value={value}>
        {children}
      </FrameLinkContext.Provider>
    );
  }

  return { controller, Provider };
}
