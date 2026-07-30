/**
 * `HostBridgeContext` — a tiny seam that hands the shell's `onSelect` callback
 * (which re-injects into the iframe) to sidebar children.
 *
 * WHY: `@stardust-cms/dashboard`'s `HostShell` re-injects the store snapshot into
 * the iframe only when an op flows through its internal `dispatch` — i.e. via the
 * overlay callbacks (`onInsert` / `onMove` / `onSelect`) or on (re)connect. The
 * bundled `SidePanel` applies `edit` ops through `useContentStore().apply`, which
 * updates the store + React snapshot but is NOT one of those dispatch paths, so a
 * side-panel field edit never reaches the iframe.
 *
 * To make field edits live without forking the shell, the admin captures the
 * shell's `onSelect` callback in `renderOverlayChrome` (the one place the shell
 * exposes it) into this context, and the custom side panel calls it after an edit
 * — a no-op re-select of the edited item that triggers the shell's dispatch →
 * `cms/sendElements` re-injection of the now-updated snapshot.
 */

import { createContext, useContext } from "react";

/** Re-inject the current store snapshot by re-selecting a target/item. */
export type Reinject = (targetId: string, contentId?: string) => void;

export const HostBridgeContext = createContext<Reinject | null>(null);

/** Read the shell re-inject bridge. Returns a no-op until the shell wires it. */
export function useReinject(): Reinject {
  const fn = useContext(HostBridgeContext);
  return fn ?? (() => {});
}
