/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  ADAPTER_STYLE_ATTR,
  clearStyles,
  discoverStyleElements,
  injectStyles,
} from "./injector.js";

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

describe("injectStyles", () => {
  it("lazily creates exactly one adapter <style> in <head>", () => {
    injectStyles("body { color: red; }");
    const nodes = document.querySelectorAll(`style[${ADAPTER_STYLE_ATTR}]`);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.parentElement).toBe(document.head);
    expect(nodes[0]?.textContent).toBe("body { color: red; }");
  });

  it("reuses the same node on update (idempotent, last CSS wins)", () => {
    const first = injectStyles("a {}");
    const second = injectStyles("b {}");
    const third = injectStyles("c {}");
    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(document.querySelectorAll(`style[${ADAPTER_STYLE_ATTR}]`)).toHaveLength(1);
    expect(third.textContent).toBe("c {}");
  });

  it("never touches a pre-existing stylesheet", () => {
    const pre = document.createElement("style");
    pre.textContent = ".pre { color: green; }";
    document.head.appendChild(pre);

    const beforeSheet = document.styleSheets[0]!;
    const beforeRules = Array.from(beforeSheet.cssRules).map((r) => r.cssText);

    injectStyles('[data-style-group="g"] { color: red; }');

    // The original sheet is still first, same rules, byte-for-byte.
    expect(document.styleSheets[0]).toBe(beforeSheet);
    const afterRules = Array.from(document.styleSheets[0]!.cssRules).map(
      (r) => r.cssText,
    );
    expect(afterRules).toEqual(beforeRules);
    expect(pre.textContent).toBe(".pre { color: green; }");
  });

  it("reuses an adapter node that already exists (hot-reload safety)", () => {
    const existing = document.createElement("style");
    existing.setAttribute(ADAPTER_STYLE_ATTR, "");
    document.head.appendChild(existing);
    const node = injectStyles("x {}");
    expect(node).toBe(existing);
    expect(document.querySelectorAll(`style[${ADAPTER_STYLE_ATTR}]`)).toHaveLength(1);
  });
});

describe("clearStyles", () => {
  it("removes the adapter node without affecting other stylesheets", () => {
    const pre = document.createElement("style");
    pre.textContent = ".pre {}";
    document.head.appendChild(pre);
    injectStyles("a {}");
    expect(document.querySelectorAll(`style[${ADAPTER_STYLE_ATTR}]`)).toHaveLength(1);

    clearStyles();
    expect(document.querySelectorAll(`style[${ADAPTER_STYLE_ATTR}]`)).toHaveLength(0);
    expect(pre.parentElement).toBe(document.head);
  });

  it("is safe when no adapter node exists", () => {
    expect(() => clearStyles()).not.toThrow();
  });
});

describe("discoverStyleElements", () => {
  it("collects unique groups and their rules from a subtree", () => {
    document.body.innerHTML = `
      <div data-style-group="hero" data-style-rules="color,font-size"></div>
      <div data-style-group="hero" data-style-rules="font-size,text-align"></div>
      <div data-style-group="footer" data-style-rules="margin"></div>
      <span>no style here</span>
    `;
    const result = discoverStyleElements(document.body);
    expect(result).toEqual([
      { group: "footer", rules: ["margin"] },
      { group: "hero", rules: ["color", "font-size", "text-align"] },
    ]);
  });

  it("returns an empty set for a subtree with no style attributes", () => {
    document.body.innerHTML = `<div><span>plain</span></div>`;
    expect(discoverStyleElements(document.body)).toEqual([]);
  });

  it("includes the root element itself when it carries the attribute", () => {
    const root = document.createElement("div");
    root.setAttribute("data-style-group", "self");
    expect(discoverStyleElements(root)).toEqual([{ group: "self", rules: [] }]);
  });

  it("does not mutate the DOM", () => {
    document.body.innerHTML = `<div data-style-group="g" data-style-rules="color"></div>`;
    const before = document.body.innerHTML;
    discoverStyleElements(document.body);
    expect(document.body.innerHTML).toBe(before);
  });
});
