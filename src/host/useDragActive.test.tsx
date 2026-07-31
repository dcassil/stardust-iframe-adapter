// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  render,
} from "@testing-library/react";

// No global auto-cleanup is configured (vitest globals:false), so unmount all
// renders between tests. This also lets the shared document-listener install in
// useDragActive settle back to "uninstalled" so ref-counting can be asserted.
afterEach(() => {
  cleanup();
});
import type { MappedChild, MappedTarget } from "./useStardustHost.js";
import { DATA_TRANSFER_KEYS } from "./operations.js";
import { TargetAreaOverlay } from "./overlays.js";
import { useDragActive } from "./useDragActive.js";

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

/** Fire a native document-level `dragstart` (as a palette source would). */
function dispatchDocDragStart(): void {
  act(() => {
    document.dispatchEvent(
      new Event("dragstart", { bubbles: true, cancelable: true }),
    );
  });
}

function dispatchDocDragEnd(): void {
  act(() => {
    document.dispatchEvent(
      new Event("dragend", { bubbles: true, cancelable: true }),
    );
  });
}

describe("useDragActive — document-level native-drag detector", () => {
  it("a document dragstart flips the overlay drop area/zones interactive and items non-interactive", () => {
    const { container } = render(<TargetAreaOverlay target={TARGET} />);
    const box = container.querySelector<HTMLDivElement>('[data-target-id="t1"]')!;
    const area = container.querySelector<HTMLDivElement>("[data-drop-area]")!;
    const zone = container.querySelector<HTMLDivElement>(
      '[data-drop-zone="top"]',
    )!;
    const item = container.querySelector<HTMLDivElement>("[data-content-id]")!;

    // Idle: drop layer non-interactive, container non-interactive, item clickable.
    expect(box.style.pointerEvents).toBe("none");
    expect(area.style.pointerEvents).toBe("none");
    expect(zone.style.pointerEvents).toBe("none");
    expect(item.style.pointerEvents).toBe("");

    dispatchDocDragStart();

    // Active: the deadlock is broken — the drop layer captures events.
    expect(box.style.pointerEvents).toBe("auto");
    expect(area.style.pointerEvents).toBe("auto");
    expect(zone.style.pointerEvents).toBe("auto");
    // Items step aside so the zones beneath receive the drag.
    expect(item.style.pointerEvents).toBe("none");

    dispatchDocDragEnd();

    // Back to idle.
    expect(box.style.pointerEvents).toBe("none");
    expect(zone.style.pointerEvents).toBe("none");
    expect(item.style.pointerEvents).toBe("");
  });

  it("during an active drag, dragover on a zone marks it active and drop fires onInsert; dragend returns to idle where onSelect still fires", () => {
    const onInsert = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <TargetAreaOverlay
        target={TARGET}
        onInsert={onInsert}
        onSelect={onSelect}
      />,
    );
    const box = container.querySelector<HTMLDivElement>('[data-target-id="t1"]')!;

    dispatchDocDragStart();

    const bottomOfSecond = container.querySelectorAll(
      '[data-drop-zone="bottom"]',
    )[1]!;
    const dataTransfer = makeDataTransfer({ [DATA_TRANSFER_KEYS.type]: "text" });

    fireEvent.dragOver(bottomOfSecond, { dataTransfer });
    const active = container.querySelectorAll("[data-drop-active]");
    expect(active).toHaveLength(1);
    expect(active[0]!.getAttribute("data-drop-index")).toBe("2");

    const drop = createEvent.drop(bottomOfSecond, {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(drop, "dataTransfer", { value: dataTransfer });
    fireEvent(bottomOfSecond, drop);
    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onInsert).toHaveBeenCalledWith("t1", 2, { type: "text" });

    // The native `drop` also deactivates the global flag.
    expect(box.style.pointerEvents).toBe("none");

    // Idle: selection click on the box still works.
    fireEvent.click(box);
    expect(onSelect).toHaveBeenCalledWith("t1");
  });

  it("consumer dragActive prop overrides the auto-detector", () => {
    const { container, rerender } = render(
      <TargetAreaOverlay target={TARGET} dragActive={true} />,
    );
    const area = container.querySelector<HTMLDivElement>("[data-drop-area]")!;
    // Forced active even without any dragstart.
    expect(area.style.pointerEvents).toBe("auto");

    rerender(<TargetAreaOverlay target={TARGET} dragActive={false} />);
    // Forced idle even if a drag is happening.
    dispatchDocDragStart();
    expect(area.style.pointerEvents).toBe("none");
    dispatchDocDragEnd();
  });

  it("ref-counts a single document listener across overlays and cleans up on unmount", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const countDrag = (fn: typeof addSpy) =>
      fn.mock.calls.filter((c) => c[0] === "dragstart").length;

    const first = render(<TargetAreaOverlay target={TARGET} />);
    const addsAfterFirst = countDrag(addSpy);
    expect(addsAfterFirst).toBe(1); // one shared install

    const second = render(<TargetAreaOverlay target={TARGET} />);
    // No additional dragstart listener installed for the second overlay.
    expect(countDrag(addSpy)).toBe(1);

    // Both overlays react to the same shared flag.
    dispatchDocDragStart();
    expect(
      first.container.querySelector<HTMLDivElement>("[data-drop-area]")!.style
        .pointerEvents,
    ).toBe("auto");
    expect(
      second.container.querySelector<HTMLDivElement>("[data-drop-area]")!.style
        .pointerEvents,
    ).toBe("auto");
    dispatchDocDragEnd();

    // Unmounting one keeps the listener; unmounting the last removes it.
    first.unmount();
    expect(countDrag(removeSpy)).toBe(0);
    second.unmount();
    expect(countDrag(removeSpy)).toBe(1);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("exports useDragActive returning a boolean", () => {
    let observed: boolean | null = null;
    function Probe() {
      observed = useDragActive();
      return null;
    }
    render(<Probe />);
    expect(typeof observed).toBe("boolean");
  });
});
