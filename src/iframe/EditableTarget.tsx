/**
 * `EditableTarget` — CMS target wrapper (successor to `CmsTarget.tsx`).
 *
 * Emits `data-cms` (the target id) and `data-cms-container-target` when it is a
 * container, and renders the host-injected content for its `targetId` (pulled
 * from {@link StardustContentContext}, populated by `StardustAdapterProvider`'s
 * `cms/sendElements` handler). Each content item is wrapped in a
 * {@link StyleElement} and rendered by {@link ContentRenderer}.
 *
 * Presentational and app-agnostic: depends only on `react`, the SIFR-I-0001
 * protocol types, and sibling iframe components.
 */

import { useContext, type CSSProperties, type ReactNode } from "react";
import { ATTR_CONTAINER_TARGET, ATTR_TARGET } from "./attributes.js";
import { StardustContentContext } from "./content-context.js";
import { StyleElement } from "./StyleElement.js";
import { ContentRenderer } from "./ContentRenderer.js";

/** Props for {@link EditableTarget}. */
export interface EditableTargetProps {
  /** The target id; emitted as `data-cms` and used to look up content. */
  targetId: string;
  /** Whether this target is a container (emits `data-cms-container-target`). */
  isContainer?: boolean;
  /** Optional inline style forwarded to the wrapper element. */
  style?: CSSProperties;
}

export function EditableTarget({
  targetId,
  isContainer,
  style,
}: EditableTargetProps): ReactNode {
  const context = useContext(StardustContentContext);
  const items = context?.content[targetId] ?? [];

  return (
    <div
      id={targetId}
      {...{ [ATTR_TARGET]: targetId }}
      {...(isContainer ? { [ATTR_CONTAINER_TARGET]: true } : {})}
      {...(style ? { style } : {})}
    >
      {items.map((item) => (
        <StyleElement
          key={item.content.id}
          name={item.content.type}
          group={item.content.styleGroup ?? item.content.type}
          id={item.content.id}
          rules={["text"]}
        >
          <ContentRenderer content={item.content} />
        </StyleElement>
      ))}
    </div>
  );
}
