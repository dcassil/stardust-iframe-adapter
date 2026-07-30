import { describe, expect, it } from "vitest";
import { generateCss, type StyleValue } from "./generateCss.js";

describe("generateCss", () => {
  it("returns empty string for absent/empty input", () => {
    expect(generateCss(undefined)).toBe("");
    expect(generateCss(null)).toBe("");
    expect(generateCss([])).toBe("");
  });

  it("emits a scoped block for a single group", () => {
    const values: StyleValue[] = [
      { group: "hero", type: "text", property: "color", value: "#fff" },
      { group: "hero", type: "text", property: "font-size", value: 24 },
    ];
    expect(generateCss(values)).toBe(
      `[data-style-group="hero"] {\n  color: #fff;\n  font-size: 24px;\n}`,
    );
  });

  it("orders multiple groups and properties deterministically", () => {
    const values: StyleValue[] = [
      { group: "zeta", type: "text", property: "font-size", value: 10 },
      { group: "alpha", type: "text", property: "color", value: "red" },
      { group: "zeta", type: "text", property: "color", value: "blue" },
    ];
    const out = generateCss(values);
    expect(out).toBe(
      `[data-style-group="alpha"] {\n  color: red;\n}\n\n` +
        `[data-style-group="zeta"] {\n  color: blue;\n  font-size: 10px;\n}`,
    );
    // Byte-stable across calls.
    expect(generateCss(values)).toBe(out);
    // Byte-stable regardless of input order.
    expect(generateCss([...values].reverse())).toBe(out);
  });

  it("drops non-allowlisted properties", () => {
    const values: StyleValue[] = [
      { group: "g", type: "text", property: "width", value: 100 }, // width not in text
      { group: "g", type: "text", property: "color", value: "red" },
    ];
    expect(generateCss(values)).toBe(
      `[data-style-group="g"] {\n  color: red;\n}`,
    );
  });

  it("drops invalid values", () => {
    const values: StyleValue[] = [
      { group: "g", type: "text", property: "color", value: "banana" },
      { group: "g", type: "text", property: "font-size", value: -5 },
      { group: "g", type: "text", property: "font-weight", value: 700 },
    ];
    expect(generateCss(values)).toBe(
      `[data-style-group="g"] {\n  font-weight: 700;\n}`,
    );
  });

  it("omits a group entirely if all its values are dropped", () => {
    const values: StyleValue[] = [
      { group: "g", type: "text", property: "color", value: "banana" },
    ];
    expect(generateCss(values)).toBe("");
  });

  it("last write wins per property", () => {
    const values: StyleValue[] = [
      { group: "g", type: "text", property: "color", value: "red" },
      { group: "g", type: "text", property: "color", value: "blue" },
    ];
    expect(generateCss(values)).toBe(
      `[data-style-group="g"] {\n  color: blue;\n}`,
    );
  });

  it("appends !important only when opted in, uniformly", () => {
    const values: StyleValue[] = [
      { group: "g", type: "text", property: "color", value: "red" },
      { group: "g", type: "text", property: "font-size", value: 12 },
    ];
    expect(generateCss(values, { important: true })).toBe(
      `[data-style-group="g"] {\n  color: red !important;\n  font-size: 12px !important;\n}`,
    );
    // default off
    expect(generateCss(values)).not.toContain("!important");
  });

  it("does not mutate its input", () => {
    const values: StyleValue[] = [
      { group: "g", type: "text", property: "color", value: "red" },
    ];
    const snapshot = JSON.stringify(values);
    generateCss(values);
    expect(JSON.stringify(values)).toBe(snapshot);
  });

  it("respects a custom allowlist", () => {
    const values: StyleValue[] = [
      { group: "g", type: "text", property: "color", value: "red" },
      { group: "g", type: "text", property: "font-size", value: 12 },
    ];
    const out = generateCss(values, {
      allowlist: {
        text: ["color"],
        spacing: [],
        container: [],
        "h-container": [],
        "w-container": [],
      },
    });
    expect(out).toBe(`[data-style-group="g"] {\n  color: red;\n}`);
  });

  it("escapes quotes/backslashes in group selector values", () => {
    const values: StyleValue[] = [
      { group: 'a"b', type: "text", property: "color", value: "red" },
    ];
    expect(generateCss(values)).toBe(
      `[data-style-group="a\\"b"] {\n  color: red;\n}`,
    );
  });
});
