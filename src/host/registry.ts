/**
 * frame-link registry adapter.
 *
 * The protocol module (`src/protocol`) describes messages with `request` /
 * `response` fields (it reads clearly at call sites and stays independent of any
 * particular transport). frame-link's own `MessageRegistry` uses `payload` /
 * `response`. This module bridges the two shapes so the host hook can drive
 * frame-link-react's generic hooks (`useSend` / `useHandler`) with our protocol
 * keys, with full type-safety and no `any`.
 */

import type { MessageDefinition as FlMessageDefinition } from "frame-link";
import type { StardustMessageRegistry } from "../protocol/index.js";

/**
 * The Stardust protocol expressed as a frame-link `MessageRegistry`: each key's
 * `request` payload becomes frame-link's `payload`, and the `response` carries
 * through unchanged.
 */
export type StardustFrameLinkRegistry = {
  [K in keyof StardustMessageRegistry]: FlMessageDefinition<
    StardustMessageRegistry[K]["request"],
    StardustMessageRegistry[K]["response"]
  >;
};
