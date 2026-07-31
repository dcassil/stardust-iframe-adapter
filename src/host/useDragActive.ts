/**
 * `useDragActive` — a document-level native-drag activity detector.
 *
 * ## Why this exists
 *
 * The overlay's drop area and insertion zones sit above the iframe. To keep the
 * iframe usable while idle they are `pointer-events: none`, and to receive drag
 * events during a drag they must flip to `pointer-events: auto`. The obvious
 * trigger — the target's own `onDragEnter` — is a deadlock: a `pointer-events:
 * none` element never receives `dragenter`, so it can never learn a drag is in
 * progress, so it never becomes interactive. During a real (native HTML5) drag
 * the events pass straight through the overlay to the iframe underneath.
 *
 * The prototype broke the deadlock with a GLOBAL "is a drag happening?" flag set
 * on the palette's `dragstart`. This hook reproduces that: it installs a SINGLE,
 * ref-counted, document-level listener set:
 *
 *  - `dragstart` → active (fires on the drag SOURCE, which lives in the same
 *    admin document as the overlay, so a palette or item drag is detected).
 *  - `dragend` + `drop` → inactive (drag finished, dropped, or cancelled).
 *
 * Because `dragstart`/`dragend` fire on the source node (not the overlay), they
 * are unaffected by the overlay's `pointer-events`, so detection is reliable.
 *
 * ## Ref-counting
 *
 * Many overlays mount at once; they must not each add their own document
 * listeners. A module-level subscriber set holds one listener installation for
 * the whole document: the first subscriber installs the listeners, the last to
 * unmount removes them. Every subscriber is notified of state changes.
 */

import { useEffect, useState } from "react";

type Listener = (active: boolean) => void;

const subscribers = new Set<Listener>();
let installed = false;
let active = false;

function setActive(next: boolean): void {
  if (active === next) return;
  active = next;
  for (const listener of subscribers) listener(active);
}

function onDragStart(): void {
  setActive(true);
}

function onDragEndOrDrop(): void {
  setActive(false);
}

function install(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("dragstart", onDragStart, true);
  document.addEventListener("dragend", onDragEndOrDrop, true);
  document.addEventListener("drop", onDragEndOrDrop, true);
}

function uninstall(): void {
  if (!installed || typeof document === "undefined") return;
  installed = false;
  active = false;
  document.removeEventListener("dragstart", onDragStart, true);
  document.removeEventListener("dragend", onDragEndOrDrop, true);
  document.removeEventListener("drop", onDragEndOrDrop, true);
}

/**
 * Subscribe to the shared drag-activity state.
 *
 * @returns `true` while a native drag is in progress anywhere in the document,
 * `false` otherwise.
 */
export function useDragActive(): boolean {
  const [value, setValue] = useState<boolean>(active);

  useEffect(() => {
    const listener: Listener = (next) => setValue(next);
    subscribers.add(listener);
    install();
    // Sync in case the drag state changed between render and effect.
    setValue(active);

    return () => {
      subscribers.delete(listener);
      if (subscribers.size === 0) uninstall();
    };
  }, []);

  return value;
}
