/**
 * Managed-`<style>` injector + pure discovery helper (SIFR-T-0028).
 *
 * This is the core SAFETY fix over the prototype `useStyleInjector.tsx`, which
 * ran `while (document.styleSheets[0].cssRules.length > 0) deleteRule(0)` —
 * destroying every rule in whatever stylesheet happened to be first — then
 * inserted `!important` rules into it.
 *
 * Instead, `injectStyles(css)` lazily creates ONE adapter-owned
 * `<style data-stardust-adapter-styles>` node in `<head>` and swaps its
 * `textContent` in place. It NEVER calls `deleteRule` / `insertRule` on any
 * stylesheet it does not own, so pre-existing page styles are left byte-for-byte
 * intact (REQ-004, NFR-001).
 *
 * `discoverStyleElements(root)` is a pure, DOM-read-only helper collecting the
 * `data-style-group` values (and their `data-style-rules`) present in a subtree,
 * so the panel can offer only relevant controls (REQ-002).
 *
 * This runs on the iframe side (where the DOM to style lives). The injector
 * consumes an already-built CSS string from `generateCss` (SIFR-T-0027); it does
 * not build CSS itself, and has no direct allowlist dependency.
 */

import { ATTR_STYLE_GROUP, ATTR_STYLE_RULES } from "../iframe/attributes.js";

/** The marker attribute identifying the single adapter-owned `<style>` node. */
export const ADAPTER_STYLE_ATTR = "data-stardust-adapter-styles";

/** A discovered style group + its declared applicable rules. */
export interface DiscoveredStyleGroup {
  /** The `data-style-group` value. */
  group: string;
  /** Rule names from `data-style-rules` (comma-split), deduped + sorted. */
  rules: readonly string[];
}

/** Minimal Document surface the injector needs (defaults to global `document`). */
type InjectorDocument = Pick<
  Document,
  "querySelector" | "createElement" | "head"
>;

function resolveDocument(doc?: InjectorDocument): InjectorDocument {
  if (doc !== undefined) return doc;
  if (typeof document === "undefined") {
    throw new Error(
      "injectStyles requires a document; none was provided and no global exists.",
    );
  }
  return document;
}

/** Find the existing adapter-owned `<style>` node, if any. */
function findAdapterStyle(doc: InjectorDocument): HTMLStyleElement | null {
  return doc.querySelector<HTMLStyleElement>(`style[${ADAPTER_STYLE_ATTR}]`);
}

/**
 * Write `css` into the single adapter-owned `<style>` node, creating it in
 * `<head>` on first call and reusing it thereafter. Idempotent: N calls yield
 * exactly one adapter `<style>` node holding the last call's CSS. Never touches
 * any stylesheet it does not own.
 */
export function injectStyles(css: string, doc?: InjectorDocument): HTMLStyleElement {
  const d = resolveDocument(doc);
  let node = findAdapterStyle(d);
  if (node === null) {
    node = d.createElement("style");
    node.setAttribute(ADAPTER_STYLE_ATTR, "");
    d.head.appendChild(node);
  }
  node.textContent = css;
  return node;
}

/**
 * Remove the adapter-owned `<style>` node if present, restoring a zero-footprint
 * state (REQ-006, NFR-004). Affects only the adapter's own node. Safe to call
 * when no node exists.
 */
export function clearStyles(doc?: InjectorDocument): void {
  const d = resolveDocument(doc);
  const node = findAdapterStyle(d);
  if (node !== null) {
    node.remove();
  }
}

/**
 * Pure, DOM-read-only discovery. Given a root element/document, collect the
 * unique `data-style-group` values present in the subtree (including the root
 * itself if it carries the attribute) and their associated `data-style-rules`.
 * Never mutates the DOM. Groups are returned sorted for deterministic output.
 */
export function discoverStyleElements(
  root: ParentNode & { getAttribute?: (name: string) => string | null },
): DiscoveredStyleGroup[] {
  const rulesByGroup = new Map<string, Set<string>>();

  const record = (el: Element): void => {
    const group = el.getAttribute(ATTR_STYLE_GROUP);
    if (group === null || group === "") return;
    let set = rulesByGroup.get(group);
    if (set === undefined) {
      set = new Set<string>();
      rulesByGroup.set(group, set);
    }
    const rawRules = el.getAttribute(ATTR_STYLE_RULES);
    if (rawRules !== null && rawRules !== "") {
      for (const r of rawRules.split(",")) {
        const trimmed = r.trim();
        if (trimmed !== "") set.add(trimmed);
      }
    }
  };

  // Include the root element itself when it is an Element carrying the attr.
  if (typeof (root as Element).getAttribute === "function") {
    record(root as Element);
  }
  for (const el of Array.from(root.querySelectorAll(`[${ATTR_STYLE_GROUP}]`))) {
    record(el);
  }

  return [...rulesByGroup.keys()].sort().map((group) => ({
    group,
    rules: [...rulesByGroup.get(group)!].sort(),
  }));
}
