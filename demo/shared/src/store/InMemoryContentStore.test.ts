import { describe, expect, it, vi } from "vitest";
import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import type { InsertOp, MoveOp } from "@stardust-cms/iframe-adapter/host";
import { InMemoryContentStore, type StoreSeedItem } from "./InMemoryContentStore.js";
import type { ContentStore, ContentSnapshot } from "./ContentStore.js";
import type { EditOp, DeleteOp } from "./operations.js";

const SEED: StoreSeedItem[] = [
  { targetId: "hero", index: 0, content: { id: "hero-title", type: "text", value: "Hi" } },
  { targetId: "hero", index: 1, content: { id: "hero-sub", type: "text", value: "Sub" } },
  { targetId: "list", index: 0, content: { id: "l0", type: "text", value: "A" } },
  { targetId: "list", index: 1, content: { id: "l1", type: "text", value: "B" } },
  { targetId: "list", index: 2, content: { id: "l2", type: "text", value: "C" } },
  // Nested container child targets.
  { targetId: "col.1", index: 0, content: { id: "c1a", type: "text", value: "left" } },
  { targetId: "col.2", index: 0, content: { id: "c2a", type: "text", value: "right" } },
];

function store(): ContentStore {
  return new InMemoryContentStore(SEED);
}

/** Extract the ordered content ids for a target from a snapshot. */
function idsFor(snapshot: ContentSnapshot, targetId: string): string[] {
  return snapshot
    .filter((p) => p.targetId === targetId)
    .sort((a, b) => a.index - b.index)
    .map((p) => p.content.id);
}

function itemAt(
  snapshot: ContentSnapshot,
  targetId: string,
  index: number,
): ContentPayload | undefined {
  return snapshot.find((p) => p.targetId === targetId && p.index === index);
}

describe("InMemoryContentStore (SIFR-T-0009)", () => {
  it("seeds and snapshots in (targetId, index) order matching cms/sendElements shape", () => {
    const snap = store().getSnapshot();
    expect(idsFor(snap, "hero")).toEqual(["hero-title", "hero-sub"]);
    expect(idsFor(snap, "list")).toEqual(["l0", "l1", "l2"]);
    // Every payload has the fields cms/sendElements requires.
    for (const p of snap) {
      expect(p).toMatchObject({
        targetId: expect.any(String),
        contentId: p.content.id,
        index: expect.any(Number),
      });
    }
  });

  it("insert: places a new block at the given index and shifts the rest", () => {
    const s = store();
    const op: InsertOp = {
      kind: "insert",
      targetId: "list",
      index: 1,
      payload: { type: "text", value: "NEW", id: "lnew" },
    };
    const snap = s.apply(op);
    expect(idsFor(snap, "list")).toEqual(["l0", "lnew", "l1", "l2"]);
    expect(itemAt(snap, "list", 1)?.content.value).toBe("NEW");
  });

  it("insert into the nested container child target at correct position", () => {
    const s = store();
    const op: InsertOp = {
      kind: "insert",
      targetId: "col.1",
      index: 1,
      payload: { type: "text", value: "added", id: "c1b" },
    };
    const snap = s.apply(op);
    expect(idsFor(snap, "col.1")).toEqual(["c1a", "c1b"]);
    expect(itemAt(snap, "col.1", 1)?.content.id).toBe("c1b");
  });

  it("insert at boundary (index past end) appends", () => {
    const s = store();
    const snap = s.apply({
      kind: "insert",
      targetId: "list",
      index: 99,
      payload: { type: "text", value: "END", id: "lend" },
    });
    expect(idsFor(snap, "list")).toEqual(["l0", "l1", "l2", "lend"]);
  });

  it("insert with an unknown type falls back to text and auto-generates an id", () => {
    const s = store();
    const snap = s.apply({
      kind: "insert",
      targetId: "hero",
      index: 0,
      payload: { type: "widget" },
    });
    const first = itemAt(snap, "hero", 0)!;
    expect(first.content.type).toBe("text");
    expect(first.content.id).toMatch(/^text-/);
  });

  it("move: reorders within a target", () => {
    const s = store();
    const op: MoveOp = {
      kind: "move",
      from: { targetId: "list", index: 0, contentId: "l0" },
      to: { targetId: "list", index: 2 },
    };
    const snap = s.apply(op);
    // Removing l0 first, then inserting at index 2 of the shortened list.
    expect(idsFor(snap, "list")).toEqual(["l1", "l2", "l0"]);
  });

  it("move: relocates across targets (into the nested container)", () => {
    const s = store();
    const op: MoveOp = {
      kind: "move",
      from: { targetId: "list", index: 1, contentId: "l1" },
      to: { targetId: "col.2", index: 0 },
    };
    const snap = s.apply(op);
    expect(idsFor(snap, "list")).toEqual(["l0", "l2"]);
    expect(idsFor(snap, "col.2")).toEqual(["l1", "c2a"]);
  });

  it("move to the same position is a no-op on ordering", () => {
    const s = store();
    const before = idsFor(s.getSnapshot(), "list");
    const snap = s.apply({
      kind: "move",
      from: { targetId: "list", index: 1, contentId: "l1" },
      to: { targetId: "list", index: 1 },
    });
    expect(idsFor(snap, "list")).toEqual(before);
  });

  it("edit: updates a field of the addressed item, preserving id and type", () => {
    const s = store();
    const op: EditOp = {
      kind: "edit",
      targetId: "hero",
      contentId: "hero-title",
      patch: { value: "Changed" },
    };
    const snap = s.apply(op);
    const item = snap.find((p) => p.content.id === "hero-title")!;
    expect(item.content.value).toBe("Changed");
    expect(item.content.type).toBe("text");
  });

  it("delete: removes a block", () => {
    const s = store();
    const op: DeleteOp = { kind: "delete", targetId: "list", contentId: "l1" };
    const snap = s.apply(op);
    expect(idsFor(snap, "list")).toEqual(["l0", "l2"]);
  });

  it("delete last child of a container target empties it", () => {
    const s = store();
    const snap = s.apply({ kind: "delete", targetId: "col.1", contentId: "c1a" });
    expect(idsFor(snap, "col.1")).toEqual([]);
  });

  it("subscribe: notifies with the fresh snapshot on every apply; unsubscribe stops it", () => {
    const s = store();
    const listener = vi.fn();
    const unsub = s.subscribe(listener);

    s.apply({ kind: "delete", targetId: "list", contentId: "l0" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(idsFor(listener.mock.calls[0]![0], "list")).toEqual(["l1", "l2"]);

    unsub();
    s.apply({ kind: "delete", targetId: "list", contentId: "l1" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("snapshots do not alias internal state (mutating a snapshot item is safe)", () => {
    const s = store();
    const snap = s.getSnapshot();
    // Mutate the returned content; the store's next snapshot must be unaffected.
    (snap[0]!.content as { value?: string }).value = "mutated externally";
    const fresh = s.getSnapshot();
    expect(fresh[0]!.content.value).not.toBe("mutated externally");
  });

  it("interface parity (TC-002): a second ContentStore impl satisfies the same ops", () => {
    // A trivial alternative implementation proves the UI can depend on the
    // interface alone — swapping the concrete class needs no op-shape changes.
    class RecordingStore implements ContentStore {
      applied: string[] = [];
      private inner = new InMemoryContentStore(SEED);
      getSnapshot(): ContentSnapshot {
        return this.inner.getSnapshot();
      }
      apply(op: InsertOp | MoveOp | EditOp | DeleteOp): ContentSnapshot {
        this.applied.push(op.kind);
        return this.inner.apply(op);
      }
      subscribe(l: (s: ContentSnapshot) => void): () => void {
        return this.inner.subscribe(l);
      }
    }
    const alt: ContentStore = new RecordingStore();
    alt.apply({ kind: "delete", targetId: "list", contentId: "l0" });
    alt.apply({
      kind: "insert",
      targetId: "list",
      index: 0,
      payload: { type: "text", id: "x", value: "x" },
    });
    expect((alt as RecordingStore).applied).toEqual(["delete", "insert"]);
    expect(idsFor(alt.getSnapshot(), "list")).toEqual(["x", "l1", "l2"]);
  });
});
