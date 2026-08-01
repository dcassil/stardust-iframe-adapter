import { describe, expect, it } from "vitest";
import { asScopeId } from "colab-ui/react";
import {
  isCmsScopeId,
  scopeIdToTargetId,
  targetIdToScopeId,
} from "./scopeId.js";

describe("data-cms ↔ scopeId mapping (boundary helper)", () => {
  const CMS_IDS = ["t-hero", "t-list", "nav.primary", "product:sku-42", "x"];

  it("round-trips a data-cms target id through the scope id and back", () => {
    for (const id of CMS_IDS) {
      const scope = targetIdToScopeId(id);
      // The underlying string is carried verbatim (colab's brand is phantom).
      expect(String(scope)).toBe(id);
      expect(scopeIdToTargetId(scope)).toBe(id);
    }
  });

  it("reverses a colab scope id back to the exact data-cms target id", () => {
    for (const id of CMS_IDS) {
      const scope = asScopeId(id);
      const target = scopeIdToTargetId(scope);
      expect(target).toBe(id);
      // And forward again yields the same scope value.
      expect(String(targetIdToScopeId(target))).toBe(String(scope));
    }
  });

  it("preserves which element is tracked: distinct ids map to distinct scopes", () => {
    const scopes = CMS_IDS.map((id) => String(targetIdToScopeId(id)));
    expect(new Set(scopes).size).toBe(CMS_IDS.length);
  });

  it("rejects an empty target id (colab's non-empty-string rule)", () => {
    expect(() => targetIdToScopeId("")).toThrow(TypeError);
  });

  it("guards untrusted values with colab's own validity rule", () => {
    expect(isCmsScopeId("t-hero")).toBe(true);
    expect(isCmsScopeId("")).toBe(false);
    expect(isCmsScopeId(42)).toBe(false);
    expect(isCmsScopeId(null)).toBe(false);
  });
});
