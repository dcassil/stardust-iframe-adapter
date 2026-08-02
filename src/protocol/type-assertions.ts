/**
 * Compile-time assertions for the protocol module. This file emits no runtime
 * code of consequence; it exists so `tsc --noEmit` fails if a registry entry
 * infers the wrong request/response type or a payload shape drifts.
 *
 * If any assertion below is wrong, the build breaks. That is the point.
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
  SerializableRect,
  StardustMessageKey,
} from "./registry.js";
import { MESSAGE_KEYS } from "./registry.js";

/** Assert two types are mutually assignable (structurally equal). */
type Expect<T extends true> = T;
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/* --- Registry request/response inference --------------------------------- */

type _RequestTargetPositions_Request = Expect<
  Equal<RequestOf<"cms/requestTargetPositions">, void>
>;
type _RequestTargetPositions_Response = Expect<
  Equal<ResponseOf<"cms/requestTargetPositions">, ContentTarget[]>
>;

type _SendElements_Request = Expect<
  Equal<RequestOf<"cms/sendElements">, ContentPayload>
>;
type _SendElements_Response = Expect<Equal<ResponseOf<"cms/sendElements">, void>>;

type _SendElementPositions_Request = Expect<
  Equal<RequestOf<"cms/sendElementPositions">, ContentTarget[]>
>;

type _SendScrollPositions_Request = Expect<
  Equal<RequestOf<"cms/sendScrollPositions">, ScrollState>
>;

type _Pointer_Request = Expect<
  Equal<RequestOf<"cms/pointer">, PointerState>
>;
type _Pointer_Response = Expect<Equal<ResponseOf<"cms/pointer">, void>>;

/* --- Geometry shape ------------------------------------------------------ */

type _GeometryFields = Expect<
  Equal<
    keyof Geometry,
    "top" | "right" | "bottom" | "left" | "width" | "height" | "x" | "y"
  >
>;
type _SerializableRectAlias = Expect<Equal<SerializableRect, Geometry>>;

/* --- ScrollState shape --------------------------------------------------- */

type _ScrollStateFields = Expect<
  Equal<keyof ScrollState, "h" | "y" | "isTop" | "isBottom">
>;

/* --- PointerState shape -------------------------------------------------- */

type _PointerStateFields = Expect<
  Equal<keyof PointerState, "x" | "y" | "inside">
>;

/* --- ChildContent shape -------------------------------------------------- */

type _ChildContentFields = Expect<
  Equal<
    keyof ChildContent,
    "contentId" | "index" | "isContainer" | "styleGroup" | "geometry"
  >
>;

/* --- A wrong payload shape is a compile error ---------------------------- */
// The following is intentionally rejected by the compiler to prove the registry
// is strict. It is quarantined behind @ts-expect-error so the assertion itself
// compiles: if the error ever DISAPPEARS (i.e. the wrong shape becomes valid),
// tsc fails on the unused directive.
{
  const geometryValue: Geometry = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  };
  // @ts-expect-error a Geometry is not a valid ScrollState request payload.
  const _bad: RequestOf<"cms/sendScrollPositions"> = geometryValue;
  void _bad;
}

/* --- Runtime marker covers exactly the registry keys --------------------- */

type _KeysCovered = Expect<
  Equal<keyof typeof MESSAGE_KEYS, StardustMessageKey>
>;

// Force the assertion aliases to be "used" so noUnusedLocals-style strictness
// (if enabled downstream) does not complain, without emitting runtime code.
export type __ProtocolTypeAssertions = [
  _RequestTargetPositions_Request,
  _RequestTargetPositions_Response,
  _SendElements_Request,
  _SendElements_Response,
  _SendElementPositions_Request,
  _SendScrollPositions_Request,
  _Pointer_Request,
  _Pointer_Response,
  _GeometryFields,
  _SerializableRectAlias,
  _ScrollStateFields,
  _PointerStateFields,
  _ChildContentFields,
  _KeysCovered,
];
