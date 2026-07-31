/**
 * Mutually-recursive iframe content renderers, co-located in one module.
 *
 * `EditableTarget` renders each content item through `ContentRenderer`, and a
 * `container` item renders two nested `EditableTarget`s — an inherent mutual
 * recursion. Keeping both here makes that recursion intra-module, so there is no
 * cross-file import cycle. `EditableTarget.tsx` and `ContentRenderer.tsx` remain
 * as the public entry points and simply re-export from here.
 */

import { useContext, type CSSProperties, type ReactNode } from "react";
import type { CmsContent } from "../protocol/registry.js";
import {
  ATTR_CONTAINER,
  ATTR_CONTAINER_TARGET,
  ATTR_CONTENT,
  ATTR_STYLE_GROUP,
  ATTR_TARGET,
} from "./attributes.js";
import { StardustContentContext } from "./content-context.js";
import { StyleElement } from "./StyleElement.js";

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

/** Props for {@link ContentRenderer}. */
export interface ContentRendererProps {
  content: CmsContent;
}

export function ContentRenderer({ content }: ContentRendererProps): ReactNode {
  const styleGroup = content.styleGroup ?? "";
  const value = content.value ?? "";

  switch (content.type) {
    case "text":
    case "number":
      return (
        <div
          id={content.id}
          {...{ [ATTR_CONTENT]: true }}
          {...{ [ATTR_STYLE_GROUP]: styleGroup }}
        >
          {value}
        </div>
      );

    case "image":
      return (
        <img
          id={content.id}
          {...{ [ATTR_CONTENT]: true }}
          {...{ [ATTR_STYLE_GROUP]: styleGroup }}
          src={value}
          alt=""
        />
      );

    case "container": {
      const style: CSSProperties = {
        display: "flex",
        flexDirection: content.column ? "column" : "row",
        alignItems: "flex-start",
        justifyContent: "center",
      };
      return (
        <div
          id={content.id}
          {...{ [ATTR_CONTENT]: true }}
          {...{ [ATTR_CONTAINER]: true }}
          {...{ [ATTR_STYLE_GROUP]: styleGroup }}
          style={style}
        >
          <EditableTarget targetId={`${content.id}.1`} isContainer />
          <EditableTarget targetId={`${content.id}.2`} isContainer />
        </div>
      );
    }

    default: {
      // Exhaustiveness guard: every ContentKind is handled above. An unknown
      // kind renders an inert, discoverable content node rather than crashing.
      const _exhaustive: never = content.type;
      void _exhaustive;
      return (
        <div id={content.id} {...{ [ATTR_CONTENT]: true }}>
          {value}
        </div>
      );
    }
  }
}
