/**
 * SIFR-T-0003 — Structured-clone serializability round-trip tests.
 *
 * Proves NFR-001: every protocol payload survives the structured-clone
 * algorithm that `postMessage` uses, with no DOM nodes, functions, or class
 * instances leaking in. Runtime companion to the compile-time assertions in
 * `../type-assertions.ts`.
 *
 * Uses vitest (Jest-compatible `describe`/`it`/`expect`) and Node's global
 * `structuredClone`.
 */

import { describe, expect, it } from "vitest";

import { MESSAGE_KEYS } from "../registry.js";
import {
  childContentFixture,
  contentPayloadFixture,
  contentTargetFixture,
  geometryFixture,
  pointerStateFixture,
  requestFixtures,
  responseFixtures,
  scrollStateFixture,
  styleUpdatePayloadFixture,
} from "../fixtures.js";

/** Round-trip a value through structured clone and assert deep equality. */
function assertRoundTrips(value: unknown): void {
  const clone = structuredClone(value);
  expect(clone).toEqual(value);
  // A structured clone is always a distinct object graph (not the same ref).
  if (value !== null && typeof value === "object") {
    expect(clone).not.toBe(value);
  }
}

describe("protocol payload serializability", () => {
  it("TC-001: Geometry round-trips losslessly", () => {
    assertRoundTrips(geometryFixture);
  });

  it("ScrollState round-trips losslessly", () => {
    assertRoundTrips(scrollStateFixture);
  });

  it("PointerState round-trips losslessly", () => {
    assertRoundTrips(pointerStateFixture);
    assertRoundTrips({ x: 0, y: 0, inside: false });
  });

  it("ChildContent round-trips losslessly", () => {
    assertRoundTrips(childContentFixture);
  });

  it("TC-002: ContentTarget with nested ChildContent[] round-trips", () => {
    assertRoundTrips(contentTargetFixture);
    const clone = structuredClone(contentTargetFixture);
    expect(clone.children).toHaveLength(2);
    expect(clone.children[1]?.geometry.top).toBe(120);
  });

  it("ContentPayload (with nested serializable data) round-trips", () => {
    assertRoundTrips(contentPayloadFixture);
  });

  it("StyleUpdatePayload round-trips", () => {
    assertRoundTrips(styleUpdatePayloadFixture);
  });
});

describe("registry coverage: every message key has a round-trip case", () => {
  // Request payloads (non-void requests).
  it.each(Object.entries(requestFixtures))(
    "request payload for %s round-trips",
    (_key, fixture) => {
      assertRoundTrips(fixture);
    },
  );

  // Response payloads (non-void responses).
  it.each(Object.entries(responseFixtures))(
    "response payload for %s round-trips",
    (_key, fixture) => {
      assertRoundTrips(fixture);
    },
  );

  it("every declared registry key is covered by a fixture or is void/reserved", () => {
    const covered = new Set<string>([
      ...Object.keys(requestFixtures),
      ...Object.keys(responseFixtures),
    ]);
    // Keys whose request AND response are both void, or reserved channels,
    // legitimately have no payload fixture.
    const voidOrReserved = new Set<string>([
      "cms/requestTargetPositions", // covered via responseFixtures
      "cms/presence", // reserved (SIFR-I-0006)
    ]);
    for (const key of Object.keys(MESSAGE_KEYS)) {
      const isCovered = covered.has(key) || voidOrReserved.has(key);
      expect(isCovered, `message key ${key} lacks a round-trip case`).toBe(true);
    }
  });
});

describe("negative guard: non-cloneable payloads throw", () => {
  it("TC-003: a payload containing a function throws under structuredClone", () => {
    const withFunction = { targetId: "t", onClick: () => undefined };
    expect(() => structuredClone(withFunction)).toThrow();
  });

  it("a payload containing a non-plain class instance is not preserved as such", () => {
    // Documents why the plain Geometry type is mandated instead of DOMRect:
    // a class instance loses its prototype/identity across the clone boundary.
    class Rect {
      constructor(public top: number) {}
      area(): number {
        return this.top;
      }
    }
    const instance = new Rect(5);
    const clone = structuredClone(instance);
    // The numeric field survives, but it is no longer a Rect and has no method.
    expect(clone.top).toBe(5);
    expect(clone).not.toBeInstanceOf(Rect);
    expect(
      (clone as unknown as { area?: unknown }).area,
    ).toBeUndefined();
  });
});
