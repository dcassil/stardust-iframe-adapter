/**
 * `EditableTarget` — CMS target wrapper (successor to `CmsTarget.tsx`).
 *
 * Public entry point. The implementation is co-located with its mutually
 * recursive partner {@link ContentRenderer} in `renderers.tsx` so their
 * recursion stays intra-module (no cross-file import cycle).
 */

export {
  EditableTarget,
  type EditableTargetProps,
} from "./renderers.js";
