/**
 * Admin host context.
 *
 * `HostCanvas` mounts `useStardustHost` and publishes its result — mapped
 * `targets`, `scale`, `connectionState`, and the edit-intent `callbacks` — plus
 * the current design width through this context. Overlay and side-panel code
 * (SIFR-T-0010) consume it via `useHost()` without re-establishing the
 * connection, so there is exactly one host connection per embedded iframe.
 */

import { createContext, useContext } from "react";
import type {
  ConnectionState,
  MappedTarget,
  OperationCallbacks,
} from "@stardust-cms/iframe-adapter/host";

export interface HostContextValue {
  /** Targets mapped into host (canvas) coordinates, ready for overlays. */
  targets: MappedTarget[];
  /** Current iframe render scale (canvas width / design width). */
  scale: number;
  /** Connection lifecycle state. */
  connectionState: ConnectionState;
  /** Edit-intent callbacks bundled by the hook for spreading onto overlays. */
  callbacks: OperationCallbacks;
  /** The unscaled design width the iframe document is laid out at. */
  designWidth: number;
}

export const HostContext = createContext<HostContextValue | null>(null);

/** Read the host context. Throws if used outside `HostCanvas`. */
export function useHost(): HostContextValue {
  const ctx = useContext(HostContext);
  if (!ctx) {
    throw new Error("useHost must be used within <HostCanvas>");
  }
  return ctx;
}
