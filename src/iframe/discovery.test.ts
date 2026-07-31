import { afterEach, describe, expect, it } from "vitest";
import {
  CONTAINER_INSET,
  discoverTargets,
  toGeometry,
} from "./discovery.js";

/* -------------------------------------------------------------------------- */
/* Test helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * jsdom does not lay elements out, so `getBoundingClientRect()` returns all
 * zeros. We stub a known rect per element so geometry assertions are meaningful.
 */
function stubRect(
  el: HTMLElement,
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  }
): void {
  const { top, left, width, height } = rect;
  const domRect: DOMRect = {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {
      return this;
    },
  };
  el.getBoundingClientRect = (): DOMRect => domRect;
}

function setBody(html: string): void {
  document.body.innerHTML = html;
}

afterEach(() => {
  document.body.innerHTML = "";
});

/* -------------------------------------------------------------------------- */
/* toGeometry                                                                 */
/* -------------------------------------------------------------------------- */

describe("toGeometry", () => {
  it("copies the eight numeric fields into a plain object (not a DOMRect)", () => {
    const el = document.createElement("div");
    stubRect(el, { top: 5, left: 10, width: 100, height: 50 });

    const geometry = toGeometry(el.getBoundingClientRect());

    expect(geometry).toEqual({
      top: 5,
      right: 110,
      bottom: 55,
      left: 10,
      width: 100,
      height: 50,
      x: 10,
      y: 5,
    });
    // Plain object literal, structured-clone-safe.
    expect(Object.getPrototypeOf(geometry)).toBe(Object.prototype);
    if (typeof DOMRect !== "undefined") {
      expect(geometry instanceof DOMRect).toBe(false);
    }
    for (const value of Object.values(geometry)) {
      expect(typeof value).toBe("number");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* discoverTargets                                                            */
/* -------------------------------------------------------------------------- */

describe("discoverTargets", () => {
  it("TC-001: returns one target with empty children for a target with no content", () => {
    setBody(`<div data-cms="hero"></div>`);
    stubRect(document.querySelector<HTMLElement>('[data-cms="hero"]')!, {
      top: 0,
      left: 0,
      width: 200,
      height: 80,
    });

    const targets = discoverTargets(document);

    expect(targets).toHaveLength(1);
    const target = targets[0]!;
    expect(target.targetId).toBe("hero");
    expect(target.isContainer).toBe(false);
    expect(target.children).toEqual([]);
    expect(target.geometry.width).toBe(200);
    expect(target.geometry.height).toBe(80);
  });

  it("TC-002: geometry is a plain object with eight numeric fields, not a DOMRect", () => {
    setBody(`<div data-cms="hero"></div>`);
    stubRect(document.querySelector<HTMLElement>('[data-cms="hero"]')!, {
      top: 12,
      left: 34,
      width: 56,
      height: 78,
    });

    const { geometry } = discoverTargets(document)[0]!;

    expect(Object.getPrototypeOf(geometry)).toBe(Object.prototype);
    if (typeof DOMRect !== "undefined") {
      expect(geometry instanceof DOMRect).toBe(false);
    }
    expect(Object.keys(geometry).sort()).toEqual(
      ["bottom", "height", "left", "right", "top", "width", "x", "y"].sort()
    );
    expect(geometry).toMatchObject({ top: 12, left: 34, width: 56, height: 78 });
  });

  it("returns targets in stable document order", () => {
    setBody(`
      <div data-cms="a"></div>
      <div data-cms="b"></div>
      <div data-cms="c"></div>
    `);
    document
      .querySelectorAll<HTMLElement>("[data-cms]")
      .forEach((el) => { stubRect(el, { top: 0, left: 0, width: 10, height: 10 }); });

    const ids = discoverTargets(document).map((t) => t.targetId);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("collects multiple content children with correct indices and style groups", () => {
    setBody(`
      <div data-cms="body">
        <div id="c1" data-cms-content data-style-group="text"></div>
        <img id="c2" data-cms-content data-style-group="media" />
        <div id="c3" data-cms-content></div>
      </div>
    `);
    document
      .querySelectorAll<HTMLElement>("[data-cms], [data-cms-content]")
      .forEach((el) => { stubRect(el, { top: 0, left: 0, width: 20, height: 20 }); });

    const target = discoverTargets(document)[0]!;

    expect(target.children).toHaveLength(3);
    expect(target.children.map((c) => c.index)).toEqual([0, 1, 2]);
    expect(target.children.map((c) => c.contentId)).toEqual(["c1", "c2", "c3"]);
    expect(target.children.map((c) => c.styleGroup)).toEqual([
      "text",
      "media",
      "", // missing data-style-group -> empty string
    ]);
    expect(target.children.every((c) => c.isContainer)).toBe(false);
  });

  it("marks a target as a container when it has a [data-cms-container-target] descendant", () => {
    setBody(`
      <div data-cms="grid">
        <div data-cms-container-target></div>
      </div>
      <div data-cms="plain"></div>
    `);
    document
      .querySelectorAll<HTMLElement>("[data-cms]")
      .forEach((el) => { stubRect(el, { top: 0, left: 0, width: 30, height: 30 }); });

    const [grid, plain] = discoverTargets(document);
    expect(grid!.isContainer).toBe(true);
    expect(plain!.isContainer).toBe(false);
  });

  it("applies the container inset to a content child that nests further content", () => {
    setBody(`
      <div data-cms="outer">
        <div id="col" data-cms-content>
          <div id="inner" data-cms-content></div>
        </div>
      </div>
    `);
    const outer = document.querySelector<HTMLElement>('[data-cms="outer"]')!;
    const col = document.querySelector<HTMLElement>("#col")!;
    const inner = document.querySelector<HTMLElement>("#inner")!;
    stubRect(outer, { top: 0, left: 0, width: 100, height: 100 });
    stubRect(col, { top: 50, left: 0, width: 100, height: 60 });
    stubRect(inner, { top: 55, left: 0, width: 100, height: 20 });

    const target = discoverTargets(document)[0]!;
    const colChild = target.children.find((c) => c.contentId === "col")!;
    const innerChild = target.children.find((c) => c.contentId === "inner")!;

    // `col` nests `inner`, so it is a container and gets the inset.
    expect(colChild.isContainer).toBe(true);
    expect(colChild.geometry.top).toBe(50 - CONTAINER_INSET);
    expect(colChild.geometry.height).toBe(60 - CONTAINER_INSET);
    // `inner` nests nothing, so it is untouched.
    expect(innerChild.isContainer).toBe(false);
    expect(innerChild.geometry.top).toBe(55);
    expect(innerChild.geometry.height).toBe(20);
  });

  it("honors an overridden containerInset", () => {
    setBody(`
      <div data-cms="outer">
        <div id="col" data-cms-content>
          <div id="inner" data-cms-content></div>
        </div>
      </div>
    `);
    const outer = document.querySelector<HTMLElement>('[data-cms="outer"]')!;
    const col = document.querySelector<HTMLElement>("#col")!;
    const inner = document.querySelector<HTMLElement>("#inner")!;
    [outer, inner].forEach((el) =>
      { stubRect(el, { top: 0, left: 0, width: 10, height: 10 }); }
    );
    stubRect(col, { top: 40, left: 0, width: 100, height: 50 });

    const target = discoverTargets(document, { containerInset: 4 })[0]!;
    const colChild = target.children.find((c) => c.contentId === "col")!;
    expect(colChild.geometry.top).toBe(36);
    expect(colChild.geometry.height).toBe(46);
  });

  it("scopes discovery to the given root element", () => {
    setBody(`
      <div id="outside" data-cms="outside"></div>
      <section id="scope">
        <div data-cms="inside"></div>
      </section>
    `);
    document
      .querySelectorAll<HTMLElement>("[data-cms]")
      .forEach((el) => { stubRect(el, { top: 0, left: 0, width: 10, height: 10 }); });

    const scope = document.querySelector<HTMLElement>("#scope")!;
    const ids = discoverTargets(scope).map((t) => t.targetId);
    expect(ids).toEqual(["inside"]);
  });
});
