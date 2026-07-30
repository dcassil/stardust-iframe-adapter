/**
 * `VersionControls` — the minimal draft/live/publish + version-navigation UI that
 * surfaces the versioned-content-engine workflow (the whole point of the VCE
 * swap).
 *
 * It is a child of `HostShell`, so it lives inside the shell's `StoreProvider`
 * and reads the injected {@link VceContentStoreAdapter} via `useContentStore()`.
 * Content re-injection into the iframe is owned by the shell: the shell re-injects
 * whatever `apply(op)` returns. So this control drives the iframe indirectly —
 * it mutates the store's clock / view pointer, then dispatches a harmless
 * `select` op through `useContentStore().apply`, which makes the shell re-inject
 * the store's current `getSnapshot()` (draft, live, or a pinned historical
 * version).
 *
 * Controls:
 *  - **Publish** — `store.publish()` advances live; then re-inject so the iframe
 *    shows the freshly published content.
 *  - **View live / draft** — pin the view to the live version (or return to the
 *    editable draft) and re-inject.
 *  - **◀ / ▶** — step through historical versions (0..live) read-only.
 */

import { useCallback, useState, type ReactNode } from "react";
import { useContentStore } from "@stardust-cms/dashboard";
import type { VceContentStoreAdapter } from "@demo/shared/store";
import { useReinject } from "./host-bridge";

/** A target id guaranteed to exist in the seed — used to fire a re-inject `select`. */
const REINJECT_TARGET = "hero";

export function VersionControls(): ReactNode {
  const { store } = useContentStore();
  const vce = store as VceContentStoreAdapter;
  const [, force] = useState(0);
  const reinjectItem = useReinject();

  // Re-inject the store's current snapshot into the iframe by re-selecting a seed
  // target through the shell's dispatch path (which pushes the current
  // `getSnapshot()` — draft, live, or a pinned version — via `cms/sendElements`).
  const reinject = useCallback(() => {
    reinjectItem(REINJECT_TARGET);
    force((n) => n + 1);
  }, [reinjectItem]);

  const live = vce.liveVersion();
  const viewing = vce.viewVersion();
  const editing = viewing === null;

  const onPublish = useCallback(() => {
    vce.publish();
    vce.setViewVersion(null);
    reinject();
  }, [vce, reinject]);

  const onViewLive = useCallback(() => {
    vce.setViewVersion(live);
    reinject();
  }, [vce, live, reinject]);

  const onEditDraft = useCallback(() => {
    vce.setViewVersion(null);
    reinject();
  }, [vce, reinject]);

  const onPrev = useCallback(() => {
    const current = viewing ?? live;
    vce.setViewVersion(Math.max(0, current - 1));
    reinject();
  }, [vce, viewing, live, reinject]);

  const onNext = useCallback(() => {
    const current = viewing ?? live;
    vce.setViewVersion(Math.min(live, current + 1));
    reinject();
  }, [vce, viewing, live, reinject]);

  return (
    <section className="version-controls" data-testid="version-controls">
      <h2 className="panel__title">Versioning</h2>
      <p className="version-controls__state" data-testid="version-state">
        {editing ? "Editing draft" : `Viewing version ${viewing}`}
        {" · "}live v{live}
      </p>
      <div className="version-controls__row">
        <button type="button" data-testid="publish" onClick={onPublish}>
          Publish draft
        </button>
      </div>
      <div className="version-controls__row">
        <button type="button" data-testid="view-live" onClick={onViewLive} disabled={!editing}>
          View live
        </button>
        <button type="button" data-testid="edit-draft" onClick={onEditDraft} disabled={editing}>
          Edit draft
        </button>
      </div>
      <div className="version-controls__row">
        <button type="button" data-testid="version-prev" onClick={onPrev}>
          ◀ Prev
        </button>
        <button type="button" data-testid="version-next" onClick={onNext}>
          Next ▶
        </button>
      </div>
    </section>
  );
}
