/**
 * Content side panel (SIFR-T-0010).
 *
 * On select, shows the selected content's editable fields and emits `edit` ops
 * as the user types — pushing updates live (store → `cms/sendElements` → site
 * re-render → overlay remap). Fields shown depend on the content kind:
 *   - text / number → a text value field;
 *   - image → an image `src` (value) field.
 *
 * Depends only on the store snapshot + an `onEdit` emitter — no store internals.
 */

import type { ChangeEvent, ReactNode } from "react";
import type { ContentSnapshot } from "@demo/shared/store";

export interface SidePanelProps {
  snapshot: ContentSnapshot;
  selectedTargetId: string | null;
  selectedContentId: string | null;
  onEdit: (targetId: string, contentId: string, value: string) => void;
}

export function SidePanel({
  snapshot,
  selectedTargetId,
  selectedContentId,
  onEdit,
}: SidePanelProps): ReactNode {
  const selected =
    selectedContentId !== null
      ? snapshot.find(
          (p) =>
            p.content.id === selectedContentId &&
            (selectedTargetId === null || p.targetId === selectedTargetId),
        )
      : undefined;

  if (!selected) {
    return (
      <section className="panel">
        <h2 className="panel__title">Content</h2>
        <p className="panel__hint">Click a block in the preview to edit it.</p>
      </section>
    );
  }

  const { content, targetId } = selected;
  const isImage = content.type === "image";

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>): void => {
    onEdit(targetId, content.id, e.target.value);
  };

  return (
    <section className="panel" data-selected-id={content.id}>
      <h2 className="panel__title">Content</h2>
      <dl className="panel__meta">
        <dt>id</dt>
        <dd>{content.id}</dd>
        <dt>type</dt>
        <dd>{content.type}</dd>
        <dt>target</dt>
        <dd>{targetId}</dd>
      </dl>

      {isImage ? (
        <label className="panel__field">
          <span>Image source</span>
          <input
            type="text"
            value={content.value ?? ""}
            onChange={handleChange}
            data-testid="panel-image-src"
          />
        </label>
      ) : (
        <label className="panel__field">
          <span>Text</span>
          <textarea
            rows={4}
            value={content.value ?? ""}
            onChange={handleChange}
            data-testid="panel-text"
          />
        </label>
      )}
    </section>
  );
}
