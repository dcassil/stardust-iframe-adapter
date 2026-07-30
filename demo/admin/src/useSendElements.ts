/**
 * Host-side `cms/sendElements` sender.
 *
 * `useStardustHost` owns the connection but does not expose an element sender
 * (it is a read/overlay hook). The admin needs to PUSH content into the iframe,
 * so it binds `frame-link-react`'s generic `useSend` to the `cms/sendElements`
 * channel through a local registry adapter (mirroring the library's internal
 * `registry.ts`: the protocol's `request` field maps to frame-link's `payload`).
 *
 * This lives in the demo (not the library) because pushing content is a host-app
 * concern; the library deliberately keeps the host hook edit-store-agnostic.
 */

import { useSend } from "frame-link-react";
import type {
  ContentPayload,
  RequestOf,
  ResponseOf,
  StardustMessageKey,
} from "@stardust-cms/iframe-adapter/protocol";

/** frame-link registry view of the Stardust protocol (payload ← request). */
type StardustFrameLinkRegistry = {
  [K in StardustMessageKey]: {
    payload: RequestOf<K>;
    response: ResponseOf<K>;
  };
};

/** Returns a sender that pushes one {@link ContentPayload} via `cms/sendElements`. */
export function useSendElements(): (payload: ContentPayload) => Promise<void> {
  return useSend<StardustFrameLinkRegistry, "cms/sendElements">("cms/sendElements");
}
