/**
 * `StardustAdapterProvider` — the iframe-side adapter root.
 *
 * Cleaned successor to the prototype `CmsBase.context.tsx`. It:
 *
 *  1. Registers the frame-link target **exactly once** — the prototype re-ran
 *     its registration effect whenever `connected` changed, causing repeated
 *     `connect()` calls; here the connect is fired once when transport is
 *     `ready && !connected` and guarded so a later `connected` transition does
 *     not re-register (REQ-001).
 *  2. Subscribes to `cms/requestTargetPositions`, responding with the live
 *     {@link discoverTargets} output (REQ-006).
 *  3. Subscribes to `cms/sendElements`, folding each payload into the content
 *     map exposed to `EditableTarget` (REQ-006).
 *
 * It depends only on `react`, `frame-link-react`, and the SIFR-I-0001 protocol
 * module — no host UI contexts (NFR-003). All subscriptions are auto-torn-down
 * by `frame-link-react`'s `useHandler` on unmount.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useConnection } from "frame-link-react";
import type { ContentTarget } from "../protocol/registry.js";
import { discoverTargets } from "./discovery.js";
import {
  mergeContent,
  StardustContentContext,
  type ContentByTarget,
  type StardustContentContextValue,
} from "./content-context.js";
import {
  CHANNELS,
  useStardustHandler,
  useStardustSend,
} from "./frameLink.js";
import { usePositionPublishing } from "./usePositionPublishing.js";

/** Props for {@link StardustAdapterProvider}. */
export interface StardustAdapterProviderProps {
  children: ReactNode;
  /**
   * The window to register/connect the frame-link target to. Defaults to
   * `window.parent` (the host embedding this iframe). Injectable for tests.
   */
  target?: Window;
  /**
   * The DOM root discovery walks. Defaults to `document`. Injectable for tests.
   */
  root?: Document | HTMLElement;
}

export function StardustAdapterProvider({
  children,
  target,
  root,
}: StardustAdapterProviderProps): ReactNode {
  const { connect, connected, connecting } = useConnection();

  const [content, setContent] = useState<ContentByTarget>({});

  // Discovery root and target are resolved lazily so the module stays
  // importable in non-DOM environments; they are only read inside effects.
  const rootRef = useRef(root);
  rootRef.current = root;

  /* --- One-time registration (REQ-001) --------------------------------- */
  // A ref guard ensures `connect` fires at most once for this provider
  // instance, regardless of how many times `connected`/`connecting` toggle.
  const hasRegisteredRef = useRef(false);

  useEffect((): void => {
    if (hasRegisteredRef.current) return;
    if (connected || connecting) return;

    const resolvedTarget =
      target ?? (typeof window !== "undefined" ? window.parent : undefined);
    if (!resolvedTarget) return;

    hasRegisteredRef.current = true;
    // `connect` rejects on timeout; that is a transport concern, not a
    // registration bug, so we swallow it here (the guard has already fired).
    void connect(resolvedTarget).catch(() => {
      /* connection failure is surfaced via useConnection().error */
    });
  }, [connect, connected, connecting, target]);

  /* --- cms/requestTargetPositions → discoverTargets (REQ-006) ---------- */
  const respondWithPositions = useCallback((): ContentTarget[] => {
    const discoveryRoot =
      rootRef.current ?? (typeof document !== "undefined" ? document : undefined);
    if (!discoveryRoot) return [];
    return discoverTargets(discoveryRoot);
  }, []);

  useStardustHandler(CHANNELS.requestTargetPositions, () =>
    respondWithPositions()
  );

  /* --- cms/sendElements → content state (REQ-006) ---------------------- */
  useStardustHandler(CHANNELS.sendElements, (payload) => {
    setContent((previous) => mergeContent(previous, payload));
  });

  /* --- Observer + throttled scroll/resize publishing (SIFR-T-0015) ----- */
  const sendPositions = useStardustSend(CHANNELS.sendElementPositions);
  const sendScroll = useStardustSend(CHANNELS.sendScrollPositions);

  usePositionPublishing({
    publishPositions: (positions) => {
      // Fire-and-forget: a send before the peer is connected rejects; that is a
      // transport concern, not a publishing bug.
      void sendPositions(positions).catch(() => {
        /* not connected yet / peer gone */
      });
    },
    publishScroll: (scroll) => {
      void sendScroll(scroll).catch(() => {
        /* not connected yet / peer gone */
      });
    },
    ...(root !== undefined ? { root } : {}),
  });

  const applyContent = useCallback<StardustContentContextValue["applyContent"]>(
    (payload) => {
      setContent((previous) => mergeContent(previous, payload));
    },
    []
  );

  const contextValue = useMemo<StardustContentContextValue>(
    () => ({ content, applyContent }),
    [content, applyContent]
  );

  return (
    <StardustContentContext.Provider value={contextValue}>
      {children}
    </StardustContentContext.Provider>
  );
}
