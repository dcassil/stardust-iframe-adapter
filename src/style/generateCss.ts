/**
 * Pure, deterministic group-scoped CSS generator (SIFR-T-0027).
 *
 * `generateCss(styleValues, allowlist)` turns a flat list of style values into
 * `[data-style-group="G"] { … }` blocks. It is the correctness-critical core of
 * the style feature:
 *
 *  - Groups values by `data-style-group` (mirroring the prototype
 *    `useStyleInjector.tsx` grouping) but produces a STRING — it never touches
 *    the DOM.
 *  - Filters every property through the SIFR-T-0026 allowlist (`isAllowed`) and
 *    validates every value (`validateValue`); anything not permitted or invalid
 *    is silently dropped and never appears in output (NFR-003).
 *  - Emits byte-stable output: groups and properties are sorted, so identical
 *    input always yields byte-identical CSS (NFR-002) — snapshot-safe.
 *
 * It carries forward group scoping only; the prototype's commented-out
 * `data-style-id` path is intentionally unsupported.
 */

import {
  DEFAULT_ALLOWLIST,
  isAllowed,
  validateValue,
  type StyleAllowlist,
} from "./allowlist.js";

/**
 * One style value: a property to set on a group, scoped by the group's element
 * `type` (which selects the allowlist bucket). Mirrors the prototype
 * `TStyleValues` shape, tightened: `group` + `type` + `property` + `value`.
 */
export interface StyleValue {
  /** `data-style-group` scope this value applies to. */
  group: string;
  /** Element type selecting the allowlist bucket (e.g. `text`, `container`). */
  type: string;
  /** CSS property name (must be allowlisted for `type` to survive). */
  property: string;
  /** Candidate value; validated + normalized before emission. */
  value: unknown;
}

/** Options controlling `generateCss` output. */
export interface GenerateCssOptions {
  /** Allowlist to filter against. Defaults to {@link DEFAULT_ALLOWLIST}. */
  allowlist?: StyleAllowlist;
  /**
   * Append `!important` to every emitted declaration for override strength.
   * Opt-in, defaulting OFF (initiative risk mitigation).
   */
  important?: boolean;
}

/** Escape a `data-style-group` value for safe use inside an attribute selector. */
function escapeSelectorValue(group: string): string {
  return group.replace(/["\\]/g, "\\$&");
}

/**
 * Collapse a value list into `group -> (property -> normalized value)`, dropping
 * every disallowed property and invalid value. Last write wins per property.
 */
function collectByGroup(
  styleValues: readonly StyleValue[],
  allowlist: StyleAllowlist,
): Map<string, Map<string, string>> {
  const byGroup = new Map<string, Map<string, string>>();
  for (const entry of styleValues) {
    if (!isAllowed(entry.type, entry.property, allowlist)) continue;
    const normalized = validateValue(entry.property, entry.value);
    if (normalized === null) continue;

    let props = byGroup.get(entry.group);
    if (props === undefined) {
      props = new Map<string, string>();
      byGroup.set(entry.group, props);
    }
    props.set(entry.property, normalized);
  }
  return byGroup;
}

/** Render one `[data-style-group="G"] { … }` block from its property map. */
function renderGroupBlock(
  group: string,
  props: Map<string, string>,
  suffix: string,
): string {
  const declarations = [...props.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([property, value]) => `  ${property}: ${value}${suffix};`)
    .join("\n");
  return `[data-style-group="${escapeSelectorValue(group)}"] {\n${declarations}\n}`;
}

/**
 * Generate group-scoped CSS text from style values. Pure: no DOM access, no
 * input mutation; equal input yields equal output.
 */
export function generateCss(
  styleValues: readonly StyleValue[] | undefined | null,
  options: GenerateCssOptions = {},
): string {
  if (styleValues == null || styleValues.length === 0) {
    return "";
  }

  const allowlist = options.allowlist ?? DEFAULT_ALLOWLIST;
  const suffix = options.important === true ? " !important" : "";
  const byGroup = collectByGroup(styleValues, allowlist);

  const blocks: string[] = [];
  for (const group of [...byGroup.keys()].sort()) {
    const props = byGroup.get(group);
    if (props === undefined || props.size === 0) continue;
    blocks.push(renderGroupBlock(group, props, suffix));
  }

  return blocks.join("\n\n");
}
