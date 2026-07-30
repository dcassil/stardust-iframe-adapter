import { describe, expect, it } from "vitest";
import {
  DATA_TRANSFER_KEYS,
  opFromDataTransfer,
  type DataTransferLike,
} from "./operations.js";

/** Build a `DataTransferLike` from a plain key/value map. */
function dt(values: Record<string, string>): DataTransferLike {
  return {
    getData: (format: string): string => values[format] ?? "",
  };
}

describe("opFromDataTransfer", () => {
  it("TC-001: new block drop yields an InsertOp", () => {
    const op = opFromDataTransfer(dt({ [DATA_TRANSFER_KEYS.type]: "text" }), {
      targetId: "t1",
      index: 2,
    });
    expect(op).toEqual({
      kind: "insert",
      targetId: "t1",
      index: 2,
      payload: { type: "text" },
    });
  });

  it("TC-002: existing item drag yields a MoveOp with source + destination", () => {
    const op = opFromDataTransfer(
      dt({
        [DATA_TRANSFER_KEYS.isMove]: "true",
        [DATA_TRANSFER_KEYS.contentId]: "c9",
        [DATA_TRANSFER_KEYS.sourceTarget]: "t2",
        [DATA_TRANSFER_KEYS.sourceIndex]: "3",
      }),
      { targetId: "t2", index: 0 },
    );
    expect(op).toEqual({
      kind: "move",
      from: { targetId: "t2", index: 3, contentId: "c9" },
      to: { targetId: "t2", index: 0 },
    });
  });

  it("prefers move over insert when a contentId is present", () => {
    const op = opFromDataTransfer(
      dt({
        [DATA_TRANSFER_KEYS.type]: "text",
        [DATA_TRANSFER_KEYS.contentId]: "c1",
      }),
      { targetId: "t1", index: 1 },
    );
    expect(op?.kind).toBe("move");
  });

  it("falls back to the drop target when source target is missing on a move", () => {
    const op = opFromDataTransfer(
      dt({ [DATA_TRANSFER_KEYS.contentId]: "c5" }),
      { targetId: "tX", index: 4 },
    );
    expect(op).toEqual({
      kind: "move",
      from: { targetId: "tX", index: 0, contentId: "c5" },
      to: { targetId: "tX", index: 4 },
    });
  });

  it("returns null for an empty dataTransfer", () => {
    expect(opFromDataTransfer(dt({}), { targetId: "t1", index: 0 })).toBeNull();
  });

  it("returns null (does not throw) for null/undefined dataTransfer", () => {
    expect(opFromDataTransfer(null, { targetId: "t1", index: 0 })).toBeNull();
    expect(opFromDataTransfer(undefined, { targetId: "t1", index: 0 })).toBeNull();
  });

  it("handles a malformed numeric source index deterministically", () => {
    const op = opFromDataTransfer(
      dt({
        [DATA_TRANSFER_KEYS.contentId]: "c1",
        [DATA_TRANSFER_KEYS.sourceIndex]: "not-a-number",
      }),
      { targetId: "t1", index: 2 },
    );
    expect(op).toEqual({
      kind: "move",
      from: { targetId: "t1", index: 0, contentId: "c1" },
      to: { targetId: "t1", index: 2 },
    });
  });
});
