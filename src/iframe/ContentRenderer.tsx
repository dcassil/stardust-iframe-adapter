/**
 * `ContentRenderer` — content item renderer (successor to `CmsContent.tsx`).
 *
 * Public entry point. The implementation is co-located with its mutually
 * recursive partner {@link EditableTarget} in `renderers.tsx` so their
 * recursion stays intra-module (no cross-file import cycle).
 */

export {
  ContentRenderer,
  type ContentRendererProps,
} from "./renderers.js";
