/**
 * Sample payload fixtures for every protocol type. Imported by the
 * serializability tests (SIFR-T-0003) so the fixtures are type-checked against
 * the real protocol types and cannot drift.
 */

import type {
  ChildContent,
  ContentPayload,
  ContentTarget,
  Geometry,
  PointerState,
  RequestOf,
  ResponseOf,
  ScrollState,
  StyleUpdatePayload,
} from "./registry.js";

export const geometryFixture: Geometry = {
  top: 10,
  right: 210,
  bottom: 110,
  left: 20,
  width: 190,
  height: 100,
  x: 20,
  y: 10,
};

export const scrollStateFixture: ScrollState = {
  h: 0,
  y: 320,
  isTop: false,
  isBottom: false,
};

export const pointerStateFixture: PointerState = {
  x: 0.25,
  y: 0.75,
  inside: true,
};

export const childContentFixture: ChildContent = {
  contentId: "content-1",
  index: 0,
  isContainer: false,
  styleGroup: "group-a",
  geometry: geometryFixture,
};

export const contentTargetFixture: ContentTarget = {
  targetId: "target-1",
  isContainer: true,
  geometry: geometryFixture,
  children: [
    childContentFixture,
    {
      contentId: "content-2",
      index: 1,
      isContainer: true,
      styleGroup: "group-b",
      geometry: {
        top: 120,
        right: 210,
        bottom: 220,
        left: 20,
        width: 190,
        height: 100,
        x: 20,
        y: 120,
      },
    },
  ],
};

export const contentPayloadFixture: ContentPayload = {
  targetId: "target-1",
  contentId: "content-3",
  index: 2,
  content: {
    id: "content-3",
    type: "text",
    value: "hello",
    styleGroup: "group-a",
  },
  html: "<p>hello</p>",
  data: { kind: "text", nested: { count: 3, tags: ["a", "b"] } },
};

export const styleUpdatePayloadFixture: StyleUpdatePayload = {
  styleGroup: "group-a",
  type: "text",
  property: "color",
  value: "#111",
  declarations: { color: "#111", "font-size": "16px" },
};

/** Request payload per registry key (void keys omitted where request is void). */
export const requestFixtures = {
  "cms/sendElements": contentPayloadFixture,
  "cms/sendElementPositions": [contentTargetFixture],
  "cms/sendScrollPositions": scrollStateFixture,
  "cms/pointer": pointerStateFixture,
  "cms/updateStyles": styleUpdatePayloadFixture,
} satisfies {
  "cms/sendElements": RequestOf<"cms/sendElements">;
  "cms/sendElementPositions": RequestOf<"cms/sendElementPositions">;
  "cms/sendScrollPositions": RequestOf<"cms/sendScrollPositions">;
  "cms/pointer": RequestOf<"cms/pointer">;
  "cms/updateStyles": RequestOf<"cms/updateStyles">;
};

/** Response payloads that are non-void. */
export const responseFixtures = {
  "cms/requestTargetPositions": [contentTargetFixture],
} satisfies {
  "cms/requestTargetPositions": ResponseOf<"cms/requestTargetPositions">;
};
