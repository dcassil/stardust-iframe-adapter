/**
 * `StyleElement` — style-targetable wrapper (successor to `CmsStyled.tsx`).
 *
 * Emits the `data-style-*` attributes the style engine (SIFR-I-0005) targets,
 * and otherwise renders its child unchanged. Presentational and app-agnostic:
 * depends only on `react` and the shared attribute constants.
 */

import type { ReactNode } from "react";
import {
  ATTR_STYLE_ELEMENT,
  ATTR_STYLE_GROUP,
  ATTR_STYLE_ID,
  ATTR_STYLE_NAME,
  ATTR_STYLE_RULES,
} from "./attributes.js";

/** Props for {@link StyleElement}. */
export interface StyleElementProps {
  children: ReactNode;
  /** Content/style name (`data-style-name`). */
  name: string;
  /** Style-rule scope (`data-style-group`). */
  group: string;
  /** Stable id of the wrapped content (`data-style-id`). */
  id: string;
  /** Applicable style rules (`data-style-rules`, comma-joined). */
  rules?: readonly string[];
}

export function StyleElement({
  children,
  name,
  group,
  id,
  rules,
}: StyleElementProps): ReactNode {
  return (
    <div
      {...{ [ATTR_STYLE_ELEMENT]: true }}
      {...{ [ATTR_STYLE_NAME]: name }}
      {...{ [ATTR_STYLE_ID]: id }}
      {...{ [ATTR_STYLE_GROUP]: group }}
      {...{ [ATTR_STYLE_RULES]: rules?.join(",") ?? "" }}
    >
      {children}
    </div>
  );
}
