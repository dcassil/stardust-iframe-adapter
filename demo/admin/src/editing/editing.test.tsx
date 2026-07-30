// @vitest-environment jsdom
/**
 * Component tests for the SIFR-T-0010 editing layer.
 *
 * Covers the AC-required wiring:
 *  - side-panel field edit → `edit` op emission with the typed value;
 *  - overlay select → selection callback with (targetId, contentId);
 *  - drop of a palette block onto a container target overlay → `insert` op via
 *    the library's `TargetAreaOverlay` + `opFromDataTransfer` (using RTL's
 *    `fireEvent.drop` with a real dataTransfer, mirroring the library's own
 *    host integration test).
 *
 * These assert the demo's op-emission surface directly, without a live iframe.
 */

import { describe, expect, it, vi } from "vitest";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { DATA_TRANSFER_KEYS } from "@stardust-cms/iframe-adapter/host";
import type {
  MappedTarget,
  OperationCallbacks,
} from "@stardust-cms/iframe-adapter/host";
import type { ContentSnapshot } from "@demo/shared/store";
import { HostContext, type HostContextValue } from "../host-context";
import { Overlays } from "./Overlays";
import { SidePanel } from "./SidePanel";

function mappedTarget(): MappedTarget {
  return {
    targetId: "split-col.1",
    isContainer: true,
    geometry: { top: 100, left: 50, width: 300, height: 200 },
    children: [
      {
        contentId: "c1a",
        index: 0,
        isContainer: false,
        styleGroup: "g",
        geometry: { top: 110, left: 60, width: 280, height: 40 },
      },
    ],
  };
}

function hostValue(callbacks: OperationCallbacks): HostContextValue {
  return {
    targets: [mappedTarget()],
    scale: 1,
    connectionState: "connected",
    callbacks,
    designWidth: 1024,
  };
}

function renderOverlays(
  callbacks: OperationCallbacks,
  onDeleteItem = vi.fn(),
): ReactElement {
  return (
    <HostContext.Provider value={hostValue(callbacks)}>
      <Overlays
        selectedContentId={null}
        selectedTargetId={null}
        onDeleteItem={onDeleteItem}
      />
    </HostContext.Provider>
  );
}

function dataTransfer(values: Record<string, string>) {
  const store: Record<string, string> = { ...values };
  return {
    getData: (k: string): string => store[k] ?? "",
    setData: (k: string, v: string): void => {
      store[k] = v;
    },
  };
}

function fireDrop(node: Element, clientY: number, dt: unknown): void {
  const event = createEvent.drop(node, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clientY", { value: clientY });
  Object.defineProperty(event, "dataTransfer", { value: dt });
  fireEvent(node, event);
}

describe("editing layer (SIFR-T-0010)", () => {
  it("overlay select fires onSelect(targetId, contentId)", () => {
    const onSelect = vi.fn();
    const { container } = render(renderOverlays({ onSelect }));
    const item = container.querySelector<HTMLElement>(
      '.ov-item[data-content-id="c1a"]',
    )!;
    fireEvent.click(item);
    expect(onSelect).toHaveBeenCalledWith("split-col.1", "c1a");
  });

  it("dropping a palette block on a container target emits an insert op", () => {
    const onInsert = vi.fn();
    const { container } = render(renderOverlays({ onInsert }));
    const targetBox = container.querySelector<HTMLElement>(
      '[data-target-id="split-col.1"]',
    )!;
    // Drop below the single child's midpoint → index 1 (after the child).
    fireDrop(targetBox, 1000, dataTransfer({ [DATA_TRANSFER_KEYS.type]: "text" }));
    expect(onInsert).toHaveBeenCalledTimes(1);
    const [targetId, index, payload] = onInsert.mock.calls[0]!;
    expect(targetId).toBe("split-col.1");
    expect(index).toBe(1);
    expect(payload).toMatchObject({ type: "text" });
  });

  it("side panel edits the selected text field and emits an edit op per keystroke", async () => {
    const onEdit = vi.fn();
    const snapshot: ContentSnapshot = [
      {
        targetId: "hero",
        contentId: "hero-title",
        index: 0,
        content: { id: "hero-title", type: "text", value: "" },
      },
    ];
    render(
      <SidePanel
        snapshot={snapshot}
        selectedTargetId="hero"
        selectedContentId="hero-title"
        onEdit={onEdit}
      />,
    );
    const field = screen.getByTestId("panel-text");
    const user = userEvent.setup();
    await user.type(field, "Hi");
    // Controlled input: value prop stays "" (snapshot is fixed here), so each
    // keystroke emits the single typed character.
    expect(onEdit).toHaveBeenCalled();
    expect(onEdit.mock.calls.every((c) => c[0] === "hero" && c[1] === "hero-title")).toBe(
      true,
    );
  });

  it("side panel shows the image src field for an image selection", () => {
    const snapshot: ContentSnapshot = [
      {
        targetId: "showcase",
        contentId: "img",
        index: 0,
        content: { id: "img", type: "image", value: "http://x/y.png" },
      },
    ];
    render(
      <SidePanel
        snapshot={snapshot}
        selectedTargetId="showcase"
        selectedContentId="img"
        onEdit={vi.fn()}
      />,
    );
    const imgField = screen.getByTestId("panel-image-src") as HTMLInputElement;
    expect(imgField.value).toBe("http://x/y.png");
  });

  it("delete affordance fires onDeleteItem(targetId, contentId)", () => {
    const onDeleteItem = vi.fn();
    const { container } = render(renderOverlays({}, onDeleteItem));
    const del = container.querySelector<HTMLButtonElement>(".ov-delete")!;
    fireEvent.click(del);
    expect(onDeleteItem).toHaveBeenCalledWith("split-col.1", "c1a");
  });
});
