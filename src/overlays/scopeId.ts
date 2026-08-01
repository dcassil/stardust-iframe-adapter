/**
 * `data-cms` target id ↔ colab `ScopeId` mapping — the single adapter boundary
 * where Stardust's `data-cms` target identity is translated to/from colab's
 * scope identity.
 *
 * The adapter identifies editable regions by their `data-cms` attribute value
 * (`targetId`, see `src/iframe/attributes.ts` — an arbitrary non-empty string
 * such as `"t-hero"`). colab identifies collaboration scopes by a branded
 * {@link ScopeId} (structurally a non-empty string; see `colab-protocol`'s
 * {@link asScopeId}). The two vocabularies are 1:1 by VALUE: a `data-cms`
 * target id IS the scope colab tracks/locks for that element, and vice versa.
 *
 * Keeping the conversion in ONE place means the overlays (and any future
 * presence wiring) never sprinkle `asScopeId` casts across the codebase, and
 * the round-trip identity is unit-tested in exactly one spot. This helper adds
 * no transform, no namespacing, and no rewriting — the underlying string is
 * carried verbatim through colab's brand and back, so the EXACT element that
 * was tracked/locked before the migration is the exact element tracked/locked
 * after it.
 *
 * This is the whole colab surface the adapter's presence boundary needs beyond
 * the roster/interaction hooks: everything else colab-facing keys off the
 * `ScopeId` this produces.
 */

import { asScopeId, type ScopeId } from "colab-ui/react";
import { isScopeId } from "colab-ui";

/**
 * The adapter's `data-cms` target id: the value of a discoverable target's
 * `data-cms` attribute. An arbitrary non-empty string chosen by the CMS author.
 */
export type CmsTargetId = string;

/**
 * Convert a `data-cms` target id into the colab {@link ScopeId} that colab uses
 * to track and lock that element.
 *
 * The value is carried verbatim (colab's brand is a compile-time phantom and a
 * `ScopeId` is exactly its underlying string at runtime), so the scope colab
 * sees is byte-for-byte the adapter's target id.
 *
 * @throws {TypeError} if `targetId` is not a non-empty string (colab's rule).
 */
export function targetIdToScopeId(targetId: CmsTargetId): ScopeId {
  return asScopeId(targetId);
}

/**
 * Convert a colab {@link ScopeId} back into the adapter's `data-cms` target id.
 *
 * Exact reverse of {@link targetIdToScopeId}: the underlying string is returned
 * unchanged, so a scope colab reports as locked resolves to the identical
 * `data-cms` target the adapter renders a lock badge on.
 */
export function scopeIdToTargetId(scopeId: ScopeId): CmsTargetId {
  return scopeId;
}

/**
 * Narrow an untrusted value to a colab {@link ScopeId} without throwing.
 *
 * Re-exported at the boundary so overlay code that reads scope ids off colab's
 * roster/interaction state can guard wire input using colab's own validity rule
 * rather than duplicating the non-empty-string check.
 */
export function isCmsScopeId(value: unknown): value is ScopeId {
  return isScopeId(value);
}
