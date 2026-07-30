/**
 * Style-rule allowlist + per-property value-type validators (SIFR-T-0026).
 *
 * This is the DATA layer that constrains what CSS the style feature can ever
 * emit. It is framework-agnostic — no `react`, no DOM — so both the host and the
 * iframe entrypoints can import it. It grounds its vocabulary in the prototype's
 * `useStyleEngine.tsx` (`RULE_DEFS` / `TYPE_RULES`) but replaces the prototype's
 * loosely-typed rule shapes with an explicitly enumerated, validated map.
 *
 * Responsibilities kept OUT of this module:
 *  - `!important` and any CSS emission — that is `generateCss` (SIFR-T-0027) and
 *    the injector's (SIFR-T-0028) concern.
 *  - Grouping / selector construction — `generateCss` owns that.
 *
 * Here we only decide: (a) which properties are allowed for a given element
 * type, and (b) whether a candidate value is valid, returning a NORMALIZED value
 * or a rejection. Invalid values are never coerced into unsafe CSS (NFR-003).
 */

/* -------------------------------------------------------------------------- */
/* Property + type vocabulary                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The complete set of CSS properties this feature can ever emit. Grounded in the
 * prototype `RULE_DEFS`. Enumerated as a literal union so validators and the
 * allowlist are exhaustively type-checked.
 */
export type CssProperty =
  | "color"
  | "font-size"
  | "font-weight"
  | "text-align"
  | "width"
  | "height"
  | "margin"
  | "padding"
  | "display";

/**
 * Element-type keys the allowlist scopes properties by. Grounded in the
 * prototype `TYPE_RULES` keys.
 */
export type StyleElementType =
  | "text"
  | "spacing"
  | "container"
  | "h-container"
  | "w-container";

/**
 * A validated, normalized CSS value ready to be emitted verbatim. Kept as a
 * branded-ish plain string so `generateCss` can drop it straight into output.
 */
export type ValidatedValue = string;

/**
 * A per-property validator: takes an unknown candidate and returns a normalized
 * CSS value string, or `null` to reject. Never throws; never coerces unsafe
 * input into CSS.
 */
export type ValueValidator = (value: unknown) => ValidatedValue | null;

/**
 * Maps each element type to the CSS properties permitted for it.
 */
export type StyleAllowlist = Readonly<
  Record<StyleElementType, readonly CssProperty[]>
>;

/* -------------------------------------------------------------------------- */
/* Validators                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Reject any string that could break out of a `prop: value;` declaration or
 * inject additional declarations/rules. This is the core NFR-003 safety net.
 */
function hasUnsafeChars(input: string): boolean {
  return /[;{}<>]/.test(input) || input.includes("*/") || input.includes("/*");
}

/** `#rgb` / `#rrggbb` / `#rrggbbaa`. */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** `rgb(...)` / `rgba(...)` / `hsl(...)` / `hsla(...)` with digits/.,%/space. */
const FUNCTIONAL_COLOR =
  /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9.,%\s/]+\)$/;

/** A conservative set of CSS named colors + keywords the demo needs. */
const NAMED_COLORS = new Set<string>([
  "transparent",
  "currentColor",
  "inherit",
  "black",
  "white",
  "red",
  "green",
  "blue",
  "yellow",
  "orange",
  "purple",
  "gray",
  "grey",
  "silver",
  "maroon",
  "olive",
  "lime",
  "aqua",
  "teal",
  "navy",
  "fuchsia",
  "pink",
  "brown",
  "cyan",
  "magenta",
]);

/** CSS color: hex, functional, or a known named color. Case-normalized. */
export const validateColor: ValueValidator = (value) => {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (v === "" || hasUnsafeChars(v)) return null;
  if (HEX_COLOR.test(v)) return v.toLowerCase();
  if (FUNCTIONAL_COLOR.test(v)) return v.toLowerCase().replace(/\s+/g, " ");
  if (NAMED_COLORS.has(v)) return v;
  // Case-insensitive named match.
  const lower = v.toLowerCase();
  for (const name of NAMED_COLORS) {
    if (name.toLowerCase() === lower) return name;
  }
  return null;
};

/**
 * A non-negative px length: accepts a finite number (→ `"<n>px"`), a bare
 * numeric string, or a px-suffixed string. `0` is allowed. Rejects negatives,
 * NaN/Infinity, and other units.
 */
export const validatePx: ValueValidator = (value) => {
  let n: number | null = null;
  if (typeof value === "number") {
    n = value;
  } else if (typeof value === "string") {
    const v = value.trim();
    if (v === "" || hasUnsafeChars(v)) return null;
    const m = /^(-?\d+(?:\.\d+)?)(?:px)?$/.exec(v);
    if (!m) return null;
    n = Number(m[1]);
  }
  if (n === null || !Number.isFinite(n) || n < 0) return null;
  return `${n}px`;
};

/**
 * `font-weight`: numeric 100–900 in steps of 100, or the `normal`/`bold`
 * keywords. Returns a normalized string.
 */
export const validateFontWeight: ValueValidator = (value) => {
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "normal" || v === "bold") return v;
    if (/^\d+$/.test(v)) return validateFontWeight(Number(v));
    return null;
  }
  if (typeof value === "number") {
    if (
      Number.isInteger(value) &&
      value >= 100 &&
      value <= 900 &&
      value % 100 === 0
    ) {
      return String(value);
    }
  }
  return null;
};

/** Build an enum validator over a fixed allowed set (case-insensitive). */
function enumValidator(allowed: readonly string[]): ValueValidator {
  const set = new Set(allowed);
  return (value) => {
    if (typeof value !== "string") return null;
    const v = value.trim().toLowerCase();
    return set.has(v) ? v : null;
  };
}

/** `text-align`: `left | center | right | justify`. */
export const validateTextAlign: ValueValidator = enumValidator([
  "left",
  "center",
  "right",
  "justify",
]);

/** `display`: `block | flex | inline-block | none`. */
export const validateDisplay: ValueValidator = enumValidator([
  "block",
  "flex",
  "inline-block",
  "none",
]);

/**
 * The complete per-property validator table. `generateCss` (SIFR-T-0027)
 * consumes this directly.
 */
export const VALIDATORS: Readonly<Record<CssProperty, ValueValidator>> = {
  color: validateColor,
  "font-size": validatePx,
  "font-weight": validateFontWeight,
  "text-align": validateTextAlign,
  width: validatePx,
  height: validatePx,
  margin: validatePx,
  padding: validatePx,
  display: validateDisplay,
};

/* -------------------------------------------------------------------------- */
/* Default allowlist                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The conservative default allowlist, grounded in the prototype `TYPE_RULES`.
 * Consumers may pass their own {@link StyleAllowlist} to override without
 * editing this module (the initiative's "extensible via config" mitigation).
 */
export const DEFAULT_ALLOWLIST: StyleAllowlist = {
  text: ["color", "text-align", "font-size", "font-weight"],
  spacing: ["margin", "padding"],
  container: ["width", "height", "display"],
  "h-container": ["height", "padding", "margin"],
  "w-container": ["width", "padding", "margin"],
};

/* -------------------------------------------------------------------------- */
/* Predicates                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Pure predicate: is `property` permitted for element `type` under `allowlist`?
 * A property absent from the type's list (or an unknown type) returns `false`.
 */
export function isAllowed(
  type: string,
  property: string,
  allowlist: StyleAllowlist = DEFAULT_ALLOWLIST,
): boolean {
  const props = (allowlist as Record<string, readonly string[]>)[type];
  if (props === undefined) return false;
  return props.includes(property);
}

/**
 * Pure validator dispatch: normalize `value` for `property`, or return `null`.
 * Unknown properties (no validator) are rejected. Never throws.
 */
export function validateValue(
  property: string,
  value: unknown,
): ValidatedValue | null {
  const validator = (VALIDATORS as Record<string, ValueValidator | undefined>)[
    property
  ];
  if (validator === undefined) return null;
  return validator(value);
}
