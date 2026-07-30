/**
 * `ContentRenderer` — content item renderer (successor to `CmsContent.tsx`).
 *
 * Emits `data-cms-content` (and `data-cms-container` for container content) and
 * renders by the SIFR-I-0001 {@link ContentKind} discriminant — text, number,
 * image, container — with no Stardust-app-specific type references. Container
 * content renders two nested {@link EditableTarget}s (`${id}.1`, `${id}.2`),
 * mirroring the prototype's two-column container layout.
 */

import type { CSSProperties, ReactNode } from "react";
import type { CmsContent } from "../protocol/index.js";
import { ATTR_CONTAINER, ATTR_CONTENT, ATTR_STYLE_GROUP } from "./attributes.js";
import { EditableTarget } from "./EditableTarget.js";

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
