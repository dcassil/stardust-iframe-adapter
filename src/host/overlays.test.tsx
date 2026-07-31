// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createEvent, fireEvent, render } from "@testing-library/react";

/**
 * Fire a `drop` carrying a `clientY` and a `dataTransfer`. jsdom's default drop
 * event init drops `clientY`, so build the event and assign both fields.
 */
function fireDrop(
  node: Element,
  clientY: number,
  dataTransfer: unknown,
): void {
  const event = createEvent.drop(node, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clientY", { value: clientY });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  fireEvent(node, event);
}
import type { MappedChild, MappedTarget } from "./useStardustHost.js";
import { DATA_TRANSFER_KEYS } from "./operations.js";
import { ContentItemOverlay, TargetAreaOverlay } from "./overlays.js";

function child(
  contentId: string,
  index: number,
  top: number,
  height: number,
): MappedChild {
  return {
    contentId,
    index,
    isContainer: false,
    styleGroup: "g",
    geometry: { top, left: 40, width: 200, height },
  };
}

const TARGET: MappedTarget = {
  targetId: "t1",
  isContainer: false,
  geometry: { top: 80, left: 40, width: 200, height: 50 },
  children: [child("c1", 0, 80, 20), child("c2", 1, 100, 20)],
};

/** A minimal in-memory DataTransfer stand-in for jsdom drop events. */
function makeDataTransfer(values: Record<string, string> = {}) {
  const store: Record<string, string> = { ...values };
  return {
    getData: (k: string): string => store[k] ?? "",
    setData: (k: string, v: string): void => {
      store[k] = v;
    },
    store,
  };
}

describe("TargetAreaOverlay", () => {
  it("TC-001: renders at mapped coordinates and one child per content item", () => {
    const { container } = render(<TargetAreaOverlay target={TARGET} />);
    const box = container.querySelector<HTMLDivElement>('[data-target-id="t1"]')!;

    expect(box.style.position).toBe("absolute");
    expect(box.style.top).toBe("80px");
    expect(box.style.left).toBe("40px");
    expect(box.style.width).toBe("200px");
    expect(box.style.height).toBe("50px");

    const items = container.querySelectorAll("[data-content-id]");
    expect(items).toHaveLength(2);
    // Populated branch: a drop-area layer holding the per-item zones, plus the
    // content item boxes.
    expect(box.querySelector('[data-drop-area]')).not.toBeNull();
    expect(box.querySelectorAll('[data-drop-zone="empty"]')).toHaveLength(0);
  });

  it("renders no children and an empty box in the empty branch", () => {
    const empty: MappedTarget = { ...TARGET, children: [] };
    const { container } = render(<TargetAreaOverlay target={empty} />);
    const box = container.querySelector<HTMLDivElement>('[data-target-id="t1"]')!;
    expect(container.querySelectorAll("[data-content-id]")).toHaveLength(0);
    // Empty branch: a single full-area drop zone (index 0), no content items.
    const emptyZones = box.querySelectorAll('[data-drop-zone="empty"]');
    expect(emptyZones).toHaveLength(1);
    expect(emptyZones[0]!.getAttribute("data-drop-index")).toBe("0");
  });

  it("TC-002: a drop emits onInsert(targetId, index, payload) exactly once", () => {
    const onInsert = vi.fn();
    const { container } = render(
      <TargetAreaOverlay target={TARGET} onInsert={onInsert} />,
    );
    const box = container.querySelector<HTMLDivElement>('[data-target-id="t1"]')!;

    const dataTransfer = makeDataTransfer({ [DATA_TRANSFER_KEYS.type]: "text" });

    // jsdom's default box rect.top is 0, so offsetY == clientY. Child midpoints
    // relative to the box top are c1=10, c2=30. offsetY 20 lands between them
    // -> insert index 1.
    fireEvent.dragOver(box, { dataTransfer });
    fireDrop(box, 20, dataTransfer);

    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onInsert).toHaveBeenCalledWith("t1", 1, { type: "text" });
  });

  it("a drop of an existing item emits onMove(from, to)", () => {
    const onMove = vi.fn();
    const { container } = render(
      <TargetAreaOverlay target={TARGET} onMove={onMove} />,
    );
    const box = container.querySelector<HTMLDivElement>('[data-target-id="t1"]')!;

    const dataTransfer = makeDataTransfer({
      [DATA_TRANSFER_KEYS.contentId]: "c9",
      [DATA_TRANSFER_KEYS.sourceTarget]: "t0",
      [DATA_TRANSFER_KEYS.sourceIndex]: "3",
    });

    // offsetY 5 < first midpoint (10) -> insert index 0.
    fireDrop(box, 5, dataTransfer);

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(
      { targetId: "t0", index: 3, contentId: "c9" },
      { targetId: "t1", index: 0 },
    );
  });

  it("clicking the target box (not a child) fires onSelect(targetId)", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <TargetAreaOverlay target={TARGET} onSelect={onSelect} />,
    );
    const box = container.querySelector<HTMLDivElement>('[data-target-id="t1"]')!;
    fireEvent.click(box);
    expect(onSelect).toHaveBeenCalledWith("t1");
  });
});

describe("TargetAreaOverlay — drop zones + drag-over (0.1.1)", () => {
  it("clamps the drop area to at least minDropHeight for a short target", () => {
    const short: MappedTarget = {
      ...TARGET,
      geometry: { top: 80, left: 40, width: 200, height: 4 },
      children: [],
    };
    const { container } = render(
      <TargetAreaOverlay target={short} minDropHeight={30} />,
    );
    const area = container.querySelector<HTMLDivElement>("[data-drop-area]")!;
    expect(area.style.height).toBe("30px");
  });

  it("defaults minDropHeight to 18 when unset", () => {
    const short: MappedTarget = {
      ...TARGET,
      geometry: { top: 80, left: 40, width: 200, height: 2 },
      children: [],
    };
    const { container } = render(<TargetAreaOverlay target={short} />);
    const area = container.querySelector<HTMLDivElement>("[data-drop-area]")!;
    expect(area.style.height).toBe("18px");
  });

  it("does not shrink a tall target's drop area below its geometry", () => {
    const { container } = render(<TargetAreaOverlay target={TARGET} />);
    const area = container.querySelector<HTMLDivElement>("[data-drop-area]")!;
    // Geometry height 50 > default 18.
    expect(area.style.height).toBe("50px");
  });

  it("toggles data-dragover on enter/leave with an enter/leave counter", () => {
    const { container } = render(<TargetAreaOverlay target={TARGET} />);
    const box = container.querySelector<HTMLDivElement>('[data-target-id="t1"]')!;

    expect(box.hasAttribute("data-dragover")).toBe(false);

    // Two enters (box + child) then one leave should stay active.
    fireEvent.dragEnter(box);
    fireEvent.dragEnter(box);
    expect(box.hasAttribute("data-dragover")).toBe(true);
    fireEvent.dragLeave(box);
    expect(box.hasAttribute("data-dragover")).toBe(true);
    fireEvent.dragLeave(box);
    expect(box.hasAttribute("data-dragover")).toBe(false);
  });

  it("renders a top and bottom zone per item with correct drop indices", () => {
    const { container } = render(<TargetAreaOverlay target={TARGET} />);
    const tops = container.querySelectorAll('[data-drop-zone="top"]');
    const bottoms = container.querySelectorAll('[data-drop-zone="bottom"]');
    expect(tops).toHaveLength(2);
    expect(bottoms).toHaveLength(2);
    // c1 (index 0): top→0, bottom→1. c2 (index 1): top→1, bottom→2.
    expect(tops[0]!.getAttribute("data-drop-index")).toBe("0");
    expect(bottoms[0]!.getAttribute("data-drop-index")).toBe("1");
    expect(tops[1]!.getAttribute("data-drop-index")).toBe("1");
    expect(bottoms[1]!.getAttribute("data-drop-index")).toBe("2");
  });

  it("marks the hovered zone active on dragover with data-drop-active", () => {
    const { container } = render(<TargetAreaOverlay target={TARGET} />);
    const bottomOfFirst = container.querySelectorAll('[data-drop-zone="bottom"]')[0]!;

    expect(
      container.querySelectorAll("[data-drop-active]"),
    ).toHaveLength(0);

    fireEvent.dragOver(bottomOfFirst);

    const active = container.querySelectorAll("[data-drop-active]");
    expect(active).toHaveLength(1);
    expect(active[0]!.getAttribute("data-drop-index")).toBe("1");
  });

  it("dropping in a zone inserts at that zone's index", () => {
    const onInsert = vi.fn();
    const { container } = render(
      <TargetAreaOverlay target={TARGET} onInsert={onInsert} />,
    );
    const bottomOfSecond = container.querySelectorAll('[data-drop-zone="bottom"]')[1]!;
    const dataTransfer = makeDataTransfer({ [DATA_TRANSFER_KEYS.type]: "text" });

    fireEvent.dragOver(bottomOfSecond, { dataTransfer });
    const event = createEvent.drop(bottomOfSecond, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
    fireEvent(bottomOfSecond, event);

    // c2 bottom → index 2.
    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onInsert).toHaveBeenCalledWith("t1", 2, { type: "text" });
  });

  it("renders exactly one full-area zone (index 0) for an empty target", () => {
    const empty: MappedTarget = { ...TARGET, children: [] };
    const { container } = render(<TargetAreaOverlay target={empty} />);
    const zones = container.querySelectorAll("[data-drop-zone]");
    expect(zones).toHaveLength(1);
    expect(zones[0]!.getAttribute("data-drop-zone")).toBe("empty");
    expect(zones[0]!.getAttribute("data-drop-index")).toBe("0");

    const onInsert = vi.fn();
    const { container: c2 } = render(
      <TargetAreaOverlay target={empty} onInsert={onInsert} />,
    );
    const zone = c2.querySelector('[data-drop-zone="empty"]')!;
    const dataTransfer = makeDataTransfer({ [DATA_TRANSFER_KEYS.type]: "text" });
    const event = createEvent.drop(zone, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
    fireEvent(zone, event);
    expect(onInsert).toHaveBeenCalledWith("t1", 0, { type: "text" });
  });

  it("clears drag-over state after a drop", () => {
    const { container } = render(
      <TargetAreaOverlay target={TARGET} onInsert={vi.fn()} />,
    );
    const box = container.querySelector<HTMLDivElement>('[data-target-id="t1"]')!;
    fireEvent.dragEnter(box);
    expect(box.hasAttribute("data-dragover")).toBe(true);

    const dataTransfer = makeDataTransfer({ [DATA_TRANSFER_KEYS.type]: "text" });
    fireDrop(box, 5, dataTransfer);
    expect(box.hasAttribute("data-dragover")).toBe(false);
    expect(container.querySelectorAll("[data-drop-active]")).toHaveLength(0);
  });

  it("idle (non-drag) selection still fires onSelect and zones don't capture", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <TargetAreaOverlay target={TARGET} onSelect={onSelect} />,
    );
    const box = container.querySelector<HTMLDivElement>('[data-target-id="t1"]')!;
    // Idle: zones are pointer-events:none so a box click still selects.
    const zone = container.querySelector<HTMLElement>('[data-drop-zone="top"]')!;
    expect(zone.style.pointerEvents).toBe("none");

    fireEvent.click(box);
    expect(onSelect).toHaveBeenCalledWith("t1");
  });
});

describe("ContentItemOverlay", () => {
  it("renders at mapped coordinates with no styling beyond positioning", () => {
    const { container } = render(
      <ContentItemOverlay targetId="t1" child={child("c1", 0, 80, 20)} index={0} />,
    );
    const el = container.querySelector<HTMLDivElement>("[data-content-id]")!;
    expect(el.style.position).toBe("absolute");
    expect(el.style.top).toBe("80px");
    expect(el.style.left).toBe("40px");
    expect(el.className).toBe("");
  });

  it("fires onSelect(targetId, contentId) on click", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ContentItemOverlay
        targetId="t1"
        child={child("c7", 2, 80, 20)}
        index={2}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(container.querySelector("[data-content-id]")!);
    expect(onSelect).toHaveBeenCalledWith("t1", "c7");
  });

  it("populates dataTransfer for a move on drag start", () => {
    const { container } = render(
      <ContentItemOverlay targetId="t2" child={child("c5", 4, 80, 20)} index={4} />,
    );
    const dataTransfer = makeDataTransfer();
    fireEvent.dragStart(container.querySelector("[data-content-id]")!, {
      dataTransfer,
    });
    expect(dataTransfer.store).toEqual({
      [DATA_TRANSFER_KEYS.isMove]: "true",
      [DATA_TRANSFER_KEYS.sourceTarget]: "t2",
      [DATA_TRANSFER_KEYS.contentId]: "c5",
      [DATA_TRANSFER_KEYS.sourceIndex]: "4",
    });
  });

  it("applies consumer className/style without adding its own visual classes", () => {
    const { container } = render(
      <ContentItemOverlay
        targetId="t1"
        child={child("c1", 0, 80, 20)}
        index={0}
        className="demo-item"
        style={{ outline: "1px solid red" }}
      />,
    );
    const el = container.querySelector<HTMLDivElement>("[data-content-id]")!;
    expect(el.className).toBe("demo-item");
    expect(el.style.outline).toBe("1px solid red");
    // Positioning still present.
    expect(el.style.position).toBe("absolute");
  });
});
