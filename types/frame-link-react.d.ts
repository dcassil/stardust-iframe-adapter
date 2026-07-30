/**
 * Local type surface for the `frame-link-react` peer.
 *
 * The peer is consumed from its sibling source repo (symlinked into
 * node_modules) which ships no built `dist`, so its published `types` entry does
 * not exist and its raw source cannot be safely type-checked from here (it
 * resolves its own React copy). At runtime, vitest aliases the bare specifier to
 * that real source; for the type-checker we declare exactly the surface this
 * adapter consumes, pinned to the SIFR-I-0001 protocol's structural needs.
 *
 * This mirrors `frame-link-react`'s public `src/index.ts` exports. It is a
 * first-class typed module declaration for an un-built workspace peer — not an
 * escape hatch. If the peer's public API changes, this declaration must be
 * updated in lockstep (the integration tests exercise the real runtime).
 */
declare module "frame-link-react" {
  import type { ReactNode } from "react";
  import type {
    FrameLink,
    FrameLinkOptions,
    MessageHandler,
    MessageRegistry,
    PayloadOf,
    ResponseOf,
  } from "frame-link";

  export type ConnectionStatus = "disconnected" | "connecting" | "connected";

  export interface FrameLinkContextValue<TRegistry extends MessageRegistry> {
    frameLink: FrameLink<TRegistry> | null;
    connected: boolean;
    connecting: boolean;
    error: Error | null;
    connect: (target: Window) => Promise<void>;
  }

  export interface FrameLinkProviderProps {
    children: ReactNode;
    options: FrameLinkOptions;
  }

  export const FrameLinkContext: import("react").Context<
    FrameLinkContextValue<MessageRegistry>
  >;

  export function FrameLinkProvider<TRegistry extends MessageRegistry>(
    props: FrameLinkProviderProps
  ): import("react").JSX.Element;

  export interface UseConnectionResult {
    connected: boolean;
    connecting: boolean;
    error: Error | null;
    connect: (target: Window) => Promise<void>;
  }

  export function useConnection(): UseConnectionResult;

  export function useFrameLink<
    TRegistry extends MessageRegistry
  >(): FrameLink<TRegistry>;

  export function useHandler<
    TRegistry extends MessageRegistry,
    TKey extends keyof TRegistry & string
  >(key: TKey, handler: MessageHandler<TRegistry, TKey>): void;

  export type SendFunction<
    TRegistry extends MessageRegistry,
    TKey extends keyof TRegistry & string
  > = (
    payload: PayloadOf<TRegistry, TKey>
  ) => Promise<ResponseOf<TRegistry, TKey>>;

  export function useSend<
    TRegistry extends MessageRegistry,
    TKey extends keyof TRegistry & string
  >(key: TKey): SendFunction<TRegistry, TKey>;

  export type {
    FrameLink,
    FrameLinkOptions,
    MessageDefinition,
    MessageHandler,
    MessageRegistry,
    PayloadOf,
    ResponseOf,
  } from "frame-link";
}
