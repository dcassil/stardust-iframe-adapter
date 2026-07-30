import { describe, expect, it } from "vitest";
import type { Geometry } from "../protocol/index.js";
import { mapGeometry } from "./mapGeometry.js";

/**
 * Build a full `Geometry` from the four load-bearing fields. `right`/`bottom`/
 * `x`/`y` are derived so fixtures stay internally consistent even though
 * `mapGeometry` only reads `top`/`left`/`width`/`height`.
 */
function geom(top: number, left: number, width: number, height: number): Geometry {
  return {
    top,
    left,
    width,
    height,
    x: left,
    y: top,
    right: left + width,
    bottom: top + height,
  };
}

describe("mapGeometry", () => {
  it("TC-001: is the identity at scale 1 with zero scroll", () => {
    expect(
      mapGeometry(geom(100, 50, 200, 80), {
        scale: 1,
        scrollOffset: { x: 0, y: 0 },
      }),
    ).toEqual({ top: 100, left: 50, width: 200, height: 80 });
  });

  it("TC-002: combines scale and non-zero scroll", () => {
    expect(
      mapGeometry(geom(200, 100, 400, 100), {
        scale: 0.5,
        scrollOffset: { x: 20, y: 40 },
      }),
    ).toEqual({ left: 40, top: 80, width: 200, height: 50 });
  });

  it("scales dimensions and offsets at scale < 1 with zero scroll", () => {
    expect(
      mapGeometry(geom(100, 50, 200, 80), {
        scale: 0.5,
        scrollOffset: { x: 0, y: 0 },
      }),
    ).toEqual({ top: 50, left: 25, width: 100, height: 40 });
  });

  it("translates by scroll offset at scale 1", () => {
    expect(
      mapGeometry(geom(100, 50, 200, 80), {
        scale: 1,
        scrollOffset: { x: 10, y: 30 },
      }),
    ).toEqual({ top: 70, left: 40, width: 200, height: 80 });
  });

  it("handles zero width/height boundary", () => {
    expect(
      mapGeometry(geom(10, 10, 0, 0), {
        scale: 0.5,
        scrollOffset: { x: 5, y: 5 },
      }),
    ).toEqual({ top: 2.5, left: 2.5, width: 0, height: 0 });
  });

  it("handles zero scale boundary (collapses to origin-projected point)", () => {
    expect(
      mapGeometry(geom(100, 50, 200, 80), {
        scale: 0,
        scrollOffset: { x: 0, y: 0 },
      }),
    ).toEqual({ top: 0, left: 0, width: 0, height: 0 });
  });

  it("supports negative projected offsets when scroll exceeds position", () => {
    expect(
      mapGeometry(geom(30, 40, 100, 100), {
        scale: 1,
        scrollOffset: { x: 60, y: 50 },
      }),
    ).toEqual({ top: -20, left: -20, width: 100, height: 100 });
  });

  it("is pure: does not mutate its input geometry", () => {
    const input = geom(100, 50, 200, 80);
    const snapshot = { ...input };
    mapGeometry(input, { scale: 0.5, scrollOffset: { x: 20, y: 40 } });
    expect(input).toEqual(snapshot);
  });

  it("is deterministic: same input yields identical output", () => {
    const input = geom(123, 45, 678, 90);
    const t = { scale: 0.5, scrollOffset: { x: 7, y: 11 } };
    expect(mapGeometry(input, t)).toEqual(mapGeometry(input, t));
  });

  it("NFR-001: representative fixtures land within 1px of analytic expectation", () => {
    // A 1280x2000 iframe document, target at (300, 640) size 500x120.
    const target = geom(300, 640, 500, 120);
    const scrollOffset = { x: 0, y: 250 };

    // scale = 1
    const full = mapGeometry(target, { scale: 1, scrollOffset });
    expect(Math.abs(full.left - 640)).toBeLessThanOrEqual(1);
    expect(Math.abs(full.top - (300 - 250))).toBeLessThanOrEqual(1);
    expect(Math.abs(full.width - 500)).toBeLessThanOrEqual(1);
    expect(Math.abs(full.height - 120)).toBeLessThanOrEqual(1);

    // scale = 0.5
    const half = mapGeometry(target, { scale: 0.5, scrollOffset });
    expect(Math.abs(half.left - 640 * 0.5)).toBeLessThanOrEqual(1);
    expect(Math.abs(half.top - (300 - 250) * 0.5)).toBeLessThanOrEqual(1);
    expect(Math.abs(half.width - 250)).toBeLessThanOrEqual(1);
    expect(Math.abs(half.height - 60)).toBeLessThanOrEqual(1);
  });
});
