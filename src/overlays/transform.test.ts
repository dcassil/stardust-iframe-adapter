import { describe, expect, it } from "vitest";
import { mapGeometry, type GeometryTransform } from "../host/mapGeometry.js";
import { mapGeometryTransform } from "./transform.js";

/**
 * The transform seam must project a normalized colab point to EXACTLY the
 * host-viewport `left`/`top` the pre-migration overlay computed for a pointer:
 * a zero-size geometry at `(x, y)` run through `mapGeometry`. These tests pin
 * that the colab `Transform` produced here is byte-identical to `mapGeometry`
 * under scale and scroll, so a known point projects to the same position as
 * before the migration.
 */
describe("mapGeometryTransform (mapGeometry-as-colab-Transform)", () => {
  const point = { x: 200, y: 300 };

  function expectedFor(transform: GeometryTransform): { x: number; y: number } {
    const mapped = mapGeometry(
      {
        top: point.y,
        left: point.x,
        right: point.x,
        bottom: point.y,
        width: 0,
        height: 0,
        x: point.x,
        y: point.y,
      },
      transform,
    );
    return { x: mapped.left, y: mapped.top };
  }

  it("is identity-projected (left=x, top=y) under the identity transform", () => {
    const t: GeometryTransform = { scale: 1, scrollOffset: { x: 0, y: 0 } };
    const project = mapGeometryTransform(t);
    expect(project(point)).toEqual({ x: 200, y: 300 });
    expect(project(point)).toEqual(expectedFor(t));
  });

  it("applies scale + scroll exactly as mapGeometry does", () => {
    const t: GeometryTransform = { scale: 0.5, scrollOffset: { x: 40, y: 60 } };
    const project = mapGeometryTransform(t);
    // (200 - 40) * 0.5 = 80 ; (300 - 60) * 0.5 = 120
    expect(project(point)).toEqual({ x: 80, y: 120 });
    expect(project(point)).toEqual(expectedFor(t));
    // And NOT the raw normalized point.
    expect(project(point).x).not.toBe(200);
  });

  it("matches mapGeometry across a sweep of transforms and points", () => {
    const transforms: GeometryTransform[] = [
      { scale: 1, scrollOffset: { x: 0, y: 0 } },
      { scale: 2, scrollOffset: { x: 10, y: 5 } },
      { scale: 0.25, scrollOffset: { x: -30, y: 100 } },
    ];
    const points = [
      { x: 0, y: 0 },
      { x: 12.5, y: 640 },
      { x: 1000, y: 1 },
    ];
    for (const t of transforms) {
      const project = mapGeometryTransform(t);
      for (const p of points) {
        const mapped = mapGeometry(
          { top: p.y, left: p.x, right: p.x, bottom: p.y, width: 0, height: 0, x: p.x, y: p.y },
          t,
        );
        expect(project(p)).toEqual({ x: mapped.left, y: mapped.top });
      }
    }
  });
});
