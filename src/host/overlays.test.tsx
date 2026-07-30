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
    // No empty drop-zone placeholder in the populated branch.
    expect(box.children).toHaveLength(2);
  });

  it("renders no children and an empty box in the empty branch", () => {
    const empty: MappedTarget = { ...TARGET, children: [] };
    const { container } = render(<TargetAreaOverlay target={empty} />);
    const box = container.querySelector<HTMLDivElement>('[data-target-id="t1"]')!;
    expect(container.querySelectorAll("[data-content-id]")).toHaveLength(0);
    expect(box.children).toHaveLength(0);
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
