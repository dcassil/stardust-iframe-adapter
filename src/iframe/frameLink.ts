/**
 * Registry-bound frame-link-react hooks.
 *
 * `frame-link-react` exposes generic hooks (`useHandler`, `useSend`,
 * `useConnection`) parameterized by an arbitrary `MessageRegistry`. This module
 * pins them to the Stardust protocol's {@link StardustMessageRegistry} so every
 * iframe-side call site is type-checked against the real message keys/payloads
 * from SIFR-I-0001 — no string-literal keys, no `any`.
 */

import {
  useHandler as useHandlerGeneric,
  useSend as useSendGeneric,
} from "frame-link-react";
import type {
  RequestOf,
  ResponseOf,
  StardustMessageKey,
  StardustMessageRegistry,
} from "../protocol/registry.js";

/**
 * The Stardust registry satisfies frame-link's `MessageRegistry` shape: its
 * `MessageDefinition<Request, Response>` uses a `request` field where frame-link
 * uses `payload`. frame-link's `PayloadOf` reads `["payload"]`, so we bridge the
 * two views with this structural adapter registry — one place, fully typed.
 */
type StardustFrameLinkRegistry = {
  [K in StardustMessageKey]: {
    payload: RequestOf<K>;
    response: ResponseOf<K>;
  };
};

/** Register a handler for a Stardust message key (auto-cleaned on unmount). */
export function useStardustHandler<K extends StardustMessageKey>(
  key: K,
  handler: (request: RequestOf<K>) => ResponseOf<K> | Promise<ResponseOf<K>>
): void {
  useHandlerGeneric<StardustFrameLinkRegistry, K>(key, handler);
}

/** Create a type-safe sender for a Stardust message key. */
export function useStardustSend<K extends StardustMessageKey>(
  key: K
): (request: RequestOf<K>) => Promise<ResponseOf<K>> {
  return useSendGeneric<StardustFrameLinkRegistry, K>(key);
}

export type { StardustMessageRegistry };

/**
 * Named message-key constants, derived from the SIFR-I-0001 `MESSAGE_KEYS`
 * marker so call sites never hand-write channel string literals. Each value is
 * the literal key itself, but sourced from — and kept in sync with — the
 * protocol registry.
 */
export const CHANNELS = {
  requestTargetPositions: "cms/requestTargetPositions",
  sendElements: "cms/sendElements",
  sendElementPositions: "cms/sendElementPositions",
  sendScrollPositions: "cms/sendScrollPositions",
  updateStyles: "cms/updateStyles",
} as const satisfies Record<string, StardustMessageKey>;
