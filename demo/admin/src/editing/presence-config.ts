/**
 * Presence feature flag + local participant identity for the admin demo.
 *
 * PRESENCE / EDIT-LOCKS ONLY — no CRDT/OT, no collaborative editing. The flag
 * is OFF by default: when `PRESENCE_ENABLED` is false, no provider is
 * constructed, no overlays mount, and the optional Socket.IO adapter is never
 * imported (the plain demo is byte-for-byte unchanged).
 */

/** Read the presence flag from Vite env; default false. */
export const PRESENCE_ENABLED: boolean =
  (import.meta.env.VITE_PRESENCE_ENABLED as string | undefined) === "true";

/** The BroadcastChannel/app room name the mock adapter fans out over. */
export const PRESENCE_CHANNEL = "stardust-demo-presence";

const NAMES = ["Ada", "Grace", "Alan", "Edsger", "Barbara", "Linus"];
const COLORS = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#008080"];

/** Build a fresh, per-tab local participant identity. */
export function makeLocalIdentity(): {
  id: string;
  name: string;
  color: string;
} {
  const n = Math.floor(Math.random() * NAMES.length);
  const suffix = Math.random().toString(36).slice(2, 6);
  return {
    id: `local-${suffix}`,
    name: NAMES[n] ?? "Editor",
    color: COLORS[n] ?? "#666",
  };
}
