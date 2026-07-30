/**
 * Minimal style panel (SIFR-T-0029).
 *
 * A deliberately small panel — NOT a full visual editor (per the initiative's
 * supporting-only non-goals). For the selected content item it offers only
 * allowlisted `text` controls (color + font-size) for the item's
 * `data-style-group`, emitting `cms/updateStyles({ styleGroup, type, property,
 * value })` on change. The iframe adapter validates every value against the
 * allowlist before injecting, so nothing unsafe reaches the page.
 *
 * Controls are derived from the shared allowlist so the panel can never offer a
 * property the engine would drop.
 */

import { useContext, type ChangeEvent, type ReactNode } from "react";
import { DEFAULT_ALLOWLIST } from "@stardust-cms/iframe-adapter";
import type { StyleUpdatePayload } from "@stardust-cms/iframe-adapter/protocol";
import type { ContentSnapshot } from "@demo/shared/store";
import { EditingContext } from "./editing-context";
import { useSendStyles } from "../useSendStyles";

/** The element type this minimal panel targets (text content groups). */
const PANEL_TYPE = "text";

export interface StylePanelProps {
  snapshot: ContentSnapshot;
}

export function StylePanel({ snapshot }: StylePanelProps): ReactNode {
  const editing = useContext(EditingContext);
  const sendStyles = useSendStyles();

  const selectedContentId = editing?.selectedContentId ?? null;
  const selected =
    selectedContentId !== null
      ? snapshot.find((p) => p.content.id === selectedContentId)
      : undefined;

  if (!selected) {
    return (
      <section className="panel" data-testid="style-panel-empty">
        <h2 className="panel__title">Style</h2>
        <p className="panel__hint">Select a block to style its group.</p>
      </section>
    );
  }

  const styleGroup = selected.content.styleGroup ?? selected.content.type;
  const textProps = DEFAULT_ALLOWLIST[PANEL_TYPE];

  const send = (property: string, value: string): void => {
    const payload: StyleUpdatePayload = {
      styleGroup,
      type: PANEL_TYPE,
      property,
      value,
    };
    void sendStyles(payload);
  };

  const onColor = (e: ChangeEvent<HTMLInputElement>): void => {
    send("color", e.target.value);
  };
  const onFontSize = (e: ChangeEvent<HTMLInputElement>): void => {
    send("font-size", e.target.value);
  };

  return (
    <section
      className="panel"
      data-testid="style-panel"
      data-style-group={styleGroup}
    >
      <h2 className="panel__title">Style</h2>
      <dl className="panel__meta">
        <dt>group</dt>
        <dd>{styleGroup}</dd>
      </dl>

      {textProps.includes("color") && (
        <label className="panel__field">
          <span>Color</span>
          <input
            type="color"
            defaultValue="#111111"
            onChange={onColor}
            data-testid="style-color"
          />
        </label>
      )}

      {textProps.includes("font-size") && (
        <label className="panel__field">
          <span>Font size (px)</span>
          <input
            type="number"
            min={0}
            defaultValue={16}
            onChange={onFontSize}
            data-testid="style-font-size"
          />
        </label>
      )}
    </section>
  );
}
