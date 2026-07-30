import { describe, expect, it } from "vitest";
import {
  DEFAULT_ALLOWLIST,
  VALIDATORS,
  isAllowed,
  validateColor,
  validateDisplay,
  validateFontWeight,
  validatePx,
  validateTextAlign,
  validateValue,
  type CssProperty,
  type StyleAllowlist,
} from "./allowlist.js";

describe("isAllowed", () => {
  it("permits properties listed for a type", () => {
    expect(isAllowed("text", "color")).toBe(true);
    expect(isAllowed("spacing", "margin")).toBe(true);
    expect(isAllowed("container", "display")).toBe(true);
  });

  it("rejects properties not on a type's allowlist", () => {
    expect(isAllowed("text", "width")).toBe(false);
    expect(isAllowed("spacing", "color")).toBe(false);
  });

  it("rejects unknown element types", () => {
    expect(isAllowed("bogus", "color")).toBe(false);
  });

  it("rejects non-allowlisted / unknown properties", () => {
    expect(isAllowed("text", "position")).toBe(false);
    expect(isAllowed("text", "z-index")).toBe(false);
  });

  it("honors a config override without editing the module", () => {
    const custom: StyleAllowlist = {
      text: ["color"],
      spacing: [],
      container: [],
      "h-container": [],
      "w-container": [],
    };
    expect(isAllowed("text", "font-size", custom)).toBe(false);
    expect(isAllowed("text", "color", custom)).toBe(true);
  });
});

describe("validateColor", () => {
  it("accepts hex, functional and named colors (normalized)", () => {
    expect(validateColor("#FFF")).toBe("#fff");
    expect(validateColor("#00Ff00")).toBe("#00ff00");
    expect(validateColor("#11223344")).toBe("#11223344");
    expect(validateColor("rgb(1, 2, 3)")).toBe("rgb(1, 2, 3)");
    expect(validateColor("rgba(1,2,3,0.5)")).toBe("rgba(1,2,3,0.5)");
    expect(validateColor("red")).toBe("red");
  });

  it("rejects bad and unsafe values", () => {
    expect(validateColor("notacolor")).toBeNull();
    expect(validateColor("#12")).toBeNull();
    expect(validateColor("red; position: fixed")).toBeNull();
    expect(validateColor("url(x)")).toBeNull();
    expect(validateColor(123)).toBeNull();
    expect(validateColor("")).toBeNull();
  });
});

describe("validatePx", () => {
  it("normalizes numbers and strings to px", () => {
    expect(validatePx(16)).toBe("16px");
    expect(validatePx(0)).toBe("0px");
    expect(validatePx("24")).toBe("24px");
    expect(validatePx("24px")).toBe("24px");
    expect(validatePx("1.5px")).toBe("1.5px");
  });

  it("rejects negatives, other units, unsafe, non-finite", () => {
    expect(validatePx(-1)).toBeNull();
    expect(validatePx("2em")).toBeNull();
    expect(validatePx("10px; color: red")).toBeNull();
    expect(validatePx(Infinity)).toBeNull();
    expect(validatePx(NaN)).toBeNull();
    expect(validatePx("abc")).toBeNull();
  });
});

describe("validateFontWeight", () => {
  it("accepts numeric weights and keywords", () => {
    expect(validateFontWeight(400)).toBe("400");
    expect(validateFontWeight("700")).toBe("700");
    expect(validateFontWeight("bold")).toBe("bold");
    expect(validateFontWeight("Normal")).toBe("normal");
  });

  it("rejects invalid weights", () => {
    expect(validateFontWeight(450)).toBeNull();
    expect(validateFontWeight(1000)).toBeNull();
    expect(validateFontWeight("lighter")).toBeNull();
    expect(validateFontWeight(50)).toBeNull();
  });
});

describe("validateTextAlign", () => {
  it("accepts the enum values", () => {
    for (const v of ["left", "center", "right", "justify"]) {
      expect(validateTextAlign(v)).toBe(v);
    }
    expect(validateTextAlign("CENTER")).toBe("center");
  });
  it("rejects others", () => {
    expect(validateTextAlign("start")).toBeNull();
    expect(validateTextAlign(1)).toBeNull();
  });
});

describe("validateDisplay", () => {
  it("accepts the enum values", () => {
    for (const v of ["block", "flex", "inline-block", "none"]) {
      expect(validateDisplay(v)).toBe(v);
    }
  });
  it("rejects others", () => {
    expect(validateDisplay("grid")).toBeNull();
    expect(validateDisplay("table")).toBeNull();
  });
});

describe("validateValue dispatch", () => {
  it("delegates by property", () => {
    expect(validateValue("color", "#fff")).toBe("#fff");
    expect(validateValue("font-size", 12)).toBe("12px");
    expect(validateValue("font-weight", 700)).toBe("700");
    expect(validateValue("text-align", "center")).toBe("center");
    expect(validateValue("display", "flex")).toBe("flex");
  });

  it("rejects unknown properties", () => {
    expect(validateValue("position", "fixed")).toBeNull();
  });
});

describe("full validator coverage: known-good + known-bad per property", () => {
  const good: Record<CssProperty, unknown> = {
    color: "#abcdef",
    "font-size": 14,
    "font-weight": 600,
    "text-align": "left",
    width: 100,
    height: 50,
    margin: "8px",
    padding: 4,
    display: "block",
  };
  const bad: Record<CssProperty, unknown> = {
    color: "banana",
    "font-size": -5,
    "font-weight": 123,
    "text-align": "middle",
    width: "auto",
    height: "10vh",
    margin: "-2px",
    padding: "5%",
    display: "grid",
  };

  for (const prop of Object.keys(VALIDATORS) as CssProperty[]) {
    it(`${prop}: accepts good, rejects bad`, () => {
      expect(validateValue(prop, good[prop])).not.toBeNull();
      expect(validateValue(prop, bad[prop])).toBeNull();
    });
  }

  it("default allowlist matches the validator table domain", () => {
    const used = new Set<string>();
    for (const props of Object.values(DEFAULT_ALLOWLIST)) {
      for (const p of props) used.add(p);
    }
    for (const p of used) {
      expect(VALIDATORS[p as CssProperty]).toBeTypeOf("function");
    }
  });
});
