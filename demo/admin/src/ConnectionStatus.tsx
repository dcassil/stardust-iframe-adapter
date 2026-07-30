/**
 * The top status strip — successor to the prototype `ConnectStatus`.
 *
 * Renders the frame-link connection lifecycle in the UI (never console-only,
 * per REQ-005 / NFR): connecting, connected, and error each get a legible label
 * and a colored indicator. `error` covers site-not-reachable / handshake-timeout
 * (the hook folds `useConnection().error` into `connectionState`).
 */

import type { ReactNode } from "react";
import type { ConnectionState } from "@stardust-cms/iframe-adapter/host";

const LABELS: Record<ConnectionState, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting to embedded site…",
  connected: "Connected — editing live",
  error: "Connection error — is the demo site running on the expected origin?",
};

export function ConnectionStatus({
  state,
  scale,
  siteOrigin,
}: {
  state: ConnectionState;
  scale: number;
  siteOrigin: string;
}): ReactNode {
  return (
    <header className="admin-status" data-state={state}>
      <span className={`admin-status__dot admin-status__dot--${state}`} />
      <span className="admin-status__label">{LABELS[state]}</span>
      <span className="admin-status__spacer" />
      <span className="admin-status__meta">origin {siteOrigin}</span>
      <span className="admin-status__meta">scale {scale.toFixed(2)}×</span>
    </header>
  );
}
